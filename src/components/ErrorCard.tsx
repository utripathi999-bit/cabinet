export function ErrorCard() {
  return (
    <div className="state-screen">
      <div className="state-panel">
        <p className="error-title">The archive missed today&rsquo;s pull</p>
        <p className="error-body">
          Something went wrong generating today&rsquo;s card — most often a
          missing or expired API key. Refresh in a moment, and check the
          server logs if it persists.
        </p>
      </div>
    </div>
  );
}
