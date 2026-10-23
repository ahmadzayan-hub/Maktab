import { z } from "zod";
export const OnboardingInput = z.object({
  full_name: z.string().trim().max(120).optional().default(""),
  primary_language: z.enum(["en", "ar"]).default("en"),
});
