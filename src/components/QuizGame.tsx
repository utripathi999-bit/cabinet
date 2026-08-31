"use client";

import { useMemo, useState } from "react";
import type { QuizQuestion } from "@/lib/types";

interface ShuffledQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface StoredResult {
  score: number;
  results: boolean[];
}

interface Streak {
  count: number;
  lastDate: string;
}

const STORAGE_PREFIX = "cabinet-quiz-";
const STREAK_KEY = "cabinet-quiz-streak";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Randomizes option order per question, remapping correctIndex to match —
 * this is what makes the answer position different for every visitor. */
function shuffleQuestions(questions: QuizQuestion[]): ShuffledQuestion[] {
  return questions.map((q) => {
    const order = shuffle(q.options.map((_, i) => i));
    return {
      question: q.question,
      options: order.map((i) => q.options[i]),
      correctIndex: order.indexOf(q.correctIndex),
    };
  });
}

function yesterday(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function readStoredResult(date: string): StoredResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + date);
    return raw ? (JSON.parse(raw) as StoredResult) : null;
  } catch {
    return null; // localStorage can throw (private mode, disabled) — treat as "not played"
  }
}

function readStreak(): Streak {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? (JSON.parse(raw) as Streak) : { count: 0, lastDate: "" };
  } catch {
    return { count: 0, lastDate: "" };
  }
}

function commitResult(date: string, result: StoredResult): Streak {
  try {
    localStorage.setItem(STORAGE_PREFIX + date, JSON.stringify(result));
  } catch {
    // Non-fatal — the result just won't persist across reloads this time.
  }
  const prev = readStreak();
  const streak: Streak =
    prev.lastDate === yesterday(date)
      ? { count: prev.count + 1, lastDate: date }
      : { count: 1, lastDate: date };
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  } catch {
    // Non-fatal.
  }
  return streak;
}

function scoreMessage(score: number): string {
  if (score === 5) return "Perfect — you really did the reading.";
  if (score === 4) return "Nearly perfect.";
  if (score === 3) return "Solid.";
  if (score >= 1) return "Room to dig deeper next time.";
  return "Tomorrow's a new topic.";
}

function ResultsView({
  topicTitle,
  date,
  result,
  streak,
}: {
  topicTitle: string;
  date: string;
  result: StoredResult;
  streak: Streak;
}) {
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  async function handleShare() {
    const grid = result.results.map((r) => (r ? "✅" : "❌")).join("");
    const text = `Cabinet Quiz — ${topicTitle}\n${result.score}/5 ${grid}\ncabinet-mu.vercel.app/quiz`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // User cancelled — not an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 1800);
    } catch {
      // Non-fatal.
    }
  }

  return (
    <div className="quiz-results">
      <p className="sources-label">Today&rsquo;s result</p>
      <p className="quiz-score">{result.score}/5</p>
      <p className="quiz-score-message">{scoreMessage(result.score)}</p>
      <div className="quiz-result-grid" aria-hidden="true">
        {result.results.map((correct, i) => (
          <span key={i} className={correct ? "quiz-dot quiz-dot--correct" : "quiz-dot quiz-dot--wrong"} />
        ))}
      </div>
      {streak.count > 1 && <p className="quiz-streak">{streak.count}-day streak</p>}
      <button type="button" className="admin-button" onClick={handleShare}>
        {shareState === "copied" ? "Copied" : "Share result"}
      </button>
      <p className="quiz-tomorrow">A new quiz arrives with tomorrow&rsquo;s card.</p>
    </div>
  );
}

export function QuizGame({
  questions,
  topicTitle,
  date,
}: {
  questions: QuizQuestion[];
  topicTitle: string;
  date: string;
}) {
  const shuffled = useMemo(() => shuffleQuestions(questions), [questions]);

  const [alreadyPlayed] = useState(() => readStoredResult(date));
  const [streak, setStreak] = useState(() => readStreak());
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [finalResult, setFinalResult] = useState<StoredResult | null>(null);

  if (alreadyPlayed && !finalResult) {
    return (
      <ResultsView topicTitle={topicTitle} date={date} result={alreadyPlayed} streak={streak} />
    );
  }

  if (finalResult) {
    return (
      <ResultsView topicTitle={topicTitle} date={date} result={finalResult} streak={streak} />
    );
  }

  const current = shuffled[index];

  function handleSelect(optionIndex: number) {
    if (selected !== null) return; // already answered this one
    setSelected(optionIndex);
  }

  function handleNext() {
    const correct = selected === current.correctIndex;
    const nextAnswers = [...answers, correct];

    if (index + 1 < shuffled.length) {
      setAnswers(nextAnswers);
      setIndex(index + 1);
      setSelected(null);
      return;
    }

    const score = nextAnswers.filter(Boolean).length;
    const result: StoredResult = { score, results: nextAnswers };
    const newStreak = commitResult(date, result);
    setStreak(newStreak);
    setFinalResult(result);
  }

  return (
    <div className="quiz-game">
      <p className="quiz-progress">
        Question {index + 1} of {shuffled.length}
      </p>
      <h2 className="quiz-question">{current.question}</h2>
      <div className="quiz-options">
        {current.options.map((option, i) => {
          let className = "quiz-option";
          if (selected !== null) {
            if (i === current.correctIndex) className += " quiz-option--correct";
            else if (i === selected) className += " quiz-option--wrong";
          }
          return (
            <button
              key={i}
              type="button"
              className={className}
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
            >
              {option}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <button type="button" className="admin-button quiz-next" onClick={handleNext}>
          {index + 1 < shuffled.length ? "Next question" : "See results"}
        </button>
      )}
    </div>
  );
}
