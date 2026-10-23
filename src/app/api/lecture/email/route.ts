export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/db/supabase-server";
// No delivery provider is configured. Never acknowledge a message that was not sent.
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ error: "Email delivery is not configured. Download the transcript instead.", sent: 0 }, { status: 503 });
}
