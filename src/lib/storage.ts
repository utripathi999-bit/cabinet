import { Redis } from "@upstash/redis";
import type { LastError, RecentTopic, TopicRecord } from "./types";

const HISTORY_KEY = "cabinet:history"; // list of recent topics (title, category, embedding, date), newest first
const HISTORY_MAX = 500; // how many past topics we remember, to check for repeats
const COUNTER_KEY = "cabinet:card-count";
const LAST_ERROR_KEY = "cabinet:last-error";

function topicKey(date: string) {
  return `cabinet:topic:${date}`;
}

function lockKey(date: string) {
  return `cabinet:lock:${date}`;
}

// Vercel's Upstash Marketplace integration injects these automatically once
// you add the integration to your project. See README.md for setup. If
// they're absent — e.g. running locally before storage is provisioned — we
// fall back to an in-memory store so the app still runs; it just forgets
// everything on restart.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

if (!redis) {
  console.warn(
    "[cabinet] UPSTASH_REDIS_REST_URL/TOKEN not set — using in-memory storage (local dev only, resets on restart)"
  );
}

const mem = {
  topics: new Map<string, TopicRecord>(),
  history: [] as RecentTopic[],
  counter: 0,
  locks: new Set<string>(),
  lastError: null as LastError | null,
};

export async function getCachedTopic(date: string): Promise<TopicRecord | null> {
  if (!redis) return mem.topics.get(topicKey(date)) ?? null;
  const cached = await redis.get<TopicRecord>(topicKey(date));
  return cached ?? null;
}

export async function cacheTopic(topic: TopicRecord): Promise<void> {
  if (!redis) {
    mem.topics.set(topicKey(topic.date), topic);
    return;
  }
  // Keep cards for 45 days — plenty for the "today" cache, cheap to keep a
  // short backlog, and storage doesn't grow forever.
  await redis.set(topicKey(topic.date), topic, { ex: 60 * 60 * 24 * 45 });
}

// @upstash/redis auto-serializes/deserializes non-string values, so
// RecentTopic objects (embedding array included) go in and out as-is.
export async function getRecentTopics(limit = 120): Promise<RecentTopic[]> {
  if (!redis) return mem.history.slice(0, limit);
  return redis.lrange<RecentTopic>(HISTORY_KEY, 0, limit - 1);
}

export async function pushRecentTopic(entry: RecentTopic): Promise<void> {
  if (!redis) {
    mem.history = [entry, ...mem.history].slice(0, HISTORY_MAX);
    return;
  }
  await redis.lpush(HISTORY_KEY, entry);
  await redis.ltrim(HISTORY_KEY, 0, HISTORY_MAX - 1);
}

export async function nextCardNumber(): Promise<number> {
  if (!redis) return ++mem.counter;
  return redis.incr(COUNTER_KEY);
}

/**
 * Best-effort lock so two simultaneous visitors don't both trigger a
 * generation for the same date. Not mission-critical for a single-user
 * site, but cheap insurance. Returns true if the lock was acquired.
 */
export async function acquireGenerationLock(date: string): Promise<boolean> {
  if (!redis) {
    const key = lockKey(date);
    if (mem.locks.has(key)) return false;
    mem.locks.add(key);
    return true;
  }
  const result = await redis.set(lockKey(date), "1", { nx: true, ex: 20 });
  return result === "OK";
}

export async function releaseGenerationLock(date: string): Promise<void> {
  if (!redis) {
    mem.locks.delete(lockKey(date));
    return;
  }
  await redis.del(lockKey(date));
}

/**
 * The most recent generation failure, if the last attempt (cron or
 * on-demand) errored — cleared on the next success. This is what the
 * admin page shows instead of a proactive alert (email/webhook): for
 * something that runs once a day, checking a status page covers it
 * without needing another account.
 */
export async function getLastError(): Promise<LastError | null> {
  if (!redis) return mem.lastError;
  return (await redis.get<LastError>(LAST_ERROR_KEY)) ?? null;
}

export async function setLastError(message: string): Promise<void> {
  const entry: LastError = { message, at: new Date().toISOString() };
  if (!redis) {
    mem.lastError = entry;
    return;
  }
  await redis.set(LAST_ERROR_KEY, entry);
}

export async function clearLastError(): Promise<void> {
  if (!redis) {
    mem.lastError = null;
    return;
  }
  await redis.del(LAST_ERROR_KEY);
}
