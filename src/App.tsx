import { useState } from "react";
import Navbar from "./components/Navbar";
import IdentifierDeepView from "./components/IdentifierDeepView";
import RecentView from "./components/RecentView";

type Mode = "identifier" | "recent";

export default function App() {
  const [mode, setMode] = useState<Mode>("identifier");
  const [query, setQuery] = useState("");

  return (
    <>
      <Navbar />
      {/* pt-20 pushes content below the fixed navbar */}
      <main className="min-h-screen bg-gray-50 pt-20">
        <div className="mx-auto max-w-6xl px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {mode === "identifier" ? "Search by Identifier" : "Recent Transactions"}
            </h1>
            <p className="text-sm text-gray-500">
              {mode === "identifier"
                ? "Paste a Midnight identifier to view matching transactions."
                : "Latest blocks (via tip traversal) with a preview of included transactions."}
            </p>
          </div>

          {/* Mode toggle (segmented control) */}
          <div className="mb-6">
            <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
              <button
                onClick={() => setMode("identifier")}
                className={
                  "px-3 py-1.5 rounded-lg text-sm transition " +
                  (mode === "identifier"
                    ? "bg-black text-white shadow"
                    : "text-gray-700 hover:bg-gray-100")
                }
              >
                Search by Identifier
              </button>
              <button
                onClick={() => setMode("recent")}
                className={
                  "px-3 py-1.5 rounded-lg text-sm transition " +
                  (mode === "recent"
                    ? "bg-black text-white shadow"
                    : "text-gray-700 hover:bg-gray-100")
                }
              >
                Recent
              </button>
            </div>
          </div>

          {/* Content */}
          {mode === "identifier" ? (
            <>
              <div className="mb-6 flex items-center gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value.trim())}
                  placeholder="Enter Identifier (e.g., 00000000...)"
                  className="w-[640px] max-w-full rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-4 focus:ring-gray-200"
                />
                <button
                  onClick={() => {/* no-op; typing updates live */}}
                  className="rounded-xl bg-black px-4 py-2 text-white shadow hover:opacity-90"
                >
                  Search
                </button>
              </div>

              {query ? (
                <IdentifierDeepView initialId={query} /* followRelated={false} */ />
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
                  Enter an identifier to begin.
                </div>
              )}
            </>
          ) : (
            <RecentView />
          )}
        </div>
      </main>
    </>
  );
}
