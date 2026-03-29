import * as z from "zod";

/**
 * Zod schema for the player contact info edit form (self-service).
 *
 * Story 5.6 AC #9: Only contact fields — no bio/football fields.
 * Max 500 characters per field. Email format validated.
 */
export const contactInfoSchema = z.object({
  phone: z
    .string()
    .max(500, "Phone number is too long")
    .optional()
    .or(z.literal("")),
  personalEmail: z
    .string()
    .email("Invalid email format")
    .max(500, "Email is too long")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(500, "Address is too long")
    .optional()
    .or(z.literal("")),
  emergencyContactName: z
    .string()
    .max(500, "Name is too long")
    .optional()
    .or(z.literal("")),
  emergencyContactRelationship: z
    .string()
    .max(500, "Relationship is too long")
    .optional()
    .or(z.literal("")),
  emergencyContactPhone: z
    .string()
    .max(500, "Phone number is too long")
    .optional()
    .or(z.literal("")),
});

export type ContactInfoFormData = z.infer<typeof contactInfoSchema>;
