import type { GeneratedTopicDraft, QuizQuestion } from "./types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Free-tier Gemini models — get a key at https://aistudio.google.com/apikey
// (a separate key from the YouTube Data API one, but no card required).
// Google retires older model IDs for new API keys over time (this project
// hit exactly that: gemini-2.5-flash and text-embedding-004 were both
// retired for new keys after this was first written) — if either of these
// starts failing, the error response names the current replacement model.
// (Image generation moved to pollinations.ts — every Gemini image model
// came back with a hard 0 free-tier quota for this key, not just "used up.")
const GENERATION_MODEL = "gemini-3.6-flash";
const EMBEDDING_MODEL = "gemini-embedding-001";

const SYSTEM_PROMPT = `You write for "Cabinet," a website that hands its one user a single topic to research each day. Its focus is seven domains: Digital Technology, Psychology, Artificial Intelligence, Economics, Science Phenomena, Greek Mythology & Philosophy, and History. Every topic should be genuinely fun and interesting — the kind of thing someone who loves nerding out would want to fall down a rabbit hole on, not a dry textbook entry.

For each request, invent ONE topic and return ONLY a single JSON object matching exactly this shape:

{
  "title": "string, the topic itself, 3-8 words, specific and evocative (not a generic category). Do NOT use an \"X and Y\" construction (two phrases joined by 'and') — this is a hard rule, not a preference. Use a plain proper noun (\"The Antikythera Mechanism\"), a single striking phrase (\"The Halting Problem\"), a possessive (\"Dieter Rams' Ten Principles\"), or another non-paired form instead.",
  "category": "string, 1-2 words naming which of the seven domains this is, e.g. Digital Technology, Psychology, Artificial Intelligence, Economics, Science Phenomena, Greek Mythology, Philosophy, History",
  "description": "string, ONE paragraph, 80-130 words, written for a sharp generalist with no prior background. Open on a concrete, vivid detail or scene — a specific moment, number, or image — never a definition or a throat-clearing setup sentence. Include at least one genuinely surprising, specific fact (a number, a name, a date, a consequence) that most people wouldn't already know. Define any term you use inline, in passing, without slowing down. End on why it's worth an hour of someone's time — the real payoff, not a generic 'and that's fascinating' close.",
  "searchQuery": "string, a short natural-language phrase (4-8 words) someone would type into YouTube to find good videos on this exact topic",
  "imagePrompt": "string, a prompt for a text-to-image model to illustrate this topic. This MUST describe one concrete, literal SCENE with physical objects, characters, setting, and action — image models produce garbage when asked to 'represent' or 'symbolize' an abstract concept, so never write anything abstract or conceptual here. Describe what a cartoon illustration would literally show: who/what is in it, where, doing what. E.g. for a topic about a philosopher who lived in a barrel: 'a bearded man in a toga sitting inside a large ceramic wine barrel in an ancient Greek marketplace, holding a lit lantern, market stalls and columns in the background' — not 'an illustration representing philosophical minimalism'. Always end this field with the literal text: ', flat cartoon illustration style, bold vibrant colors, no text, no words, no letters'"
}

Rules:
- Pick something specific and researchable, not a vague umbrella ("The Byzantine Iconoclasm" not "Byzantine History"; "The Halting Problem" not "Computer Science Theory").
- Never repeat or closely rephrase anything in the "avoid" list you're given — including the same topic in different words.
- A shared broad domain is NOT itself a duplicate. Distinct subjects, or genuine subtopics/deep-dives within a domain already touched on, are welcome even when related — e.g. Typography, the Printing Press, Calligraphy, and UI Design are four acceptable topics despite the overlap between them.
- Rotate across the seven domains — don't cluster on the same one two days running. History specifically should come up less often than the other six — treat it as roughly half as frequent, not an equal seventh.
- No "X and Y" titles, ever — see the title field's rule above.
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
    imagePrompt:
      "an ancient wooden sailing ship in dry dock, half its planks freshly replaced with new pale wood next to the old weathered planks, a shipwright examining it, harbor in the background, flat cartoon illustration style, bold vibrant colors, no text, no words, no letters",
  },
  {
    title: "The Antikythera Mechanism",
    category: "History",
    description:
      "In 1901, sponge divers off a Greek island pulled a corroded lump of bronze from a 2,000-year-old shipwreck. It sat in a museum for decades before anyone realized what it was: a hand-cranked mechanical computer, with over thirty precisely cut gears, that predicted eclipses and tracked the position of the sun, moon, and five visible planets — decades before the mathematics it relied on was supposed to exist. Nothing of comparable complexity appears again in the historical record for over a thousand years. We still don't know who built it, how many were made, or why the knowledge vanished so completely. It's worth an hour because it quietly rewrites how far back real engineering sophistication goes — and how much history simply didn't survive.",
    searchQuery: "antikythera mechanism explained",
    imagePrompt:
      "a corroded bronze geared mechanism with visible interlocking gear wheels, held up by a sponge diver in old brass diving helmet on a Greek shipwreck deck, blue sea in background, flat cartoon illustration style, bold vibrant colors, no text, no words, no letters",
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

const QUIZ_SYSTEM_PROMPT = `You write daily quiz questions for "Cabinet," a site where the reader has just spent time researching one specific topic. Your job is a 5-question multiple-choice quiz on that exact topic, for someone who actually went and read/watched about it — not someone skimming a headline.

Return ONLY a JSON array of exactly 5 objects, each matching:

{
  "question": "string — a specific, niche question about THIS topic. It must require genuine knowledge from having researched the topic, not be answerable from common sense, elimination, or a one-line summary. Never ask something so obvious the title alone gives it away.",
  "options": ["exactly 4 strings — one correct answer and three plausible, non-silly wrong answers, similar in length and specificity so the correct one doesn't stand out"],
  "correctIndex": "integer 0-3, the index of the correct option in the options array"
}

Rules:
- All 5 questions must be genuinely about the specific topic given — not generic knowledge from its broad domain.
- Vary what each question tests (a date/number, a name, a mechanism, a consequence, a specific claim) rather than five variations on the same fact.
- Wrong options should be believable to someone who half-remembers the topic, not obviously fake.
- Return raw JSON only, no markdown fences, no commentary.`;

/**
 * Generates a 5-question quiz for a topic. Best-effort, like the
 * illustration — a failed or malformed quiz shouldn't block the topic
 * itself from being cached, so callers treat null as "no quiz today."
 */
export async function generateQuiz(
  title: string,
  category: string,
  description: string
): Promise<QuizQuestion[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${GENERATION_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: QUIZ_SYSTEM_PROMPT }] },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Topic: "${title}" (${category})\n\nWhat the reader already read: ${description}\n\nWrite the 5-question quiz now — go deeper than that summary.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 1,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingLevel: "low" },
          },
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn(`[cabinet] Quiz generation failed: ${response.status} ${body.slice(0, 400)}`);
      return null;
    }

    const data = await response.json();
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.warn("[cabinet] Quiz generation returned no text content");
      return null;
    }

    const parsed = JSON.parse(stripCodeFence(text));
    if (!Array.isArray(parsed) || parsed.length !== 5) {
      console.warn("[cabinet] Quiz generation returned the wrong shape", parsed);
      return null;
    }

    const valid = parsed.every(
      (q) =>
        typeof q.question === "string" &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.every((o: unknown) => typeof o === "string") &&
        Number.isInteger(q.correctIndex) &&
        q.correctIndex >= 0 &&
        q.correctIndex <= 3
    );
    if (!valid) {
      console.warn("[cabinet] Quiz generation returned malformed questions", parsed);
      return null;
    }

    return parsed as QuizQuestion[];
  } catch (err) {
    console.warn("[cabinet] Quiz generation threw", err);
    return null;
  }
}
