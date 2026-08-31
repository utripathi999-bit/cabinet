import Link from "next/link";
import { getCachedTopic, getQuiz } from "@/lib/storage";
import { todayIST } from "@/lib/date";
import { QuizGame } from "@/components/QuizGame";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Today's Quiz — Cabinet",
  description: "5 questions on today's topic. One try, resets tomorrow.",
};

export default async function QuizPage() {
  const date = todayIST();
  const topic = await getCachedTopic(date);
  const quiz = topic ? await getQuiz(date) : null;

  return (
    <main className="quiz-page">
      <div className="wordmark-block">
        <p className="wordmark">
          <a href="/">Cabinet</a>
        </p>
        <p className="tagline">today&rsquo;s quiz</p>
      </div>

      <div className="quiz-body">
        <Link href="/" className="cta-button cta-button--secondary">
          ← Back to today&rsquo;s card
        </Link>

        {!topic ? (
          <div className="state-panel">
            <p className="error-title">No card yet today</p>
            <p className="error-body">
              The quiz is built from today&rsquo;s topic — head back to the
              homepage first to pull it, then come back here.
            </p>
          </div>
        ) : !quiz ? (
          <div className="state-panel">
            <p className="error-title">No quiz today</p>
            <p className="error-body">
              Today&rsquo;s quiz didn&rsquo;t generate successfully. It
              happens occasionally — there&rsquo;ll be a new one tomorrow.
            </p>
          </div>
        ) : (
          <QuizGame questions={quiz} topicTitle={topic.title} date={date} />
        )}
      </div>
    </main>
  );
}
