import { ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";

type DocLink = { label: string; href: string };
type DocSection = { title: string; links: DocLink[] };

const SECTIONS: DocSection[] = [
  {
    title: "Get Started",
    links: [
      { label: "Overview", href: "/docs" },
      { label: "Quickstart", href: "/docs/quickstart" },
    ],
  },
  {
    title: "Concepts",
    links: [
      { label: "Trust Model", href: "/docs/trust" },
      { label: "ZK Protocol", href: "/docs/protocol" },
    ],
  },
  {
    title: "Console",
    links: [{ label: "Operator Console", href: "/docs/console" }],
  },
  {
    title: "Reference",
    links: [
      { label: "API Reference", href: "/docs/api" },
      { label: "FAQ", href: "/docs/faq" },
    ],
  },
];

export function DocsLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline bg-background/80 px-4 backdrop-blur-md sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="ZKGent" className="h-7 w-7 rounded-md" />
          <span className="font-mono text-[12px] font-medium tracking-[0.2em] text-foreground">
            ZKGENT
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
            / docs
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <Link
            to="/trust-model"
            className="hidden font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition sm:inline"
          >
            Trust model
          </Link>
          <Link
            to="/apply"
            className="rounded-full border border-hairline bg-surface-elevated px-3 py-1.5 text-[12px] font-medium text-foreground hover:border-emerald/40 transition"
          >
            Apply →
          </Link>
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground transition"
            aria-label="Open menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-60 shrink-0 border-r border-hairline lg:block">
          <Sidebar currentPath={currentPath} />
        </aside>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
              />
              <motion.aside
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ type: "spring", damping: 30, stiffness: 280 }}
                className="fixed left-0 top-0 z-50 h-screen w-60 border-r border-hairline bg-background lg:hidden"
              >
                <div className="flex h-14 items-center justify-between border-b border-hairline px-4">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    Docs
                  </span>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Close menu"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <Sidebar currentPath={currentPath} onNavigate={() => setMobileOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="min-w-0 flex-1 px-6 py-12 lg:px-12 lg:py-16">
          <article className="mx-auto max-w-3xl">
            <header className="mb-10 border-b border-hairline pb-8">
              <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
                {title}
              </h1>
              {description && (
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  {description}
                </p>
              )}
            </header>
            <div className="docs-content space-y-6 text-[14px] leading-relaxed text-foreground/90">
              {children}
            </div>
            <DocsFooter currentPath={currentPath} />
          </article>
        </main>
      </div>
    </div>
  );
}

function normalizePath(p: string): string {
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

function Sidebar({ currentPath, onNavigate }: { currentPath: string; onNavigate?: () => void }) {
  const cur = normalizePath(currentPath);
  return (
    <nav className="sticky top-14 space-y-6 px-4 py-6">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
            {section.title}
          </p>
          <ul className="mt-2 space-y-0.5">
            {section.links.map((link) => {
              const active = cur === normalizePath(link.href);
              return (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    onClick={onNavigate}
                    className={`block rounded-lg px-2 py-1.5 text-[13px] transition ${
                      active
                        ? "bg-surface text-foreground"
                        : "text-muted-foreground hover:bg-surface/50 hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="border-t border-hairline pt-5">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-2 text-[12px] text-muted-foreground hover:text-foreground transition"
        >
          ← Back to site
        </Link>
      </div>
    </nav>
  );
}

function DocsFooter({ currentPath }: { currentPath: string }) {
  const flat: DocLink[] = SECTIONS.flatMap((s) => s.links);
  const cur = normalizePath(currentPath);
  const idx = flat.findIndex((l) => normalizePath(l.href) === cur);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;

  return (
    <nav className="mt-16 grid grid-cols-2 gap-4 border-t border-hairline pt-8">
      <div>
        {prev && (
          <Link
            to={prev.href}
            className="group block rounded-xl border border-hairline bg-surface/50 p-4 transition hover:border-emerald/40 hover:bg-surface"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              ← Previous
            </p>
            <p className="mt-1 text-[14px] font-medium text-foreground">{prev.label}</p>
          </Link>
        )}
      </div>
      <div>
        {next && (
          <Link
            to={next.href}
            className="group block rounded-xl border border-hairline bg-surface/50 p-4 text-right transition hover:border-emerald/40 hover:bg-surface"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Next →
            </p>
            <p className="mt-1 text-[14px] font-medium text-foreground">{next.label}</p>
          </Link>
        )}
      </div>
    </nav>
  );
}

// ---------- Reusable doc primitives ----------

export function H2({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mt-12 font-display text-2xl font-semibold text-foreground first:mt-0">
      {children}
    </h2>
  );
}

export function H3({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h3 id={id} className="mt-8 font-display text-lg font-semibold text-foreground">
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-[14px] leading-relaxed text-foreground/85">{children}</p>;
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12.5px] text-foreground">
      {children}
    </code>
  );
}

export function Pre({ children, lang }: { children: ReactNode; lang?: string }) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-hairline bg-surface/60">
      {lang && (
        <div className="flex items-center justify-between border-b border-hairline px-4 py-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {lang}
          </span>
        </div>
      )}
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed text-foreground/90">
        {children}
      </pre>
    </div>
  );
}

export function Callout({
  variant = "info",
  title,
  children,
}: {
  variant?: "info" | "warn" | "ok";
  title?: string;
  children: ReactNode;
}) {
  const styles =
    variant === "warn"
      ? "border-yellow-500/30 bg-yellow-500/[0.05]"
      : variant === "ok"
        ? "border-emerald/30 bg-emerald/[0.05]"
        : "border-cyan/25 bg-cyan/[0.05]";
  const dot = variant === "warn" ? "bg-yellow-400" : variant === "ok" ? "bg-emerald" : "bg-cyan";

  return (
    <div className={`my-4 rounded-xl border p-4 ${styles}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
        <div className="flex-1">
          {title && <p className="mb-1 text-[13px] font-semibold text-foreground">{title}</p>}
          <div className="text-[13px] leading-relaxed text-foreground/85">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="my-3 space-y-2 pl-4">{children}</ul>;
}

export function Li({ children }: { children: ReactNode }) {
  return (
    <li className="relative pl-3 text-[14px] leading-relaxed text-foreground/85 marker:text-emerald before:absolute before:left-0 before:top-[0.65em] before:h-1 before:w-1 before:rounded-full before:bg-muted-foreground/50">
      {children}
    </li>
  );
}
