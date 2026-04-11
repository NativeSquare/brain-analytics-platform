"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@packages/backend/convex/_generated/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

import type { Id } from "@packages/backend/convex/_generated/dataModel";

import {
  contactInfoSchema,
  type ContactInfoFormData,
} from "./contactInfoSchema";

interface ContactInfoEditDialogProps {
  player: {
    phone?: string;
    personalEmail?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactRelationship?: string;
    emergencyContactPhone?: string;
  };
  open: boolean;
  onClose: () => void;
  /** When true, calls admin mutation instead of self-service. Story 12.3 AC #6. */
  isAdmin?: boolean;
  /** Required when isAdmin is true — the player to update. */
  playerId?: Id<"players">;
}

/**
 * Self-service contact info edit dialog for players.
 *
 * Story 5.6 AC #9: Only contact fields are editable.
 * Story 5.6 AC #11: Shows success toast and closes on save.
 */
export function ContactInfoEditDialog({
  player,
  open,
  onClose,
  isAdmin,
  playerId,
}: ContactInfoEditDialogProps) {
  const updateOwnContact = useMutation(
    api.players.mutations.updateOwnContactInfo
  );
  const updatePlayerContact = useMutation(
    api.players.mutations.updatePlayerContactInfo
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ContactInfoFormData>({
    resolver: zodResolver(contactInfoSchema),
    defaultValues: {
      phone: player.phone ?? "",
      personalEmail: player.personalEmail ?? "",
      address: player.address ?? "",
      emergencyContactName: player.emergencyContactName ?? "",
      emergencyContactRelationship: player.emergencyContactRelationship ?? "",
      emergencyContactPhone: player.emergencyContactPhone ?? "",
    },
  });

  // Reset form when dialog opens with fresh player data.
  // Only depend on `open` — captures latest `player` at open-time without
  // resetting mid-edit when Convex pushes an unrelated player update.
  const playerRef = React.useRef(player);
  playerRef.current = player;

  React.useEffect(() => {
    if (open) {
      const p = playerRef.current;
      form.reset({
        phone: p.phone ?? "",
        personalEmail: p.personalEmail ?? "",
        address: p.address ?? "",
        emergencyContactName: p.emergencyContactName ?? "",
        emergencyContactRelationship: p.emergencyContactRelationship ?? "",
        emergencyContactPhone: p.emergencyContactPhone ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (data: ContactInfoFormData) => {
    setIsSubmitting(true);
    try {
      // Clean empty strings to undefined for the mutation
      const contactFields = {
        phone: data.phone || undefined,
        personalEmail: data.personalEmail || undefined,
        address: data.address || undefined,
        emergencyContactName: data.emergencyContactName || undefined,
        emergencyContactRelationship:
          data.emergencyContactRelationship || undefined,
        emergencyContactPhone: data.emergencyContactPhone || undefined,
      };

      if (isAdmin && playerId) {
        await updatePlayerContact({ playerId, ...contactFields });
      } else {
        await updateOwnContact(contactFields);
      }
      toast.success("Contact information updated");
      onClose();
    } catch (error) {
      if (error instanceof ConvexError) {
        const errorData = error.data as { code?: string; message?: string };
        toast.error(
          errorData.message ?? "Failed to update contact information"
        );
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Contact Information</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="phone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid || undefined}
                  >
                    <FieldLabel htmlFor="ci-phone">Phone</FieldLabel>
                    <Input
                      {...field}
                      id="ci-phone"
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
                  <Field
                    data-invalid={fieldState.invalid || undefined}
                  >
                    <FieldLabel htmlFor="ci-email">
                      Personal Email
                    </FieldLabel>
                    <Input
                      {...field}
                      id="ci-email"
                      type="email"
                      placeholder="e.g. name@email.com"
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
                <Field
                  data-invalid={fieldState.invalid || undefined}
                >
                  <FieldLabel htmlFor="ci-address">Address</FieldLabel>
                  <Textarea
                    {...field}
                    id="ci-address"
                    placeholder="Full address"
                    rows={3}
                  />
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <div className="border-t pt-4">
              <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Emergency Contact
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Controller
                  name="emergencyContactName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field
                      data-invalid={fieldState.invalid || undefined}
                    >
                      <FieldLabel htmlFor="ci-ec-name">Name</FieldLabel>
                      <Input
                        {...field}
                        id="ci-ec-name"
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
                    <Field
                      data-invalid={fieldState.invalid || undefined}
                    >
                      <FieldLabel htmlFor="ci-ec-rel">
                        Relationship
                      </FieldLabel>
                      <Input
                        {...field}
                        id="ci-ec-rel"
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
                    <Field
                      data-invalid={fieldState.invalid || undefined}
                    >
                      <FieldLabel htmlFor="ci-ec-phone">
                        Phone
                      </FieldLabel>
                      <Input
                        {...field}
                        id="ci-ec-phone"
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
            </div>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
