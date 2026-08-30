export function LoadingCard() {
  return (
    <div className="state-screen">
      <div className="state-panel" role="status" aria-live="polite">
        <p className="loading-label">Pulling today&rsquo;s card&hellip;</p>
        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
