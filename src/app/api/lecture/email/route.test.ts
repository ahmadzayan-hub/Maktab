import { expect, it, vi } from "vitest";
vi.mock("@/lib/db/supabase-server", () => ({ getUser: vi.fn(async () => ({ id: "owner" })) }));
import { POST } from "./route";
it("never claims delivery without an email provider", async () => { const response = await POST(); expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ sent: 0 }); });
