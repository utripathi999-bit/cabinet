import type { Source } from "./types";

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Shown instead of real search results when YOUTUBE_API_KEY isn't set, so
// the source list is still previewable locally before keys are configured.
const DEMO_SOURCES: Source[] = [
  {
    title: "A Closer Look at the Idea",
    channel: "Demo Channel",
    url: "https://www.youtube.com/results?search_query=" + encodeURIComponent("cabinet demo 1"),
  },
  {
    title: "The Longer Explainer",
    channel: "Demo Channel",
    url: "https://www.youtube.com/results?search_query=" + encodeURIComponent("cabinet demo 2"),
  },
  {
    title: "Where the Evidence Comes From",
    channel: "Demo Channel",
    url: "https://www.youtube.com/results?search_query=" + encodeURIComponent("cabinet demo 3"),
  },
];

/**
 * Returns up to `count` real YouTube videos for the query. Never throws —
 * a missing key, bad quota, or network hiccup just means an empty list, so
 * a source-fetching problem never breaks the topic itself.
 */
export async function fetchSources(
  query: string,
  count = 3
): Promise<Source[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn(
      "[cabinet] YOUTUBE_API_KEY is not set — serving demo sources (local dev only)"
    );
    return DEMO_SOURCES.slice(0, count);
  }

  try {
    const url = new URL(YOUTUBE_SEARCH_URL);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", String(count));
    url.searchParams.set("relevanceLanguage", "en");
    url.searchParams.set("safeSearch", "moderate");
    url.searchParams.set("q", query);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.warn(`YouTube API request failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const items: Array<{
      id?: { videoId?: string };
      snippet?: { title?: string; channelTitle?: string };
    }> = data.items ?? [];

    return items
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        title: decodeEntities(item.snippet?.title ?? "Untitled"),
        channel: decodeEntities(item.snippet?.channelTitle ?? ""),
        url: `https://www.youtube.com/watch?v=${item.id!.videoId}`,
      }));
  } catch (err) {
    console.warn("YouTube fetch failed", err);
    return [];
  }
}
