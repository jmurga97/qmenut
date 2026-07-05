export function PublicPageSkeleton() {
  const rowCount = 5;

  return (
    <div className="home-shell">
      <div className="home-column">
        <div className="hs-header">
          <div className="hs-bar hs-bar--topbar" />
          <div className="hs-bar hs-bar--title" />
          <div className="hs-bar hs-bar--subtitle" />
        </div>
        <div className="home-scroll">
          <div className="hs-featured">
            <div className="hs-block hs-block--photo" />
            <div className="hs-bar hs-bar--name" />
            <div className="hs-bar hs-bar--desc" />
          </div>
          <div className="hs-rows">
            {Array.from({ length: rowCount }, (_, index) => (
              <div className="hs-row" key={index}>
                <div className="hs-bar hs-bar--row-name" />
                <div className="hs-bar hs-bar--row-desc" />
              </div>
            ))}
          </div>
        </div>
        <div className="hs-nav" />
      </div>
    </div>
  );
}
