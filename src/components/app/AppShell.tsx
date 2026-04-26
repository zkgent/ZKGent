import { ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useApplication } from "@/context/ApplicationContext";

const navItems = [
  {
    href: "/apply",
    label: "Apply",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    href: "/submitted",
    label: "Status",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="8" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="6" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="2" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="2" y="12" width="12" height="2" rx="1" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
];

function ObsidianLogo() {
  return (
    <div className="relative h-5 w-5 shrink-0">
      <div className="absolute inset-0 rotate-45 rounded-[3px] bg-gradient-to-br from-emerald via-cyan to-violet opacity-90" />
      <div className="absolute inset-[2.5px] rotate-45 rounded-[2px] bg-background" />
      <div className="absolute inset-[5px] rotate-45 rounded-[1px] bg-gradient-to-br from-emerald/80 to-cyan/40" />
    </div>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const { isSubmitted } = useApplication();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-hairline">
        <ObsidianLogo />
        <span className="font-mono text-[12px] font-medium tracking-[0.2em] text-foreground">
          OBSIDIAN
        </span>
        <span className="ml-auto font-mono text-[9px] tracking-widest text-emerald uppercase px-1.5 py-0.5 rounded bg-emerald/10 border border-emerald/20">
          Access
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = currentPath === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-emerald/10 text-emerald border border-emerald/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface"
              }`}
            >
              <span className={isActive ? "text-emerald" : "text-muted-foreground group-hover:text-foreground"}>
                {item.icon}
              </span>
              {item.label}
              {item.href === "/submitted" && isSubmitted && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-5 pt-3 border-t border-hairline">
        <Link
          to="/"
          className="flex items-center gap-2 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7 2L3 6l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Back to landing page
        </Link>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-hairline bg-surface/40">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -224 }}
              animate={{ x: 0 }}
              exit={{ x: -224 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-56 border-r border-hairline bg-surface lg:hidden"
            >
              <Sidebar onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-hairline px-5">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <ObsidianLogo />
            <span className="font-mono text-[12px] font-medium tracking-[0.2em] text-foreground">OBSIDIAN</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              Access Program
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
