import type { TopicRecord } from "@/lib/types";
import { formatDisplayDate } from "@/lib/date";

export function TopicCard({ topic }: { topic: TopicRecord }) {
  return (
    <div className="stack">
      <article className="card">
        <div className="card-header">
          <span className="call-number">{topic.callNumber}</span>
          <span className="card-count">Card No. {topic.cardNumber}</span>
        </div>

        <span className="category-tag">{topic.category}</span>

        <h1 className="title">{topic.title}</h1>
        <p className="description">{topic.description}</p>

        <hr className="divider" />

        <div>
          <p className="sources-label">Start here</p>
          {topic.sources.length > 0 ? (
            <ul className="source-list">
              {topic.sources.map((source) => (
                <li className="source-item" key={source.url}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    <span className="source-title">{source.title}</span>
                    <span className="source-channel">{source.channel}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sources-empty">
              No sources retrieved today — the topic still stands on its own.
            </p>
          )}
        </div>
      </article>

      <p className="footer-meta">
        {formatDisplayDate(topic.date)} · a new card is pulled every midnight
        IST
      </p>
    </div>
  );
}
