import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

function ReferralsLayout() {
  return (
    <>
      <header className="ref-topbar">
        <Link className="ming-eyebrow" to="/">
          QMenut Referidos
        </Link>
        <Link to="/mis-referidos">Mis referidos</Link>
      </header>
      <main className="ref-main">
        <div className="ming-page ming-page--narrow">
          <Outlet />
        </div>
      </main>
    </>
  );
}

export const Route = createRootRoute({ component: ReferralsLayout });
