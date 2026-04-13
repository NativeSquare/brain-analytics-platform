"use client";

import * as React from "react";
import { format } from "date-fns";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { STAFF_DEPARTMENTS } from "@packages/shared/staff";
import { IconCalendar, IconUpload, IconX, IconPhoto } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

export interface StaffFormData {
  firstName: string;
  lastName: string;
  photo?: string;
  jobTitle: string;
  department: string;
  phone?: string;
  email?: string;
  bio?: string;
  dateJoined?: number;
}

interface StaffFormProps {
  initialData?: StaffFormData;
  onSubmit: (data: StaffFormData) => Promise<void>;
  submitLabel: string;
  isSubmitting: boolean;
}

export function StaffForm({
  initialData,
  onSubmit,
  submitLabel,
  isSubmitting,
}: StaffFormProps) {
  const { t } = useTranslation();
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const [firstName, setFirstName] = React.useState(
    initialData?.firstName ?? ""
  );
  const [lastName, setLastName] = React.useState(
    initialData?.lastName ?? ""
  );
  const [jobTitle, setJobTitle] = React.useState(
    initialData?.jobTitle ?? ""
  );
  const [department, setDepartment] = React.useState(
    initialData?.department ?? ""
  );
  const [phone, setPhone] = React.useState(initialData?.phone ?? "");
  const [email, setEmail] = React.useState(initialData?.email ?? "");
  const [bio, setBio] = React.useState(initialData?.bio ?? "");
  const [dateJoined, setDateJoined] = React.useState<Date | undefined>(
    initialData?.dateJoined
      ? new Date(initialData.dateJoined)
      : undefined
  );
  const [photo, setPhoto] = React.useState<string | undefined>(
    initialData?.photo
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);

  const handlePhotoUpload = React.useCallback(
    async (file: File) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setErrors((prev) => ({ ...prev, photo: "Only JPEG, PNG, and WebP images are supported" }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, photo: "Image must be less than 5MB" }));
        return;
      }

      setIsUploading(true);
      try {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await response.json();
        setPhoto(storageId);
        setPhotoPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(file);
        });
        setErrors((prev) => {
          const next = { ...prev };
          delete next.photo;
          return next;
        });
      } catch {
        setErrors((prev) => ({
          ...prev,
          photo: "Failed to upload photo",
        }));
      } finally {
        setIsUploading(false);
      }
    },
    [generateUploadUrl]
  );

  const removePhoto = React.useCallback(() => {
    setPhoto(undefined);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  }, [photoPreview]);

  const validate = React.useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!jobTitle.trim()) newErrors.jobTitle = "Job title is required";
    if (!department) newErrors.department = "Department is required";
    if (bio.length > 5000) newErrors.bio = "Biography cannot exceed 5000 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [firstName, lastName, jobTitle, department, bio]);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        photo,
        jobTitle: jobTitle.trim(),
        department,
        phone: phone || undefined,
        email: email || undefined,
        bio: bio || undefined,
        dateJoined: dateJoined ? dateJoined.getTime() : undefined,
      });
    },
    [
      validate,
      onSubmit,
      firstName,
      lastName,
      photo,
      jobTitle,
      department,
      phone,
      email,
      bio,
      dateJoined,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Photo upload */}
      <div className="space-y-2">
        <Label>{t.staff.fields.photo}</Label>
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
            <label className="flex size-20 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-muted-foreground/50">
              {isUploading ? (
                <Spinner className="size-5" />
              ) : (
                <IconPhoto className="text-muted-foreground size-6" />
              )}
              <input
                ref={fileInputRef}
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
        {errors.photo && (
          <p className="text-destructive text-sm">{errors.photo}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* First Name */}
        <div className="space-y-2">
          <Label htmlFor="firstName">{t.staff.fields.firstName} *</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="bg-white dark:bg-card"
            required
          />
          {errors.firstName && (
            <p className="text-destructive text-sm">{errors.firstName}</p>
          )}
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <Label htmlFor="lastName">{t.staff.fields.lastName} *</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="bg-white dark:bg-card"
            required
          />
          {errors.lastName && (
            <p className="text-destructive text-sm">{errors.lastName}</p>
          )}
        </div>

        {/* Job Title */}
        <div className="space-y-2">
          <Label htmlFor="jobTitle">{t.staff.fields.jobTitle} *</Label>
          <Input
            id="jobTitle"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="bg-white dark:bg-card"
            required
          />
          {errors.jobTitle && (
            <p className="text-destructive text-sm">{errors.jobTitle}</p>
          )}
        </div>

        {/* Department */}
        <div className="space-y-2">
          <Label>{t.staff.fields.department} *</Label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="bg-white dark:bg-card">
              <SelectValue placeholder={t.staff.filterByDepartment} />
            </SelectTrigger>
            <SelectContent>
              {STAFF_DEPARTMENTS.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.department && (
            <p className="text-destructive text-sm">{errors.department}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">{t.staff.fields.phone}</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="bg-white dark:bg-card"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">{t.staff.fields.email}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white dark:bg-card"
          />
        </div>

        {/* Date Joined */}
        <div className="space-y-2">
          <Label>{t.staff.fields.dateJoined}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start bg-white text-left font-normal dark:bg-card",
                  !dateJoined && "text-muted-foreground"
                )}
              >
                <IconCalendar className="mr-2 size-4" />
                {dateJoined ? format(dateJoined, "dd/MM/yyyy") : "dd/mm/yyyy"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateJoined}
                onSelect={setDateJoined}
                captionLayout="dropdown"
                fromYear={1970}
                toYear={new Date().getFullYear()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="bio">{t.staff.fields.bio}</Label>
          <span className="text-muted-foreground text-xs">
            {bio.length}/5000
          </span>
        </div>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="bg-white dark:bg-card"
          rows={4}
          maxLength={5000}
        />
        {errors.bio && (
          <p className="text-destructive text-sm">{errors.bio}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting || isUploading}>
          {isSubmitting ? t.common.loading : submitLabel}
        </Button>
      </div>
    </form>
  );
}
