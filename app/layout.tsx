import type { ReactNode } from "react";
import Link from "next/link";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/reports", label: "Reports" },
  { href: "/forms", label: "Forms" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Inter, Arial, sans-serif", margin: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh" }}>
          <aside style={{ borderRight: "1px solid #e5e7eb", padding: "1rem", background: "#fafafa" }}>
            <h2 style={{ marginTop: 0 }}>Guardian AI</h2>
            <nav style={{ display: "grid", gap: ".5rem" }}>
              {nav.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <div style={{ padding: "1rem 1.25rem" }}>{children}</div>
        </div>
      </body>
    </html>
  );
}
