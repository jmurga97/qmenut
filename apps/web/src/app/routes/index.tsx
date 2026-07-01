import { createFileRoute } from "@tanstack/react-router";

function HomePage() {
  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">QMENUT STARTER</p>
        <h1>Hello World</h1>
        <p>Bun monorepo starter with React, Vite, TanStack Router, and a Cloudflare Worker stub.</p>
      </section>
    </main>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
