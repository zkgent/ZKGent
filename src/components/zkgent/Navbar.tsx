import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const links = [
  { label: "Vision", href: "#vision", external: false, internal: false },
  { label: "Use Cases", href: "#use-cases", external: false, internal: false },
  { label: "Architecture", href: "#architecture", external: false, internal: false },
  { label: "Docs", href: "/docs", external: false, internal: true },
  { label: "Trust", href: "/trust-model", external: false, internal: true },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <nav
        className={`flex w-full max-w-6xl items-center justify-between rounded-full px-5 py-2.5 transition-all duration-500 ${
          scrolled
            ? "glass shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]"
            : "border border-transparent bg-transparent"
        }`}
      >
        <a href="#top" className="group flex items-center gap-2.5">
          <img src="/logo.png" alt="ZKGent" className="h-8 w-8 rounded-md" />
          <span className="font-mono text-[13px] font-medium tracking-[0.2em] text-foreground">
            ZKGENT
          </span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              {l.internal ? (
                <Link
                  to={l.href}
                  className="group relative inline-block rounded-full px-3.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                  <span className="pointer-events-none absolute inset-x-3.5 -bottom-0.5 h-px scale-x-0 bg-gradient-to-r from-transparent via-emerald to-transparent opacity-0 transition-all duration-300 group-hover:scale-x-100 group-hover:opacity-100" />
                </Link>
              ) : (
                <a
                  href={l.href}
                  className="group relative inline-block rounded-full px-3.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                  <span className="pointer-events-none absolute inset-x-3.5 -bottom-0.5 h-px scale-x-0 bg-gradient-to-r from-transparent via-emerald to-transparent opacity-0 transition-all duration-300 group-hover:scale-x-100 group-hover:opacity-100" />
                </a>
              )}
            </li>
          ))}
        </ul>

        <Link
          to="/apply"
          className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-hairline bg-surface-elevated px-4 py-1.5 text-[13px] font-medium text-foreground transition-all hover:border-emerald/40"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <span className="relative">Apply</span>
          <span className="relative text-emerald transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </nav>
    </motion.header>
  );
}
