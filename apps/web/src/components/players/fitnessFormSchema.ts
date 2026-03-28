import * as z from "zod";

export const fitnessFormSchema = z
  .object({
    date: z.number({ message: "Date is required" }),
    weightKg: z
      .number()
      .min(30, "Weight must be at least 30 kg")
      .max(200, "Weight cannot exceed 200 kg")
      .optional(),
    bodyFatPercentage: z
      .number()
      .min(1, "Body fat must be at least 1%")
      .max(60, "Body fat cannot exceed 60%")
      .optional(),
    notes: z
      .string()
      .max(2000, "Notes cannot exceed 2000 characters")
      .optional(),
  })
  .refine(
    (data) =>
      data.weightKg !== undefined ||
      data.bodyFatPercentage !== undefined ||
      (data.notes !== undefined && data.notes.length > 0),
    {
      message: "At least one data field is required",
      path: ["weightKg"],
    }
  );

export type FitnessFormData = z.infer<typeof fitnessFormSchema>;
