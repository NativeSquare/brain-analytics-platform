import * as z from "zod";

/**
 * Zod validation schema for the player profile creation form.
 *
 * AC #3: Validates required fields, optional field constraints,
 * and format-specific rules (email, positive numbers, past date).
 */
export const playerFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  photo: z.string().optional(),
  dateOfBirth: z.number().optional().refine(
    (val) => !val || val < Date.now(),
    "Date of birth must be in the past"
  ),
  nationality: z.string().optional(),
  position: z.enum(["Goalkeeper", "Defender", "Midfielder", "Forward"], {
    message: "Position is required",
  }),
  squadNumber: z
    .number()
    .int("Squad number must be a whole number")
    .positive("Squad number must be a positive integer")
    .optional(),
  preferredFoot: z.enum(["Left", "Right", "Both"]).optional(),
  heightCm: z.number().positive("Height must be positive").optional(),
  weightKg: z.number().positive("Weight must be positive").optional(),
  phone: z.string().optional(),
  personalEmail: z
    .string()
    .email("Invalid email format")
    .optional()
    .or(z.literal("")),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

export type PlayerFormData = z.infer<typeof playerFormSchema>;
