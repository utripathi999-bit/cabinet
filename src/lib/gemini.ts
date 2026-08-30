import type { GeneratedTopicDraft } from "./types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Free-tier Gemini models — get a key at https://aistudio.google.com/apikey
// (a separate key from the YouTube Data API one, but no card required).
// Google retires older model IDs for new API keys over time (this project
// hit exactly that: gemini-2.5-flash and text-embedding-004 were both
// retired for new keys after this was first written) — if either of these
// starts failing, the error response names the current replacement model.
const GENERATION_MODEL = "gemini-3.6-flash";
const EMBEDDING_MODEL = "gemini-embedding-001";

const SYSTEM_PROMPT = `You write for "Cabinet," a website that hands its one user a single topic to research each day, pulled from across the whole span of human knowledge: philosophy, history, science, technology, music, art, linguistics, mathematics, obscure historical events, design, biology, economics, anthropology — anything genuinely interesting, not just the popular-science greatest hits.

For each request, invent ONE topic and return ONLY a single JSON object matching exactly this shape:

{
  "title": "string, the topic itself, 3-8 words, specific and evocative (not a generic category)",
  "category": "string, 1-2 words, e.g. Philosophy, Cold War Tech, Linguistics, Music History",
  "description": "string, ONE paragraph, 80-130 words, written for a sharp generalist with no prior background — define any term you use, open with the most interesting or surprising angle, end on why it's worth an hour of someone's time",
  "searchQuery": "string, a short natural-language phrase (4-8 words) someone would type into YouTube to find good videos on this exact topic"
}

Rules:
- Pick something specific and researchable, not a vague umbrella ("The Byzantine Iconoclasm" not "Byzantine History").
- Never repeat or closely rephrase anything in the "avoid" list you're given — including the same topic in different words.
- A shared broad domain is NOT itself a duplicate. Distinct subjects, or genuine subtopics/deep-dives within a domain already touched on, are welcome even when related — e.g. Typography, the Printing Press, Calligraphy, and UI Design are four acceptable topics despite the overlap between them.
- Rotate across domains — don't cluster on the same subject area two days running.
- Write the description in plain, warm, direct prose. No listicle language, no "In this fascinating topic...", no rhetorical questions as a crutch.
- Return raw JSON only.`;

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

// Shown instead of a real generation when GEMINI_API_KEY isn't set, so the
// site is still previewable locally before keys are configured.
const DEMO_DRAFTS: GeneratedTopicDraft[] = [
  {
    title: "The Ship of Theseus",
    category: "Philosophy",
    description:
      "If you replace every plank of a ship, one at a time, until none of the original wood remains, is it still the same ship? The puzzle is over two thousand years old, first written down by Plutarch, but it's not really about ships — it's about what makes anything the same thing over time, including you. Your body replaces nearly all its cells within a decade; the person who made your childhood memories is, materially, gone. Philosophers have proposed different answers: identity lives in continuity of form, or of function, or of an unbroken causal chain linking each version to the last. None fully satisfies. It's worth an hour because the question underlies harder ones we take for granted — corporate identity, national identity, even what a self is.",
    searchQuery: "ship of theseus paradox explained",
  },
  {
    title: "The Antikythera Mechanism",
    category: "Ancient Technology",
    description:
      "In 1901, sponge divers off a Greek island pulled a corroded lump of bronze from a 2,000-year-old shipwreck. It sat in a museum for decades before anyone realized what it was: a hand-cranked mechanical computer, with over thirty precisely cut gears, that predicted eclipses and tracked the position of the sun, moon, and five visible planets — decades before the mathematics it relied on was supposed to exist. Nothing of comparable complexity appears again in the historical record for over a thousand years. We still don't know who built it, how many were made, or why the knowledge vanished so completely. It's worth an hour because it quietly rewrites how far back real engineering sophistication goes — and how much history simply didn't survive.",
    searchQuery: "antikythera mechanism explained",
  },
];

/** A past topic's title + category, given to the model as an "avoid" list. */
export interface AvoidEntry {
  title: string;
  category: string;
}

export async function generateTopicDraft(
  avoidList: AvoidEntry[]
): Promise<GeneratedTopicDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn(
      "[cabinet] GEMINI_API_KEY is not set — serving a demo topic (local dev only)"
    );
    return DEMO_DRAFTS[Math.floor(Math.random() * DEMO_DRAFTS.length)];
  }

  const avoidText =
    avoidList.length > 0
      ? `Avoid these previously used topics (title — category):\n${avoidList
          .map((t) => `- ${t.title} — ${t.category}`)
          .join("\n")}`
      : "No prior topics yet — pick anything.";

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${GENERATION_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [{ text: `Generate today's topic. ${avoidText}` }],
          },
        ],
        generationConfig: {
          temperature: 1,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          // Gemini 3.x models think before answering and can't fully
          // disable it on Flash — "low" keeps that from eating the whole
          // token budget before the JSON answer itself gets written.
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gemini API request failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini API returned no text content");
  }

  const jsonText = stripCodeFence(text);
  let parsed: GeneratedTopicDraft;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Could not parse topic JSON: ${jsonText.slice(0, 200)}`);
  }

  if (!parsed.title || !parsed.description || !parsed.category) {
    throw new Error("Generated topic is missing required fields");
  }

  return parsed;
}

/**
 * Embeds text for semantic duplicate detection. Returns [] when no key is
 * set (demo mode) — callers treat an empty embedding as "skip the
 * similarity check," which is exactly right for local preview.
 */
export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Gemini embedding request failed: ${response.status} ${body}`
    );
  }

  const data = await response.json();
  return data.embedding?.values ?? [];
}
