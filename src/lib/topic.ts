import { generateTopicDraft, embedText, generateTopicImage, type AvoidEntry } from "./gemini";
import { fetchSources } from "./youtube";
import {
  acquireGenerationLock,
  cacheTopic,
  cacheTopicImage,
  clearLastError,
  getCachedTopic,
  getRecentTopics,
  nextCardNumber,
  pushRecentTopic,
  releaseGenerationLock,
  setLastError,
} from "./storage";
import type { GeneratedTopicDraft, RecentTopic, TopicRecord } from "./types";

// Cosine similarity above this is treated as "the same topic, reworded"
// rather than a genuinely distinct (sub)topic, and triggers a retry. This
// is a starting point, not a guarantee — tune it after watching a few
// weeks of real output: raise it if genuinely different topics are getting
// rejected, lower it if near-repeats are slipping through.
const SIMILARITY_THRESHOLD = 0.88;
const MAX_GENERATION_ATTEMPTS = 4;

function makeCallNumber(category: string, cardNumber: number): string {
  const prefix =
    category
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 3)
      .toUpperCase()
      .padEnd(3, "X") || "GEN";
  return `${prefix}-${String(cardNumber).padStart(4, "0")}`;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Highest similarity between `embedding` and any past topic's embedding. */
function mostSimilar(embedding: number[], history: RecentTopic[]): number {
  if (embedding.length === 0) return 0; // demo mode: no embeddings, no check
  let max = 0;
  for (const past of history) {
    if (past.embedding.length === 0) continue;
    max = Math.max(max, cosineSimilarity(embedding, past.embedding));
  }
  return max;
}

interface Candidate {
  draft: GeneratedTopicDraft;
  embedding: number[];
  similarity: number;
}

/**
 * Asks the model for a topic, embeds it, and checks it against recent
 * history. If it's too close to something already covered, tries again
 * (steering the next attempt away from the rejected draft too). If every
 * attempt comes back too similar, uses the least-similar one rather than
 * failing the day's card outright.
 */
async function draftDistinctTopic(
  history: RecentTopic[]
): Promise<Candidate> {
  const avoidList: AvoidEntry[] = history.map((h) => ({
    title: h.title,
    category: h.category,
  }));

  let best: Candidate | null = null;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const draft = await generateTopicDraft(avoidList);
    const embedding = await embedText(
      `${draft.title} (${draft.category}): ${draft.description}`
    );
    const similarity = mostSimilar(embedding, history);
    const candidate: Candidate = { draft, embedding, similarity };

    if (similarity < SIMILARITY_THRESHOLD) {
      return candidate;
    }

    console.warn(
      `[cabinet] "${draft.title}" scored ${similarity.toFixed(2)} similarity to prior history — retrying (attempt ${attempt + 1}/${MAX_GENERATION_ATTEMPTS})`
    );
    avoidList.push({ title: draft.title, category: draft.category });
    if (!best || similarity < best.similarity) best = candidate;
  }

  return best!;
}

async function generateAndCache(date: string): Promise<TopicRecord> {
  const history = await getRecentTopics();
  const { draft, embedding } = await draftDistinctTopic(history);
  // Sources and the illustration are independent of each other — run them
  // concurrently rather than adding their latencies together.
  const [sources, image] = await Promise.all([
    fetchSources(draft.searchQuery),
    generateTopicImage(draft.title, draft.category),
  ]);
  const cardNumber = await nextCardNumber();

  const record: TopicRecord = {
    date,
    callNumber: makeCallNumber(draft.category, cardNumber),
    category: draft.category,
    title: draft.title,
    description: draft.description,
    sources,
    cardNumber,
    generatedAt: new Date().toISOString(),
  };

  await cacheTopic(record);
  await pushRecentTopic({ title: draft.title, category: draft.category, embedding, date });
  // Illustration is a nice-to-have, not part of the core card — a failed
  // image generation (already logged inside generateTopicImage) shouldn't
  // stop the actual topic from being cached.
  if (image) await cacheTopicImage(date, image);
  return record;
}

/**
 * Regenerates `date`'s card unconditionally — used by the admin refresh
 * action. Unlike getOrGenerateTopic, this always calls the model rather
 * than serving a cached hit, since the whole point is a fresh one.
 */
export async function regenerateTopic(date: string): Promise<TopicRecord> {
  return generateAndCache(date);
}

/**
 * Returns the cached card for `date` if one exists. If not, generates one
 * (used both by the daily cron pre-warm and as an on-demand fallback for
 * the very first visit of a day the cron hasn't run for yet).
 */
export async function getOrGenerateTopic(date: string): Promise<TopicRecord> {
  const cached = await getCachedTopic(date);
  if (cached) return cached;

  const gotLock = await acquireGenerationLock(date);
  if (!gotLock) {
    // Someone else is generating this exact date right now — wait briefly
    // and check the cache again rather than doing a duplicate generation.
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const retried = await getCachedTopic(date);
    if (retried) return retried;
    // Lock holder failed or is still working; fall through and try anyway.
  }

  try {
    const record = await generateAndCache(date);
    await clearLastError();
    return record;
  } catch (err) {
    await setLastError(err instanceof Error ? err.message : String(err));
    throw err;
  } finally {
    await releaseGenerationLock(date);
  }
}
