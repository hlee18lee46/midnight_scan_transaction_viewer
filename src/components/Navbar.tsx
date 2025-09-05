export default function Navbar() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 bg-black/95 text-white border-b border-white/10 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 md:h-16 items-center justify-between">
          {/* Left: logo + title */}
          <div className="flex items-center gap-3">
            <img
              src="/midnight.jpg"
              alt="Midnight"
              className="h-8 w-8 rounded object-cover ring-1 ring-white/20"
            />
            <div className="leading-tight">
              <div className="font-semibold tracking-wide">
                Midnight Transactions Viewer
              </div>
              <div className="text-xs text-white/60 hidden sm:block">
                Testnet Indexer
              </div>
            </div>
          </div>

          {/* Right: placeholder actions (optional) */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Add links/actions here if you want */}
          </div>
        </div>
      </div>

      {/* subtle glow divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </nav>
  );
}
