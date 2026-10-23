export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/db/supabase-server";
import { isDemoMode } from "@/lib/demo";
import { OnboardingInput } from "@/lib/journey/onboarding";

export async function POST(req: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  const parsed = OnboardingInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  if (isDemoMode) return NextResponse.json({ ok: true, demo: true });
  const { full_name, primary_language } = parsed.data;
  try {
    // Use the checked-in schema. Never write invented program/onboarding columns.
    // The completion flag is written last. Retrying this upsert is safe after a partial failure.
    if (full_name) {
      const { error } = await supabase.from("academic_profiles").upsert({ user_id: user.id, full_name }, { onConflict: "user_id" });
      if (error) return NextResponse.json({ error: "Profile could not be saved" }, { status: 500 });
    }
    const { data, error } = await supabase.from("users")
      .update({ ...(full_name ? { display_name: full_name } : {}), lang: primary_language, onboarded: true })
      .eq("id", user.id).select("id").single();
    if (error || !data) return NextResponse.json({ error: "Setup could not be completed" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Setup could not be completed" }, { status: 500 });
  }
}
