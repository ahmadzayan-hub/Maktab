export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/db/supabase-server";
import { isDemoMode, DEMO_PROFILE } from "@/lib/demo";

export async function GET() {
  if (isDemoMode) return NextResponse.json({ ...DEMO_PROFILE, role: "student", demo: true });
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  const { data, error } = await supabase.from("users").select("id, display_name, avatar_url, email, role, lang").eq("id", user.id).single();
  if (error || !data) return NextResponse.json({ error: "Profile could not be loaded" }, { status: 500 });
  return NextResponse.json({ ...data, full_name: data.display_name });
}

const ProfileInput = z.object({ full_name: z.string().trim().max(120), avatar_url: z.string().url().nullable().optional() });
export async function PUT(req: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  const parsed = ProfileInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  if (isDemoMode) return NextResponse.json({ ...DEMO_PROFILE, ...parsed.data, demo: true });
  const { full_name, avatar_url } = parsed.data;
  const { data, error } = await supabase.from("users").update({ display_name: full_name, ...(avatar_url !== undefined ? { avatar_url } : {}) }).eq("id", user.id).select("id, display_name, avatar_url, email").single();
  if (error || !data) return NextResponse.json({ error: "Profile could not be saved" }, { status: 500 });
  return NextResponse.json({ ...data, full_name: data.display_name });
}
