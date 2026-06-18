export default function ImportFallbackPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ maxWidth: 480 }}>
        <p style={{ fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", opacity: 0.6 }}>FlipSide</p>
        <h1 style={{ fontSize: 28, lineHeight: 1.1, marginBottom: 12 }}>Open FlipSide to finish.</h1>
        <p style={{ fontSize: 16, lineHeight: 1.5, opacity: 0.75 }}>
          This link is meant to open the FlipSide app. If it does not open automatically, open FlipSide manually and continue from the saved source.
        </p>
      </section>
    </main>
  );
}
