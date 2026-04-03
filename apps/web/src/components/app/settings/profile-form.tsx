"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@packages/backend/convex/_generated/api"
import type { Id } from "@packages/backend/convex/_generated/dataModel"
import { toast } from "sonner"
import { IconPhotoPlus, IconUpload } from "@tabler/icons-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { useTranslation } from "@/hooks/useTranslation"
import type { Locale } from "@/lib/i18n"

function getInitials(name: string): string {
  const segments = name.trim().split(/\s+/).filter(Boolean)
  if (segments.length === 0) return "U"
  if (segments.length === 1) return segments[0].slice(0, 2).toUpperCase()
  return `${segments[0][0]}${segments[1][0]}`.toUpperCase()
}

interface ProfileFormProps {
  fullName: string
  avatarUrl: string | null
  preferredLanguage: string | null
}

export function ProfileForm({ fullName, avatarUrl, preferredLanguage }: ProfileFormProps) {
  const { t } = useTranslation()
  const updateProfile = useMutation(api.users.mutations.updateProfile)
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [nameValue, setNameValue] = useState(fullName)
  const [languageValue, setLanguageValue] = useState<Locale>(
    (preferredLanguage as Locale) ?? "en"
  )
  const [isSaving, setIsSaving] = useState(false)

  // Sync values when user data changes externally
  useEffect(() => {
    setNameValue(fullName)
  }, [fullName])

  useEffect(() => {
    setLanguageValue((preferredLanguage as Locale) ?? "en")
  }, [preferredLanguage])

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl)
      }
    }
  }, [previewObjectUrl])

  const applyAvatarFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(t.account.selectImage)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t.account.imageTooLarge)
      return
    }

    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl)
    }

    setPreviewObjectUrl(URL.createObjectURL(file))
    setSelectedFileName(file.name)
    setSelectedFile(file)
  }

  const avatarSrc = previewObjectUrl ?? avatarUrl ?? undefined

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = nameValue.trim()
    if (!trimmedName) {
      toast.error(t.account.nameRequired)
      return
    }

    setIsSaving(true)
    try {
      let avatarStorageId: Id<"_storage"> | undefined

      // Upload avatar if a new file was selected
      if (selectedFile) {
        const uploadUrl = await generateUploadUrl()
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        })
        if (!result.ok) {
          throw new Error("Failed to upload avatar")
        }
        const { storageId } = (await result.json()) as {
          storageId: Id<"_storage">
        }
        avatarStorageId = storageId
      }

      await updateProfile({
        fullName: trimmedName,
        avatarStorageId,
        preferredLanguage: languageValue,
      })

      // Reset file selection state after successful save
      setSelectedFile(null)
      setSelectedFileName(null)
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl)
        setPreviewObjectUrl(null)
      }

      toast.success(t.account.profileUpdated)
    } catch {
      toast.error(t.account.profileUpdateError)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">{t.account.fullName}</Label>
        <Input
          id="fullName"
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>{t.account.avatar}</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              applyAvatarFile(file)
            }
          }}
        />

        <button
          type="button"
          className={`w-full rounded-xl border-2 border-dashed p-4 text-left transition ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault()
            setIsDragOver(true)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            setIsDragOver(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragOver(false)
            const file = event.dataTransfer.files?.[0]
            if (file) {
              applyAvatarFile(file)
            }
          }}
        >
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={avatarSrc} alt={nameValue} />
              <AvatarFallback>{getInitials(nameValue)}</AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <p className="text-sm font-medium">{t.account.avatarCurrent}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <IconPhotoPlus className="size-4" />
                <span>{t.account.avatarDrop}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <IconUpload className="size-3.5" />
                <span>
                  {selectedFileName ?? t.account.avatarHint}
                </span>
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="language">{t.account.language}</Label>
        <p className="text-sm text-muted-foreground">
          {t.account.languageDescription}
        </p>
        <Select
          value={languageValue}
          onValueChange={(value) => setLanguageValue(value as Locale)}
        >
          <SelectTrigger id="language" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">{t.account.english}</SelectItem>
            <SelectItem value="it">{t.account.italian}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isSaving}>
        {isSaving ? (
          <>
            <Spinner className="mr-2 size-4" />
            {t.account.saving}
          </>
        ) : (
          t.common.save
        )}
      </Button>
    </form>
  )
}
