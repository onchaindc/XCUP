import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-white/10 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-white/42">
        <p>X Cup Arena</p>
        <div className="flex items-center gap-3">
          <Link className="transition hover:text-white" href="/docs">
            Docs
          </Link>
          <a className="transition hover:text-white" href="https://x.com/xcuparena" target="_blank" rel="noreferrer">
            X
          </a>
        </div>
      </div>
    </footer>
  );
}
