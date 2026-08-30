import { NextRequest, NextResponse } from "next/server";
import { isValidAdminKey } from "@/lib/adminAuth";
import { regenerateTopic } from "@/lib/topic";
import { todayIST } from "@/lib/date";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // generation + retries can run long; give it room

// A plain <form method="POST"> from the admin page hits this — no client
// JS needed for the refresh button itself.
export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const key = formData?.get("key")?.toString() ?? request.nextUrl.searchParams.get("key");

  if (!isValidAdminKey(key)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await regenerateTopic(todayIST());
  } catch (err) {
    console.error("Admin refresh failed", err);
    // Fall through to the redirect anyway — the admin page's status panel
    // will show the recorded error.
  }

  return NextResponse.redirect(
    new URL(`/admin?key=${encodeURIComponent(key ?? "")}`, request.url),
    { status: 303 }
  );
}
