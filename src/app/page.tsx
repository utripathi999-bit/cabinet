import Link from "next/link";
import { Suspense } from "react";
import { getOrGenerateTopic } from "@/lib/topic";
import { getTopicImage } from "@/lib/storage";
import { todayIST } from "@/lib/date";
import { TopicCard } from "@/components/TopicCard";
import { LoadingCard } from "@/components/LoadingCard";
import { ErrorCard } from "@/components/ErrorCard";

// This page depends on the current date and live data, so it should never
// be statically prerendered at build time.
export const dynamic = "force-dynamic";

async function TodaysCard() {
  try {
    const topic = await getOrGenerateTopic(todayIST());
    const image = await getTopicImage(topic.date);
    return <TopicCard topic={topic} image={image} />;
  } catch (err) {
    console.error("Failed to render today's card", err);
    return <ErrorCard />;
  }
}

export default function Home() {
  return (
    <main>
      <div className="wordmark-block">
        <p className="wordmark">Cabinet</p>
        <p className="tagline">
          one curiosity a day · <Link href="/archive">archive</Link>
        </p>
      </div>

      <Suspense fallback={<LoadingCard />}>
        <TodaysCard />
      </Suspense>
    </main>
  );
}
