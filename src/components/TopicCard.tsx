import Link from "next/link";
import type { GeneratedImage, TopicRecord } from "@/lib/types";
import { formatDisplayDate } from "@/lib/date";
import { ShareButton } from "./ShareButton";

export function TopicCard({
  topic,
  image,
}: {
  topic: TopicRecord;
  image?: GeneratedImage | null;
}) {
  // CSS composites the legibility scrim + this image together (see
  // .pane-topic--image) — passed as a custom property rather than a
  // literal backgroundImage so the scrim gradient stays in one place.
  const paneStyle = image
    ? ({ "--pane-image": `url(data:${image.mimeType};base64,${image.base64})` } as React.CSSProperties)
    : undefined;

  return (
    <>
      <div className="split">
        <section
          className={`pane pane-topic${image ? " pane-topic--image" : ""}`}
          style={paneStyle}
        >
          <div className="card-header">
            <span>
              <span className="call-number">{topic.callNumber}</span>
              <span className="card-count"> · Card No. {topic.cardNumber}</span>
            </span>
            <ShareButton title={topic.title} />
          </div>
          <span className="category-tag">{topic.category}</span>
          <h1 className="title">{topic.title}</h1>
        </section>

        <section className="pane pane-detail">
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
        </section>
      </div>

      <p className="footer-meta">
        {formatDisplayDate(topic.date)} · a new card is pulled every midnight
        IST · <Link href="/archive">archive</Link>
      </p>
    </>
  );
}
