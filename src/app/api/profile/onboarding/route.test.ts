import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), from: vi.fn(), upsert: vi.fn(), update: vi.fn(), single: vi.fn() }));
vi.mock("@/lib/db/supabase-server", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/demo", () => ({ isDemoMode: false }));
import { POST } from "./route";
function request(body: unknown) { return new NextRequest("http://localhost/api/profile/onboarding", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }); }
beforeEach(() => {
  vi.clearAllMocks(); mocks.upsert.mockResolvedValue({ error: null }); mocks.single.mockResolvedValue({ data: { id: "owner" }, error: null });
  mocks.update.mockReturnValue({ eq: () => ({ select: () => ({ single: mocks.single }) }) }); mocks.from.mockImplementation(() => ({ upsert: mocks.upsert, update: mocks.update }));
  mocks.requireUser.mockResolvedValue({ user: { id: "owner" }, supabase: { from: mocks.from }, unauthorized: null });
});
describe("honest onboarding persistence", () => {
  it("uses only canonical schema columns and marks completion last", async () => {
    const r = await POST(request({ full_name: "Ahmad", primary_language: "ar" })); expect(r.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith({ user_id: "owner", full_name: "Ahmad" }, { onConflict: "user_id" });
    expect(mocks.update).toHaveBeenCalledWith({ display_name: "Ahmad", lang: "ar", onboarded: true });
  });
  it("does not complete setup after academic-profile failure", async () => {
    mocks.upsert.mockResolvedValue({ error: { message: "unavailable" } }); const r = await POST(request({ full_name: "Ahmad" })); expect(r.status).toBe(500); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("returns failure for a failed or missing user update", async () => { mocks.single.mockResolvedValue({ data: null, error: null }); expect((await POST(request({ full_name: "Ahmad" }))).status).toBe(500); });
  it("retries a partial save by the same user key instead of inserting duplicates", async () => {
    mocks.single.mockResolvedValueOnce({ data: null, error: { message: "temporary" } });
    const body = { full_name: "Ahmad", primary_language: "ar" };
    expect((await POST(request(body))).status).toBe(500);
    expect((await POST(request(body))).status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledTimes(2);
    for (const args of mocks.upsert.mock.calls) expect(args).toEqual([{ user_id: "owner", full_name: "Ahmad" }, { onConflict: "user_id" }]);
  });
  it("does not erase a saved name when onboarding is skipped", async () => { await POST(request({ primary_language: "ar" })); expect(mocks.upsert).not.toHaveBeenCalled(); expect(mocks.update).toHaveBeenCalledWith({ lang: "ar", onboarded: true }); });
  it("rejects unauthorized and invalid requests without writes", async () => {
    expect((await POST(request({ primary_language: "xx" }))).status).toBe(400); expect(mocks.from).not.toHaveBeenCalled();
    mocks.requireUser.mockResolvedValue({ unauthorized: NextResponse.json({}, { status: 401 }) }); expect((await POST(request({}))).status).toBe(401);
  });
});
