import { NextResponse } from "next/server";
import { getOrGenerateTopic } from "@/lib/topic";
import { todayIST } from "@/lib/date";

export const dynamic = "force-dynamic";
export const maxDuration = 10; // Hobby plan ceiling; raise if you're on Pro

export async function GET() {
  try {
    const topic = await getOrGenerateTopic(todayIST());
    return NextResponse.json(topic);
  } catch (err) {
    console.error("Failed to get today's topic", err);
    return NextResponse.json(
      { error: "Could not retrieve today's card. Try again shortly." },
      { status: 500 }
    );
  }
}
