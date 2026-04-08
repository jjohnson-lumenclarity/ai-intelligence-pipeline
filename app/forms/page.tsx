import Link from "next/link";

export default function FormsHubPage() {
  return (
    <main>
      <h1>Forms</h1>
      <p>Field-friendly digital forms for inspectors and foremen. Save drafts fast, submit with confidence, and keep a clear audit trail.</p>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        <article style={{ border: "1px solid #ddd", borderRadius: 12, padding: "1rem" }}>
          <h2>Daily Field Labor Report</h2>
          <p>Capture labor, materials, notes, photos, and signatures for T&M/service work completed in the field.</p>
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            <Link href="/forms/daily-field-labor/new">New Report</Link>
            <Link href="/forms/daily-field-labor?status=draft">View Drafts</Link>
            <Link href="/forms/daily-field-labor?status=submitted">Submitted Reports</Link>
          </div>
        </article>
      </section>
    </main>
  );
}
