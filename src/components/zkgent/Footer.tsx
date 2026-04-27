export function Footer() {
  return (
    <footer className="relative border-t border-hairline">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="ZKGent" className="h-8 w-8 rounded-md" />
              <span className="font-mono text-[12px] tracking-[0.2em] text-foreground">ZKGENT</span>
            </div>
            <p className="mt-5 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              A zero-knowledge confidential payments protocol on Solana. Private by default. Verifiable by mathematics.
            </p>
          </div>

          <FooterCol
            title="Protocol"
            links={[
              { label: "Vision", href: "#vision" },
              { label: "Architecture", href: "#architecture" },
              { label: "Use Cases", href: "#use-cases" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { label: "Contact", href: "#" },
              { label: "Press", href: "#" },
              { label: "Partners", href: "#" },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { label: "Privacy", href: "#" },
              { label: "Terms", href: "#" },
              { label: "Disclosures", href: "#" },
            ]}
          />
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-hairline pt-8 sm:flex-row sm:items-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
            © {new Date().getFullYear()} ZKGent Labs · All rights reserved
          </p>
          <p className="font-mono text-[11px] tracking-wider text-muted-foreground/60">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
              protocol status: pre-launch
            </span>
          </p>
        </div>
      </div>

      {/* Wordmark */}
      <div className="overflow-hidden border-t border-hairline">
        <div className="mx-auto max-w-[1600px] px-6 py-10">
          <div className="font-display text-[clamp(60px,16vw,260px)] leading-none tracking-tight text-foreground/[0.06] select-none">
            ZKGENT
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              className="group inline-flex items-center gap-1 text-[13px] text-foreground/80 transition-colors hover:text-foreground"
            >
              {l.label}
              <span className="text-muted-foreground/40 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">↗</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
