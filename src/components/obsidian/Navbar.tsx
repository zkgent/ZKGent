import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const links = [
  { label: "Vision", href: "#vision" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "Architecture", href: "#architecture" },
  { label: "Waitlist", href: "#waitlist" },
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
          <div className="relative h-6 w-6">
            <div className="absolute inset-0 rotate-45 rounded-[4px] bg-gradient-to-br from-emerald via-cyan to-violet opacity-90" />
            <div className="absolute inset-[3px] rotate-45 rounded-[2px] bg-background" />
            <div className="absolute inset-[6px] rotate-45 rounded-[1px] bg-gradient-to-br from-emerald/80 to-cyan/40" />
          </div>
          <span className="font-mono text-[13px] font-medium tracking-[0.2em] text-foreground">
            OBSIDIAN
          </span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="group relative inline-block rounded-full px-3.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
                <span className="pointer-events-none absolute inset-x-3.5 -bottom-0.5 h-px scale-x-0 bg-gradient-to-r from-transparent via-emerald to-transparent opacity-0 transition-all duration-300 group-hover:scale-x-100 group-hover:opacity-100" />
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#waitlist"
          className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-hairline bg-surface-elevated px-4 py-1.5 text-[13px] font-medium text-foreground transition-all hover:border-emerald/40"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <span className="relative">Join Waitlist</span>
          <span className="relative text-emerald transition-transform group-hover:translate-x-0.5">→</span>
        </a>
      </nav>
    </motion.header>
  );
}
