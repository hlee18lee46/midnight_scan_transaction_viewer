// src/lib/indexer.ts
export type Tx = {
  hash: string;
  applyStage: string;
  identifiers: string[];
  block: { height: number; timestamp: string; hash: string; author: string };
};

const endpoint = import.meta.env.VITE_MIDNIGHT_INDEXER as string;

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data as T;
}

export async function fetchRecent(limit = 20): Promise<Tx[]> {
  const q = `
    query RecentTxs($limit: Int!) {
      transactions(limit: $limit) {
        hash
        applyStage
        identifiers
        block { height timestamp hash author }
      }
    }`;
  const data = await gql<{ transactions: Tx[] }>(q, { limit });
  return data.transactions ?? [];
}

export async function fetchByIdentifier(identifier: string): Promise<Tx[]> {
  const q = `
    query TxsByIdentifier($off: TransactionOffset!) {
      transactions(offset: $off) {
        hash
        applyStage
        identifiers
        block { height timestamp hash author }
      }
    }`;
  const data = await gql<{ transactions: Tx[] }>(q, { off: { identifier } });
  return data.transactions ?? [];
}
