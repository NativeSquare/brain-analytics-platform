"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@packages/backend/convex/_generated/api";
import { toast } from "sonner";
import { IconUpload, IconX } from "@tabler/icons-react";

import { format } from "date-fns";
import { IconCalendar } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/lib/countries";

import {
  playerFormSchema,
  type PlayerFormData,
} from "./playerFormSchema";
import {
  PLAYER_POSITIONS,
  PREFERRED_FOOT_OPTIONS,
} from "@packages/shared/players";

interface ProfileFormProps {
  onSuccess: (playerId: string, data: PlayerFormData) => void;
}

export function ProfileForm({ onSuccess }: ProfileFormProps) {
  const createPlayer = useMutation(api.players.mutations.createPlayer);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const uploadAbortRef = React.useRef<AbortController | null>(null);
  const [countrySearch, setCountrySearch] = React.useState("");

  const filteredCountries = React.useMemo(() => {
    if (!countrySearch) return COUNTRIES;
    const q = countrySearch.toLowerCase();
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [countrySearch]);

  const router = useRouter();

  const form = useForm<PlayerFormData>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      position: undefined,
      nationality: "",
      phone: "",
      personalEmail: "",
      address: "",
      emergencyContactName: "",
      emergencyContactRelationship: "",
      emergencyContactPhone: "",
    },
  });

  const handlePhotoUpload = async (file: File) => {
    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are supported");
      return;
    }
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    // Abort any previous in-flight upload
    uploadAbortRef.current?.abort();
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
        signal: controller.signal,
      });
      const { storageId } = await result.json();
      form.setValue("photo", storageId);
      // Revoke previous object URL to prevent memory leak
      setPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error("Failed to upload photo");
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Keep a ref to the current preview URL for cleanup on unmount
  const photoPreviewRef = React.useRef(photoPreview);
  photoPreviewRef.current = photoPreview;

  const removePhoto = () => {
    form.setValue("photo", undefined);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  // Revoke object URL and abort in-flight uploads on unmount
  React.useEffect(() => {
    return () => {
      uploadAbortRef.current?.abort();
      if (photoPreviewRef.current) URL.revokeObjectURL(photoPreviewRef.current);
    };
  }, []);

  const onSubmit = async (data: PlayerFormData) => {
    setIsSubmitting(true);
    try {
      // Clean up empty optional strings
      const cleanData = {
        ...data,
        personalEmail: data.personalEmail || undefined,
        nationality: data.nationality || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        emergencyContactName: data.emergencyContactName || undefined,
        emergencyContactRelationship:
          data.emergencyContactRelationship || undefined,
        emergencyContactPhone: data.emergencyContactPhone || undefined,
      };

      const playerId = await createPlayer(cleanData);
      toast.success("Player created successfully");
      onSuccess(playerId, data);
    } catch (error) {
      if (error instanceof ConvexError) {
        const errorData = error.data as { code?: string; message?: string };
        if (
          errorData.code === "VALIDATION_ERROR" &&
          errorData.message?.includes("Squad number")
        ) {
          form.setError("squadNumber", {
            message: errorData.message,
          });
        }
        toast.error(errorData.message ?? "Failed to create player");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="firstName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="firstName">
                      First Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      {...field}
                      id="firstName"
                      placeholder="e.g. Marcus"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="lastName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="lastName">
                      Last Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      {...field}
                      id="lastName"
                      placeholder="e.g. Rashford"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            {/* Photo Upload */}
            <Field>
              <FieldLabel>Photo</FieldLabel>
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="size-20 rounded-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="bg-destructive text-destructive-foreground absolute -right-1 -top-1 rounded-full p-0.5"
                    >
                      <IconX className="size-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex size-20 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
                    {isUploading ? (
                      <Spinner className="size-5" />
                    ) : (
                      <IconUpload className="text-muted-foreground size-5" />
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(file);
                      }}
                      disabled={isUploading}
                    />
                  </label>
                )}
                <div className="text-sm text-muted-foreground">
                  <p>JPEG, PNG or WebP. Max 5MB.</p>
                </div>
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="dateOfBirth"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel>Date of Birth</FieldLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          <IconCalendar className="mr-2 size-4" />
                          {field.value
                            ? format(new Date(field.value), "dd/MM/yyyy")
                            : "dd/mm/yyyy"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) =>
                            field.onChange(date ? date.getTime() : undefined)
                          }
                          captionLayout="dropdown"
                          defaultMonth={field.value ? new Date(field.value) : new Date(2000, 0)}
                          fromYear={1970}
                          toYear={new Date().getFullYear()}
                          disabled={{ after: new Date() }}
                        />
                      </PopoverContent>
                    </Popover>
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="nationality"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="nationality">Nationality</FieldLabel>
                    <Combobox
                      value={field.value || null}
                      onValueChange={(val) => {
                        field.onChange(val ?? "");
                        setCountrySearch("");
                      }}
                      onInputValueChange={(v) => setCountrySearch(v)}
                    >
                      <ComboboxInput
                        placeholder="Select nationality..."
                        showClear={!!field.value}
                      />
                      <ComboboxContent>
                        <ComboboxList>
                          {filteredCountries.length === 0 && (
                            <p className="py-2 text-center text-sm text-muted-foreground">
                              No country found.
                            </p>
                          )}
                          {filteredCountries.map((country) => (
                            <ComboboxItem key={country} value={country}>
                              {country}
                            </ComboboxItem>
                          ))}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Football Details */}
      <Card>
        <CardHeader>
          <CardTitle>Football Details</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Controller
                name="position"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel>
                      Position <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAYER_POSITIONS.map((pos) => (
                          <SelectItem key={pos} value={pos}>
                            {pos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="squadNumber"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="squadNumber">Squad Number</FieldLabel>
                    <Input
                      id="squadNumber"
                      type="number"
                      min={1}
                      placeholder="e.g. 10"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val ? Number(val) : undefined);
                      }}
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="preferredFoot"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel>Preferred Foot</FieldLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(val) =>
                        field.onChange(val || undefined)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select foot" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREFERRED_FOOT_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Physical */}
      <Card>
        <CardHeader>
          <CardTitle>Physical</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="heightCm"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="heightCm">Height (cm)</FieldLabel>
                    <Input
                      id="heightCm"
                      type="number"
                      min={1}
                      step="0.1"
                      placeholder="e.g. 180"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val ? Number(val) : undefined);
                      }}
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="weightKg"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="weightKg">Weight (kg)</FieldLabel>
                    <Input
                      id="weightKg"
                      type="number"
                      min={1}
                      step="0.1"
                      placeholder="e.g. 75"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val ? Number(val) : undefined);
                      }}
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="phone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="phone">Phone</FieldLabel>
                    <Input
                      {...field}
                      id="phone"
                      type="tel"
                      placeholder="e.g. +44 7700 900000"
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="personalEmail"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="personalEmail">
                      Personal Email
                    </FieldLabel>
                    <Input
                      {...field}
                      id="personalEmail"
                      type="email"
                      placeholder="e.g. marcus@email.com"
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
            <Controller
              name="address"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="address">Address</FieldLabel>
                  <Textarea
                    {...field}
                    id="address"
                    placeholder="Full address"
                    rows={3}
                  />
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Controller
                name="emergencyContactName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="emergencyContactName">Name</FieldLabel>
                    <Input
                      {...field}
                      id="emergencyContactName"
                      placeholder="Contact name"
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="emergencyContactRelationship"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="emergencyContactRelationship">
                      Relationship
                    </FieldLabel>
                    <Input
                      {...field}
                      id="emergencyContactRelationship"
                      placeholder="e.g. Parent"
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="emergencyContactPhone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="emergencyContactPhone">
                      Phone
                    </FieldLabel>
                    <Input
                      {...field}
                      id="emergencyContactPhone"
                      type="tel"
                      placeholder="e.g. +44 7700 900001"
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Form Footer */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/players")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isUploading}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 size-4" />
              Creating...
            </>
          ) : (
            "Create Player"
          )}
        </Button>
      </div>
    </form>
  );
}
