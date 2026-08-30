import Link from "next/link";
import { getCachedTopic } from "@/lib/storage";
import { lastNDaysIST, formatDisplayDate } from "@/lib/date";
import type { TopicRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Archive — Cabinet",
  description: "The last 30 days of Cabinet's daily topics.",
};

export default async function ArchivePage() {
  const dates = lastNDaysIST(30);
  const records = await Promise.all(dates.map((d) => getCachedTopic(d)));
  const cards = records.filter((r): r is TopicRecord => r !== null);

  return (
    <main className="archive-page">
      <div className="wordmark-block">
        <p className="wordmark">
          <Link href="/">Cabinet</Link>
        </p>
        <p className="tagline">last 30 days</p>
      </div>

      <div className="archive-body">
        {cards.length === 0 ? (
          <p className="sources-empty">No cards generated yet.</p>
        ) : (
          <ul className="archive-list">
            {cards.map((card) => (
              <li className="archive-item" key={card.date}>
                <Link href={`/archive/${card.date}`}>
                  <span className="archive-date">
                    {formatDisplayDate(card.date)}
                  </span>
                  <span className="category-tag">{card.category}</span>
                  <span className="archive-title">{card.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
