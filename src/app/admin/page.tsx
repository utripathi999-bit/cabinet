import { isValidAdminKey } from "@/lib/adminAuth";
import { getCachedTopic, getLastError } from "@/lib/storage";
import { todayIST, formatDisplayDate } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;

  if (!isValidAdminKey(key)) {
    return (
      <main>
        <div className="state-screen">
          <div className="state-panel">
            <p className="error-title">Unauthorized</p>
            <p className="error-body">
              This page needs a valid <code>?key=</code> in the URL.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const [today, lastError] = await Promise.all([
    getCachedTopic(todayIST()),
    getLastError(),
  ]);

  return (
    <main className="admin-page">
      <div className="wordmark-block">
        <p className="wordmark">Cabinet</p>
        <p className="tagline">admin</p>
      </div>

      <div className="admin-body">
        <section className="admin-section">
          <p className="sources-label">Today&rsquo;s card</p>
          {today ? (
            <div className="admin-status-row">
              <span className="category-tag">{today.category}</span>
              <p className="description" style={{ margin: "10px 0 4px" }}>
                {today.title}
              </p>
              <p className="admin-meta">
                {formatDisplayDate(today.date)} · Card No. {today.cardNumber} ·
                generated {new Date(today.generatedAt).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="sources-empty">Nothing generated for today yet.</p>
          )}
        </section>

        <hr className="divider" />

        <section className="admin-section">
          <p className="sources-label">Last error</p>
          {lastError ? (
            <div className="admin-error">
              <p className="error-body">{lastError.message}</p>
              <p className="admin-meta">
                {new Date(lastError.at).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="sources-empty">
              None recorded — the last generation attempt succeeded.
            </p>
          )}
        </section>

        <hr className="divider" />

        <form action="/api/admin/refresh" method="POST" className="admin-form">
          <input type="hidden" name="key" value={key} />
          <button type="submit" className="admin-button">
            Regenerate today&rsquo;s card
          </button>
          <p className="admin-meta" style={{ marginTop: 10 }}>
            Calls Gemini and YouTube again right now, overwriting today&rsquo;s
            cached card. Costs one real generation — use it when you actually
            want a new one, not to browse.
          </p>
        </form>
      </div>
    </main>
  );
}
