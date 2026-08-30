import type { GeneratedImage } from "./types";

// Free, no-signup image generation — https://github.com/pollinations/pollinations/blob/master/APIDOCS.md
// Anonymous use is rate-limited to 1 request/15s, far more than this
// site's ~1 image/day needs, so POLLINATIONS_API_KEY is entirely optional
// — it only unlocks watermark removal (nologo) via a registered account.
const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

/**
 * Generates a colorful, cartoonish illustration for a topic. Best-effort:
 * callers should treat a null return as "no image today" rather than
 * failing the whole card — this is a nice-to-have on top of the text.
 */
export async function generateTopicImage(
  title: string,
  category: string
): Promise<GeneratedImage | null> {
  const prompt = `Colorful playful cartoon-style flat editorial illustration representing the topic "${title}" (${category}). Bold vibrant shapes and colors, whimsical modern magazine spot-illustration style. No text, no words, no letters, no numbers, no logos anywhere in the image — pure illustration only, no photorealism.`;

  const apiKey = process.env.POLLINATIONS_API_KEY;
  const params = new URLSearchParams({
    width: "1200",
    height: "630",
    model: "flux",
    // A fresh image each time a card regenerates, rather than the same
    // cached-by-Pollinations image for repeated prompts. Capped to a
    // signed 32-bit int — Date.now() alone is too large and gets
    // rejected with "Too big: expected number to be <=2147483647".
    seed: String(Date.now() % 2147483647),
  });
  if (apiKey) params.set("nologo", "true");

  const url = `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?${params}`;

  try {
    const response = await fetch(url, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn(`[cabinet] Image generation failed: ${response.status} ${body.slice(0, 600)}`);
      return null;
    }

    const mimeType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return { base64, mimeType };
  } catch (err) {
    console.warn("[cabinet] Image generation threw", err);
    return null;
  }
}
