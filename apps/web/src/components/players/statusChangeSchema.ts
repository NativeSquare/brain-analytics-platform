import * as z from "zod";

/**
 * Zod schema for the status change confirmation dialog.
 *
 * Story 5.6 AC #1: Validates the selected status.
 */
export const statusChangeSchema = z.object({
  status: z.enum(["active", "onLoan", "leftClub"]),
});

export type StatusChangeFormData = z.infer<typeof statusChangeSchema>;
