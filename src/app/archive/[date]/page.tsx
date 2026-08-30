import { notFound } from "next/navigation";
import { getCachedTopic } from "@/lib/storage";
import { getRelatedTopics } from "@/lib/topic";
import { TopicCard } from "@/components/TopicCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const topic = await getCachedTopic(date);
  if (!topic) return { title: "Not found — Cabinet" };
  return {
    title: `${topic.title} — Cabinet`,
    description: topic.description,
  };
}

export default async function ArchiveDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const topic = await getCachedTopic(date);
  if (!topic) notFound();

  const related = await getRelatedTopics(topic.title);

  return (
    <main>
      <div className="wordmark-block">
        <p className="wordmark">
          <a href="/">Cabinet</a>
        </p>
        <p className="tagline">
          <a href="/archive">back to archive</a>
        </p>
      </div>
      <TopicCard topic={topic} related={related} />
    </main>
  );
}
