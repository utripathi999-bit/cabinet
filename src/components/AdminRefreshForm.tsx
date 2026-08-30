"use client";

import { useState } from "react";

export function AdminRefreshForm({ adminKey }: { adminKey: string }) {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    try {
      const res = await fetch("/api/admin/refresh", {
        method: "POST",
        body: new URLSearchParams({ key: adminKey }),
      });
      if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
      // Full reload rather than a client-side transition, so the freshly
      // written Redis state is guaranteed to be what renders — no risk of
      // any router-level cache showing the pre-refresh page.
      window.location.reload();
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <button type="submit" className="admin-button" disabled={status === "working"}>
        {status === "working" ? "Generating…" : "Regenerate today’s card"}
      </button>
      <p className="admin-meta" style={{ marginTop: 10 }}>
        {status === "working" ? (
          "Calling Gemini and YouTube now — this genuinely takes a few seconds to half a minute (a real generation, sometimes a few retries if the duplicate check rejects the first draft), not stuck."
        ) : status === "error" ? (
          "Something went wrong — reload the page and check “Last error” below."
        ) : (
          "Calls Gemini and YouTube again right now, overwriting today’s cached card. Costs one real generation — use it when you actually want a new one, not to browse."
        )}
      </p>
    </form>
  );
}
