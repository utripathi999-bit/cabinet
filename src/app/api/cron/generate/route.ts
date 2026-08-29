import { NextRequest, NextResponse } from "next/server";
import { getOrGenerateTopic } from "@/lib/topic";
import { tomorrowIST } from "@/lib/date";

export const dynamic = "force-dynamic";
export const maxDuration = 10; // Hobby plan ceiling; raise if you're on Pro

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const topic = await getOrGenerateTopic(tomorrowIST());
    return NextResponse.json({ ok: true, date: topic.date, title: topic.title });
  } catch (err) {
    console.error("Cron pre-generation failed", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
