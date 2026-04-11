import * as z from "zod";

/**
 * Zod schema for the staff self-service profile edit form.
 *
 * Story 13.4 AC #3: Only phone, email, and bio are editable.
 * Max 500 characters for phone/email, 2000 for bio. Email format validated.
 */
export const staffProfileEditSchema = z.object({
  phone: z
    .string()
    .max(500, "Phone number is too long")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email format")
    .max(500, "Email is too long")
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .max(2000, "Bio is too long")
    .optional()
    .or(z.literal("")),
});

export type StaffProfileEditFormData = z.infer<typeof staffProfileEditSchema>;
