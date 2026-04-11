"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { STAFF_DEPARTMENTS } from "@packages/shared/staff";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const handlePhotoUpload = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, photo: "Image must be less than 5MB" }));
        return;
      }

      try {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await response.json();
        setPhoto(storageId);
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
      }
    },
    [generateUploadUrl]
  );

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* First Name */}
        <div className="space-y-2">
          <Label htmlFor="firstName">{t.staff.fields.firstName} *</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
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
            <SelectTrigger>
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
                  "w-full justify-start text-left font-normal",
                  !dateJoined && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 size-4" />
                {dateJoined ? format(dateJoined, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateJoined}
                onSelect={setDateJoined}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Photo */}
        <div className="space-y-2">
          <Label>{t.staff.fields.photo}</Label>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
          />
          {photo && (
            <p className="text-muted-foreground text-xs">Photo uploaded</p>
          )}
          {errors.photo && (
            <p className="text-destructive text-sm">{errors.photo}</p>
          )}
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
          rows={4}
          maxLength={5000}
        />
        {errors.bio && (
          <p className="text-destructive text-sm">{errors.bio}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t.common.loading : submitLabel}
        </Button>
      </div>
    </form>
  );
}
