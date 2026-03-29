"use client";

import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import {
  IconPlug,
  IconPlus,
  IconPencil,
  IconTrash,
  IconDots,
  IconInfoCircle,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";

// ---------------------------------------------------------------------------
// Zod schema for the provider form (Story 5.7 AC #2, #4)
// ---------------------------------------------------------------------------

const providerFormSchema = z.object({
  provider: z.string().trim().min(1, "Provider name is required"),
  accountId: z.string().trim().min(1, "Account ID or URL is required"),
});

type ProviderFormData = z.infer<typeof providerFormSchema>;

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

interface ExternalProvidersProps {
  playerId: Id<"players">;
  playerName?: string;
}

// ---------------------------------------------------------------------------
// ExternalProviders component (Story 5.7 AC #1–#9)
// ---------------------------------------------------------------------------

export function ExternalProviders({ playerId, playerName }: ExternalProvidersProps) {
  const data = useQuery(api.players.queries.getExternalProviders, { playerId });
  const updateProviders = useMutation(api.players.mutations.updateExternalProviders);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // Loading state
  if (data === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const { providers, canEdit } = data;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleAdd() {
    setEditIndex(null);
    setDialogOpen(true);
  }

  function handleEdit(index: number) {
    setEditIndex(index);
    setDialogOpen(true);
  }

  function handleDeleteRequest(index: number) {
    setDeleteIndex(index);
  }

  async function handleSubmit(formData: ProviderFormData) {
    const newEntry = {
      provider: formData.provider.trim(),
      accountId: formData.accountId.trim(),
    };

    // Client-side uniqueness check (AC #2, #4)
    const isDuplicate = providers.some(
      (p, i) =>
        i !== editIndex &&
        p.provider.toLowerCase() === newEntry.provider.toLowerCase()
    );
    if (isDuplicate) {
      toast.error("This provider is already linked");
      return;
    }

    let updatedProviders;
    if (editIndex !== null) {
      // Edit mode (AC #4)
      updatedProviders = providers.map((p, i) =>
        i === editIndex ? newEntry : p
      );
    } else {
      // Add mode (AC #2)
      updatedProviders = [...providers, newEntry];
    }

    try {
      await updateProviders({
        playerId,
        externalProviderLinks: updatedProviders,
      });
      toast.success(editIndex !== null ? "Provider updated" : "Provider linked");
      setDialogOpen(false);
      setEditIndex(null);
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    }
  }

  async function handleDeleteConfirm() {
    if (deleteIndex === null) return;

    const remainingProviders = providers.filter((_, i) => i !== deleteIndex);

    try {
      await updateProviders({
        playerId,
        externalProviderLinks: remainingProviders,
      });
      toast.success("Provider removed");
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    } finally {
      setDeleteIndex(null);
    }
  }

  const deleteProviderName = deleteIndex !== null ? providers[deleteIndex]?.provider : "";

  return (
    <div className="space-y-4">
      {/* AC #8: Info banner */}
      <Alert>
        <IconInfoCircle className="size-4" />
        <AlertDescription>
          External provider links are saved for future integrations. No data is
          imported automatically at this time.
        </AlertDescription>
      </Alert>

      {/* Provider list section */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-medium">Linked Providers</h3>
            {canEdit && (
              <Button size="sm" onClick={handleAdd}>
                <IconPlus className="mr-1 size-4" />
                Add Provider
              </Button>
            )}
          </div>

          {providers.length === 0 ? (
            /* AC #3: Empty state */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IconPlug className="text-muted-foreground mb-3 size-10" />
              <h4 className="text-lg font-medium">No external providers linked</h4>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                Link GPS trackers, performance platforms, and other services to
                this player.
              </p>
              {canEdit && (
                <Button className="mt-4" variant="outline" onClick={handleAdd}>
                  <IconPlus className="mr-1 size-4" />
                  Link Provider
                </Button>
              )}
            </div>
          ) : (
            /* AC #3: Provider list sorted alphabetically */
            <div className="divide-y">
              {providers.map((entry, index) => (
                <div
                  key={`${entry.provider}-${index}`}
                  className="flex items-center justify-between py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{entry.provider}</p>
                    <p className="text-muted-foreground truncate text-sm">
                      {entry.accountId}
                    </p>
                  </div>
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <IconDots className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(index)}>
                          <IconPencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteRequest(index)}
                          className="text-destructive"
                        >
                          <IconTrash className="mr-2 size-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AC #2, #4: Add/Edit dialog */}
      <ProviderFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditIndex(null);
        }}
        editMode={editIndex !== null}
        defaultValues={
          editIndex !== null
            ? {
                provider: providers[editIndex].provider,
                accountId: providers[editIndex].accountId,
              }
            : undefined
        }
        onSubmit={handleSubmit}
      />

      {/* AC #5: Delete confirmation dialog */}
      <AlertDialog
        open={deleteIndex !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteIndex(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteProviderName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unlink this provider from{" "}
              {playerName ?? "this player"}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProviderFormDialog (AC #2, #4, Story 5.7 Task 3.7)
// ---------------------------------------------------------------------------

interface ProviderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMode: boolean;
  defaultValues?: ProviderFormData;
  onSubmit: (data: ProviderFormData) => Promise<void>;
}

function ProviderFormDialog({
  open,
  onOpenChange,
  editMode,
  defaultValues,
  onSubmit,
}: ProviderFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProviderFormData>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: defaultValues ?? { provider: "", accountId: "" },
  });

  // Reset form when dialog opens/closes or defaults change
  React.useEffect(() => {
    if (open) {
      reset(defaultValues ?? { provider: "", accountId: "" });
    }
  }, [open, defaultValues, reset]);

  const handleFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editMode ? "Edit Provider" : "Link Provider"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="provider">Provider Name</FieldLabel>
            <Input
              id="provider"
              placeholder="e.g. Catapult, GPS Sports, Hudl"
              {...register("provider")}
              aria-invalid={!!errors.provider}
            />
            {errors.provider && (
              <FieldError>{errors.provider.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="accountId">Account ID / URL</FieldLabel>
            <Input
              id="accountId"
              placeholder="e.g. player-123 or https://..."
              {...register("accountId")}
              aria-invalid={!!errors.accountId}
            />
            {errors.accountId && (
              <FieldError>{errors.accountId.message}</FieldError>
            )}
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving…"
                : editMode
                  ? "Save Changes"
                  : "Link Provider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
