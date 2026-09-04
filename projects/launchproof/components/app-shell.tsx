"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/icons";

const navigation: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/", label: "Releases", icon: "activity" },
  { href: "/architecture/", label: "Architecture", icon: "architecture" },
  { href: "/process/", label: "Delivery", icon: "git-branch" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <Link className="brand" href="/" aria-label="LaunchProof home">
          <span className="brand-mark">LP</span>
          <span>
            <strong>LaunchProof</strong>
            <small>Evidence before release</small>
          </span>
        </Link>

        <nav className="side-nav">
          {navigation.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href.replace(/\/$/, ""));
            return (
              <Link className={isActive ? "nav-item active" : "nav-item"} href={item.href} key={item.href}>
                <Icon name={item.icon} size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-proof">
          <span className="eyebrow inverse">CONTROL STANDARD</span>
          <strong>Policy v3.2</strong>
          <p>Every verdict links back to evidence, thresholds, and an accountable owner.</p>
        </div>

        <div className="sidebar-foot">
          <span className="live-dot" />
          Interactive demo
          <code>v0.1.0</code>
        </div>
      </aside>

      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-context">
            <span className="mono">LAUNCHPROOF / CONTROL PLANE</span>
            <span className="environment-badge">public demo</span>
          </div>
          <div className="topbar-right">
            <span className="demo-label"><span className="live-dot" /> Demo data</span>
            <a className="github-link" href="https://github.com/Trenn1x/specforge-analyst-studio/tree/main/projects/launchproof" rel="noreferrer" target="_blank">
              <Icon name="code" size={16} />
              Repository
              <Icon name="arrow-up-right" size={14} />
            </a>
            <span className="avatar" title="Thomas Verdier">TV</span>
          </div>
        </header>

        <main className="main-content">{children}</main>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navigation.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href.replace(/\/$/, ""));
            return (
              <Link className={isActive ? "mobile-nav-item active" : "mobile-nav-item"} href={item.href} key={item.href}>
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
