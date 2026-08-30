"use client";

import { useState } from "react";

export function ShareButton({ title, url }: { title: string; url?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = url ?? window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch {
        // User cancelled the native share sheet — not an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the
      // link is still visible in the address bar, so this is non-fatal.
    }
  }

  return (
    <button
      type="button"
      className="share-button"
      onClick={handleShare}
      aria-label="Share this topic"
    >
      {copied ? "Copied" : "Share"}
    </button>
  );
}
