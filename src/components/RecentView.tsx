// src/components/RecentView.tsx
import { useEffect, useMemo, useState } from "react";

const GQL = "https://indexer.testnet-02.midnight.network/api/v1/graphql";

// --- Utilities ---------------------------------------------------------------
type Hex = string;
type Tx = { hash: Hex; applyStage: string; protocolVersion?: number | null; identifiers: Hex[] };
type BlockResp = {
  hash: Hex; height: number; timestamp: number; author?: Hex | null; protocolVersion?: number | null;
  transactions?: Tx[]; parent?: BlockResp | null;
};

function fmtLocal(ms: number) { return new Date(ms).toLocaleString(); }
function fmtUTC(ms: number) { return new Date(ms).toISOString().replace("T"," ").replace("Z"," UTC"); }
function age(ms: number) { const s=Math.max(0,Math.floor((Date.now()-ms)/1000)); const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),r=s%60; return h?`${h}h ${m}m ${r}s ago`:m?`${m}m ${r}s ago`:`${r}s ago`; }
function Copy({ text }: { text: string }) {
  return <button onClick={()=>navigator.clipboard.writeText(text)} className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200" title="Copy">Copy</button>;
}

// --- Build a nested parent selection of depth D ------------------------------
// We fetch a *tip* Block (latest) and then inline `parent { ... }` D-1 times.
// At each level, also fetch a light `transactions` selection.
function buildBlockSelection(depth: number): string {
  const txSel = `transactions { hash applyStage protocolVersion identifiers }`;
  let sel = `
    hash
    height
    timestamp
    author
    protocolVersion
    ${txSel}
  `.trim();

  for (let i = 1; i < depth; i++) {
    sel += `
      parent {
        hash
        height
        timestamp
        author
        protocolVersion
        ${txSel}
    `;
  }
  // close the opened parents
  sel += "}".repeat(Math.max(0, depth - 1));
  return sel;
}

// Flatten the nested parent chain into an array of blocks (0 = tip)
function flattenBlocks(b: BlockResp | null | undefined): BlockResp[] {
  const out: BlockResp[] = [];
  let cur: BlockResp | null | undefined = b;
  while (cur) {
    out.push(cur);
    cur = cur.parent ?? undefined;
  }
  return out;
}

// --- Introspection: find a tip field that returns Block ----------------------
const TIP_CANDIDATES = ["latestBlock", "bestBlock", "head", "tip"];

async function findTipField(): Promise<string | null> {
  const q = `
    query {
      __schema {
        queryType {
          fields {
            name
            type { kind name ofType { kind name } }
          }
        }
      }
    }
  `;
  const r = await fetch(GQL, { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify({ query: q }) });
  const j = await r.json();
  const fields: any[] = j?.data?.__schema?.queryType?.fields ?? [];
  const isBlockType = (t: any) =>
    (t?.kind === "OBJECT" && t?.name === "Block") ||
    (t?.ofType?.kind === "OBJECT" && t?.ofType?.name === "Block");

  // Prefer our known candidate names first
  for (const name of TIP_CANDIDATES) {
    const f = fields.find((x) => x.name === name && isBlockType(x.type));
    if (f) return name;
  }
  // Otherwise, pick any field returning Block (no args check here; most tips have none)
  const anyBlock = fields.find((x) => isBlockType(x.type));
  return anyBlock?.name ?? null;
}

// --- Component ---------------------------------------------------------------
export default function RecentView() {
  const [depth, setDepth] = useState(10); // number of blocks to traverse
  const [tipField, setTipField] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<BlockResp[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selection = useMemo(() => buildBlockSelection(depth), [depth]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr(null); setBlocks(null); setLoading(true);
        const tip = await findTipField();
        if (!alive) return;
        if (!tip) {
          setErr("This indexer does not expose a tip/latest block field. Recent view isn’t available here.");
          setLoading(false);
          return;
        }
        setTipField(tip);

        // Build a dynamic query using the discovered tip field
        const q = `
          query {
            tipBlock: ${tip} {
              ${selection}
            }
          }
        `;
        const r = await fetch(GQL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        const j = await r.json();
        if (j.errors) throw new Error(JSON.stringify(j.errors));
        const tipBlock = j?.data?.tipBlock as BlockResp | undefined;
        const list = flattenBlocks(tipBlock).slice(0, depth);
        if (!alive) return;
        setBlocks(list);
        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        setErr(
          String(e?.message || e).includes("Cannot query field") || String(e?.message || e).includes("Unknown field")
            ? "This indexer doesn’t expose a compatible tip block field. Recent view isn’t available."
            : String(e?.message || e)
        );
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [selection, depth]);

  return (
    <div>
      <div className="mb-3 text-sm">
        <span className="font-semibold">Blocks to show:</span>{" "}
        <select className="border rounded px-2 py-1" value={depth} onChange={(e) => setDepth(Number(e.target.value))}>
          <option value={1}>1</option>
            <option value={5}>5</option>
          <option value={10}>10</option>
        </select>
        {tipField && <span className="ml-3 text-gray-600">Tip source: <code>{tipField}</code></span>}
      </div>

      {loading && <div>Loading…</div>}
      {err && <div className="text-red-600 mb-3">Error: {err}</div>}
      {!loading && !err && (!blocks || blocks.length === 0) && <div>No recent blocks.</div>}

      {!loading && !err && blocks && blocks.length > 0 && (
        <ul className="space-y-6">
          {blocks.map((b) => (
            <li key={b.hash} className="rounded-xl border p-4 bg-white shadow">
              <div className="font-mono text-sm break-all">
                <span className="font-semibold">Block:</span> #{b.height} • {fmtLocal(b.timestamp)}{" "}
                <span title={fmtUTC(b.timestamp)}>({age(b.timestamp)})</span>
              </div>
              <div className="font-mono text-xs break-all mt-1">
                Block Hash: {b.hash} <Copy text={b.hash} />
              </div>
              {typeof b.protocolVersion === "number" && (
                <div className="text-xs mt-1">Block Protocol: {b.protocolVersion}</div>
              )}
              {b.author && <div className="text-xs">Author: {b.author} <Copy text={b.author} /></div>}

              {Array.isArray(b.transactions) && b.transactions.length > 0 ? (
                <div className="mt-3 text-sm">
                  <span className="font-semibold">Transactions ({b.transactions.length}):</span>
                  <ul className="mt-2 space-y-1">
                    {b.transactions.slice(0, 20).map((tx) => (
                      <li key={tx.hash} className="rounded border p-2 bg-gray-50">
                        <div className="font-mono text-xs break-all">
                          Tx: {tx.hash} <Copy text={tx.hash} />
                        </div>
                        <div className="text-xs mt-1">
                          Stage: {tx.applyStage}
                          {typeof tx.protocolVersion === "number" && <> • Tx Protocol: {tx.protocolVersion}</>}
                        </div>
                        {tx.identifiers?.length > 0 && (
                          <div className="text-[11px] mt-1">
                            Ids: {tx.identifiers.slice(0,3).join(", ")}
                            {tx.identifiers.length > 3 && ` (+${tx.identifiers.length - 3} more)`}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-3 text-sm italic">No transactions in this block.</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
