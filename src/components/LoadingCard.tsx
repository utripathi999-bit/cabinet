export function LoadingCard() {
  return (
    <div className="stack">
      <div className="loading-card" role="status" aria-live="polite">
        <p className="loading-label">Pulling today&rsquo;s card&hellip;</p>
        <div className="loading-dots" style={{ marginTop: 14 }}>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
