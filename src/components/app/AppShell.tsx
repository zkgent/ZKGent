import { ReactNode, useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { WalletButton } from "@/components/wallet/WalletButton";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  section?: "main" | "system" | "admin";
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    section: "main",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.35" />
        <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.35" />
        <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.35" />
        <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.35" />
      </svg>
    ),
  },
  {
    href: "/transfers",
    label: "Transfers",
    section: "main",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M1 5h11M9 2l3 3-3 3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 10H3M5 7l-3 3 3 3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/payroll",
    label: "Payroll",
    section: "main",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="3" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.35" />
        <path d="M5 7.5h5M7.5 5.5v4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/treasury",
    label: "Treasury",
    section: "main",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 11L7.5 2l5.5 9H2z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
        <path d="M4.5 11V8.5M10.5 11V8.5M7.5 11V6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/counterparties",
    label: "Counterparties",
    section: "main",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.35" />
        <circle cx="10.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.35" />
        <path d="M1 13c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        <path d="M10.5 9c1.38 0 2.5 1.57 2.5 3.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/activity",
    label: "Activity",
    section: "main",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M1 7.5h2l2-4 2 8 2-6 2 4 1-2h2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/architecture",
    label: "Architecture",
    section: "system",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="5.5" y="1" width="4" height="3" rx="1" stroke="currentColor" strokeWidth="1.35" />
        <rect x="1" y="11" width="4" height="3" rx="1" stroke="currentColor" strokeWidth="1.35" />
        <rect x="10" y="11" width="4" height="3" rx="1" stroke="currentColor" strokeWidth="1.35" />
        <path d="M7.5 4v3M7.5 7H3m0 0v1M7.5 7h4.5m0 0v1" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    section: "system",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.35" />
        <path d="M7.5 1.5v1M7.5 12.5v1M1.5 7.5h1M12.5 7.5h1M3.1 3.1l.7.7M11.2 11.2l.7.7M3.1 11.9l.7-.7M11.2 3.8l.7-.7" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/admin/applications",
    label: "Admin",
    section: "admin",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.35" />
        <rect x="1" y="8" width="4" height="6" rx="1" stroke="currentColor" strokeWidth="1.35" />
        <rect x="8" y="1" width="6" height="10" rx="1" stroke="currentColor" strokeWidth="1.35" />
      </svg>
    ),
  },
];

function ZKGentMark() {
  return (
    <img src="/logo.png" alt="ZKGent" className="h-8 w-8 shrink-0 rounded-md" />
  );
}

function SidebarSection({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div>
      {label && (
        <p className="mb-1 px-3 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/40">{label}</p>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  const main = navItems.filter((i) => i.section === "main");
  const system = navItems.filter((i) => i.section === "system");
  const admin = navItems.filter((i) => i.section === "admin");

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = currentPath === item.href || currentPath.startsWith(item.href + "/");
    return (
      <Link
        to={item.href}
        onClick={onClose}
        className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
          isActive
            ? "bg-emerald/[0.12] text-emerald"
            : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
        }`}
      >
        <span className={`transition-colors ${isActive ? "text-emerald" : "text-muted-foreground/60 group-hover:text-foreground"}`}>
          {item.icon}
        </span>
        {item.label}
        {isActive && <div className="ml-auto h-1 w-1 rounded-full bg-emerald" />}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-hairline">
        <ZKGentMark />
        <div>
          <span className="font-mono text-[11px] font-semibold tracking-[0.22em] text-foreground">ZKGENT</span>
          <p className="font-mono text-[9px] tracking-wider text-muted-foreground/50 leading-none mt-0.5">Confidential Console</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        <SidebarSection>
          {main.map((item) => <NavLink key={item.href} item={item} />)}
        </SidebarSection>
        <SidebarSection label="System">
          {system.map((item) => <NavLink key={item.href} item={item} />)}
        </SidebarSection>
        <SidebarSection label="Internal">
          {admin.map((item) => <NavLink key={item.href} item={item} />)}
        </SidebarSection>
      </nav>

      <div className="px-4 pb-4 pt-3 border-t border-hairline">
        <Link
          to="/"
          className="flex items-center gap-2 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M7 1.5L3 5.5l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Homepage
        </Link>
      </div>
    </div>
  );
}

function useNetworkBadge() {
  const [network, setNetwork] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/zk/system")
      .then(r => r.json())
      .then(d => setNetwork(d?.solana?.network ?? null))
      .catch(() => {});
  }, []);
  return network;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const network = useNetworkBadge();
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const currentItem = navItems.find((i) => currentPath === i.href || currentPath.startsWith(i.href + "/"));

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden lg:flex w-52 shrink-0 flex-col border-r border-hairline bg-surface/30">
        <Sidebar />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -208 }} animate={{ x: 0 }} exit={{ x: -208 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-52 border-r border-hairline bg-surface lg:hidden"
            >
              <Sidebar onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-hairline bg-surface/20 px-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <ZKGentMark />
            <span className="font-mono text-[11px] font-semibold tracking-[0.2em] text-foreground">ZKGENT</span>
          </div>

          {currentItem && (
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-muted-foreground/40">
                {currentItem.icon}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">
                {currentItem.label}
              </span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                Privacy mode active
              </span>
            </div>
            {network && (
              <div className="hidden sm:flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${network === "mainnet-beta" ? "bg-emerald" : "bg-yellow-400/70"}`} />
                <span className={`font-mono text-[10px] uppercase tracking-widest ${network === "mainnet-beta" ? "text-emerald/70" : "text-yellow-400/60"}`}>
                  {network === "mainnet-beta" ? "Mainnet" : network}
                </span>
              </div>
            )}
            <WalletButton compact />
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
