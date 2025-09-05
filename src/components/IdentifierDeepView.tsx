import { useEffect, useState } from "react";

/** ================================
 *  GraphQL query (updated with ContractAction fields)
 *  ================================ */
const GQL = "https://indexer.testnet-02.midnight.network/api/v1/graphql";
const Q = `
query($off: TransactionOffset!){
  transactions(offset: $off){
    hash
    protocolVersion
    applyStage
    identifiers
    raw
    merkleTreeRoot
    block{
      height
      timestamp
      hash
      author
      protocolVersion
      parent { hash height }
      transactions { hash }
    }
    contractActions{
      __typename
      address
      state
      chainState
      transaction { hash }   # avoid recursion: only need the ref
    }
  }
}
`;

/** ================================
 *  Types (lightweight)
 *  ================================ */
type Hex = string;

type BlockLite = {
  hash: Hex;
  height: number;
};

type Block = {
  hash: Hex;
  height: number;
  timestamp: number;
  author?: Hex | null;
  protocolVersion?: number | null;
  parent?: BlockLite | null;
  transactions?: { hash: Hex }[];
};

type ContractAction = {
  __typename?: string;
  address: Hex;
  state: Hex;
  chainState: Hex;
  transaction: { hash: Hex };
};

type Tx = {
  hash: Hex;
  protocolVersion?: number | null;
  applyStage: string;
  identifiers: Hex[];
  raw?: Hex | null;
  merkleTreeRoot?: Hex | null;
  block?: Block | null;
  contractActions?: ContractAction[];
};

/** ================================
 *  Data helpers
 *  ================================ */
async function qByIdentifier(identifier: string): Promise<Tx[]> {
  const r = await fetch(GQL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: Q, variables: { off: { identifier } } }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return (j.data?.transactions ?? []) as Tx[];
}

function dedupeByHash<T extends { hash: string }>(rows: T[]) {
  const seen = new Set<string>();
  return rows.filter((t) => (seen.has(t.hash) ? false : (seen.add(t.hash), true)));
}

/** ================================
 *  UI helpers
 *  ================================ */
function fmtLocal(ms: number) {
  return new Date(ms).toLocaleString();
}
function fmtUTC(ms: number) {
  return new Date(ms).toISOString().replace("T", " ").replace("Z", " UTC");
}
function age(ms: number) {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}h ${m}m ${r}s ago` : m ? `${m}m ${r}s ago` : `${r}s ago`;
}
function download(filename: string, contents: string, mime = "text/plain") {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function Copy({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
      title="Copy"
    >
      Copy
    </button>
  );
}

/** ================================
 *  Component
 *  ================================ */
export default function IdentifierDeepView({ initialId }: { initialId: string }) {
  const [txs, setTxs] = useState<Tx[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr(null);
        setTxs(null);

        // 1) Seed
        const seed = await qByIdentifier(initialId);
        if (!alive) return;

        // 2) Follow all identifiers (including initial)
        const ids = Array.from(new Set(seed.flatMap((t) => t.identifiers ?? []).concat(initialId)));
        const lists = await Promise.all(ids.map((id) => qByIdentifier(id)));
        if (!alive) return;

        // 3) Flatten + dedupe
        const all = dedupeByHash(lists.flat());
        setTxs(all);
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      }
    })();
    return () => { alive = false; };
  }, [initialId]);

  if (err) return <div className="text-red-600">Error: {err}</div>;
  if (txs === null) return <div>Loading…</div>;
  if (!txs.length) return <div>No transactions for that identifier.</div>;

  return (
    <ul className="space-y-4">
      {txs.map((tx) => (
        <li key={tx.hash} className="rounded-xl border p-4 bg-white shadow">
          {/* Tx hash */}
          <div className="font-mono text-sm break-all">
            <span className="font-semibold">Tx Hash:</span> {tx.hash} <Copy text={tx.hash} />
          </div>

          {/* Apply stage & tx protocol */}
          <div className="mt-2 text-sm">
            <span className="font-semibold">Apply Stage:</span> {tx.applyStage}
            {typeof tx.protocolVersion === "number" && (
              <span className="ml-3"><span className="font-semibold">Tx Protocol:</span> {tx.protocolVersion}</span>
            )}
          </div>

          {/* Identifiers */}
          <div className="mt-2 text-sm">
            <span className="font-semibold">Identifiers:</span>
            <ul className="mt-1 list-disc list-inside">
              {(tx.identifiers ?? []).map((id) => (
                <li key={id} className="font-mono text-xs break-all">
                  {id} <Copy text={id} />
                </li>
              ))}
            </ul>
          </div>

          {/* Merkle root */}
          {tx.merkleTreeRoot && (
            <div className="mt-2 text-sm break-all font-mono">
              <span className="font-semibold">Merkle Root:</span> {tx.merkleTreeRoot} <Copy text={tx.merkleTreeRoot} />
            </div>
          )}

          {/* Raw tx */}
          {tx.raw && (
            <div className="mt-2 text-sm">
              <span className="font-semibold">Raw Tx:</span>
              <button
                onClick={() => download(`${tx.hash}.raw.hex`, String(tx.raw))}
                className="ml-2 text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
              >
                Download .hex
              </button>
              <details className="mt-1">
                <summary className="cursor-pointer text-xs underline">peek</summary>
                <pre className="mt-1 p-2 bg-gray-50 rounded max-h-40 overflow-auto text-[11px] break-all">
                  {String(tx.raw)}
                </pre>
              </details>
            </div>
          )}

          {/* Block */}
          <div className="mt-2 text-sm">
            <span className="font-semibold">Block:</span>{" "}
            {tx.block ? (
              <>
                <div className="font-mono text-xs break-all">
                  #{tx.block.height} • {fmtLocal(tx.block.timestamp)}{" "}
                  <span title={fmtUTC(tx.block.timestamp)}>({age(tx.block.timestamp)})</span>
                </div>
                <div className="font-mono text-xs break-all">
                  Block Hash: {tx.block.hash} <Copy text={tx.block.hash} />
                </div>
                {typeof tx.block.protocolVersion === "number" && (
                  <div className="text-xs">Block Protocol: {tx.block.protocolVersion}</div>
                )}
                {tx.block.author && (
                  <div className="text-xs">
                    Author: {tx.block.author} <Copy text={tx.block.author} />
                  </div>
                )}
                {tx.block.parent?.hash && (
                  <div className="font-mono text-xs break-all">
                    Parent: {tx.block.parent.hash}
                    {typeof tx.block.parent.height === "number" && ` (#${tx.block.parent.height})`}
                    <Copy text={tx.block.parent.hash} />
                  </div>
                )}
                {Array.isArray(tx.block.transactions) && tx.block.transactions.length > 0 && (
                  <div className="mt-2 text-sm">
                    <span className="font-semibold">Txs in Block:</span> {tx.block.transactions.length}
                    <ul className="mt-1 space-y-1">
                      {tx.block.transactions.slice(0, 5).map((btx) => (
                        <li key={btx.hash} className="font-mono text-[11px] break-all">
                          {btx.hash} <Copy text={btx.hash} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <i>unknown</i>
            )}
          </div>

          {/* Contract actions */}
          {Array.isArray(tx.contractActions) && tx.contractActions.length > 0 && (
            <div className="mt-2 text-sm">
              <span className="font-semibold">Contract Actions:</span>
              <ul className="mt-1 space-y-2">
                {tx.contractActions.map((a, i) => (
                  <li key={i} className="rounded border p-2 bg-gray-50">
                    <div className="text-xs text-gray-600">{a.__typename ?? "ContractAction"}</div>
                    <div className="mt-1 font-mono text-[11px] break-all">
                      <span className="font-semibold">Address:</span> {a.address} <Copy text={a.address} />
                    </div>
                    <div className="mt-1 font-mono text-[11px] break-all">
                      <span className="font-semibold">State:</span> {a.state} <Copy text={a.state} />
                      <button
                        onClick={() => download(`${tx.hash}.action.${i}.state.hex`, a.state)}
                        className="ml-2 text-[11px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                      >
                        Download
                      </button>
                    </div>
                    <div className="mt-1 font-mono text-[11px] break-all">
                      <span className="font-semibold">Chain State:</span> {a.chainState} <Copy text={a.chainState} />
                      <button
                        onClick={() => download(`${tx.hash}.action.${i}.chainState.hex`, a.chainState)}
                        className="ml-2 text-[11px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                      >
                        Download
                      </button>
                    </div>
                    <div className="mt-1 font-mono text-[11px] break-all">
                      <span className="font-semibold">Tx Ref:</span> {a.transaction?.hash}
                      {a.transaction?.hash && <Copy text={a.transaction.hash} />}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Download entire JSON blob */}
          <div className="mt-3">
            <button
              onClick={() => download(`${tx.hash}.json`, JSON.stringify(tx, null, 2), "application/json")}
              className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
            >
              Download JSON
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
