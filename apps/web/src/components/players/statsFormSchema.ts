import * as z from "zod";

export const statsFormSchema = z.object({
  matchDate: z.number({ message: "Match date is required" }),
  opponent: z.string().min(1, "Opponent is required"),
  minutesPlayed: z
    .number({ message: "Minutes played is required" })
    .int("Minutes must be a whole number")
    .min(0, "Minutes must be 0 or more")
    .max(120, "Minutes cannot exceed 120"),
  goals: z
    .number()
    .int("Goals must be a whole number")
    .min(0, "Goals must be 0 or more"),
  assists: z
    .number()
    .int("Assists must be a whole number")
    .min(0, "Assists must be 0 or more"),
  yellowCards: z
    .number()
    .int("Yellow cards must be a whole number")
    .min(0, "Minimum 0 yellow cards")
    .max(2, "Maximum 2 yellow cards"),
  redCards: z
    .number()
    .int("Red cards must be a whole number")
    .min(0, "Minimum 0 red cards")
    .max(1, "Maximum 1 red card"),
});

export type StatsFormData = z.infer<typeof statsFormSchema>;
