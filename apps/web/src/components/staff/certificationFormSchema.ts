import * as z from "zod";

/**
 * Zod schema for the certification add/edit form.
 *
 * Story 13.3 AC #9: name (required, max 200), issuingBody (required, max 200),
 * issueDate (required), expiryDate (optional), notes (optional, max 2000).
 */
export const certificationFormSchema = z
  .object({
    name: z
      .string()
      .min(1, "Certification name is required")
      .max(200, "Name cannot exceed 200 characters"),
    issuingBody: z
      .string()
      .min(1, "Issuing body is required")
      .max(200, "Issuing body cannot exceed 200 characters"),
    issueDate: z.number({ message: "Issue date is required" }),
    expiryDate: z.number().optional(),
    notes: z
      .string()
      .max(2000, "Notes cannot exceed 2000 characters")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.expiryDate !== undefined && data.expiryDate <= data.issueDate) {
        return false;
      }
      return true;
    },
    {
      message: "Expiry date must be after issue date",
      path: ["expiryDate"],
    },
  );

export type CertificationFormData = z.infer<typeof certificationFormSchema>;
