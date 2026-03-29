import * as z from "zod";

/**
 * Zod schema for the "Log Injury" create form.
 *
 * Story 5.5 AC #5: date (required), injuryType (required, max 200),
 * severity (required enum), estimatedRecovery (optional, max 200),
 * notes (optional, max 2000).
 */
export const injuryCreateSchema = z.object({
  date: z.number({ message: "Date is required" }),
  injuryType: z
    .string()
    .min(1, "Injury type is required")
    .max(200, "Injury type cannot exceed 200 characters"),
  severity: z.enum(["minor", "moderate", "severe"] as const, {
    message: "Severity is required",
  }),
  estimatedRecovery: z
    .string()
    .max(200, "Estimated recovery cannot exceed 200 characters")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .max(2000, "Notes cannot exceed 2000 characters")
    .optional(),
});

export type InjuryCreateFormData = z.infer<typeof injuryCreateSchema>;

/**
 * Extended Zod schema for the "Update Injury" edit form.
 *
 * Story 5.5 AC #8: Adds status (current/recovered) and optional clearanceDate.
 */
export const injuryEditSchema = injuryCreateSchema.extend({
  status: z.enum(["current", "recovered"] as const, {
    message: "Status is required",
  }),
  clearanceDate: z.number().optional(),
});

export type InjuryEditFormData = z.infer<typeof injuryEditSchema>;
