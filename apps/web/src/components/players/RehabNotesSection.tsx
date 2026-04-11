"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  IconPencil,
  IconTrash,
  IconDots,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useTranslation } from "@/hooks/useTranslation";

interface RehabNotesSectionProps {
  injuryId: Id<"playerInjuries">;
}

export function RehabNotesSection({ injuryId }: RehabNotesSectionProps) {
  const { t } = useTranslation();
  const notes = useQuery(api.players.queries.getRehabNotes, { injuryId });
  const addNote = useMutation(api.players.mutations.addRehabNote);
  const updateNote = useMutation(api.players.mutations.updateRehabNote);
  const deleteNote = useMutation(api.players.mutations.deleteRehabNote);

  const [newNoteText, setNewNoteText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Add note
  // ---------------------------------------------------------------------------

  const handleAddNote = useCallback(async () => {
    if (!newNoteText.trim()) return;
    setIsSubmitting(true);
    try {
      await addNote({ injuryId, note: newNoteText });
      toast.success(t.rehabNotes.noteAdded);
      setNewNoteText("");
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? (error.data as any).message ?? "Error"
          : "Failed to add note";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [addNote, injuryId, newNoteText, t]);

  // ---------------------------------------------------------------------------
  // Edit note
  // ---------------------------------------------------------------------------

  const handleStartEdit = useCallback(
    (noteId: string, text: string) => {
      setEditingNoteId(noteId);
      setEditingText(text);
    },
    []
  );

  const handleCancelEdit = useCallback(() => {
    setEditingNoteId(null);
    setEditingText("");
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingNoteId || !editingText.trim()) return;
    try {
      await updateNote({
        noteId: editingNoteId as Id<"injuryRehabNotes">,
        note: editingText,
      });
      toast.success(t.rehabNotes.noteUpdated);
      setEditingNoteId(null);
      setEditingText("");
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? (error.data as any).message ?? "Error"
          : "Failed to update note";
      toast.error(message);
    }
  }, [updateNote, editingNoteId, editingText, t]);

  // ---------------------------------------------------------------------------
  // Delete note
  // ---------------------------------------------------------------------------

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingNoteId) return;
    try {
      await deleteNote({ noteId: deletingNoteId as Id<"injuryRehabNotes"> });
      toast.success(t.rehabNotes.noteDeleted);
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? (error.data as any).message ?? "Error"
          : "Failed to delete note";
      toast.error(message);
    } finally {
      setDeletingNoteId(null);
    }
  }, [deleteNote, deletingNoteId, t]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (notes === undefined) {
    return (
      <div className="space-y-2 py-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      <h4 className="text-sm font-semibold">{t.rehabNotes.title}</h4>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-muted-foreground text-xs">{t.rehabNotes.noNotes}</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => {
            const isEditing = editingNoteId === note._id;

            return (
              <div
                key={note._id}
                className="bg-muted/50 rounded-md border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{note.authorName}</span>
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(note.createdAt), "dd/MM/yyyy HH:mm")}
                        {note.updatedAt > note.createdAt && " (edited)"}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          maxLength={2000}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit} disabled={!editingText.trim()}>
                            {t.common.save}
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            {t.common.cancel}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs whitespace-pre-wrap">{note.note}</p>
                    )}
                  </div>

                  {!isEditing && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                          <IconDots className="size-3.5" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleStartEdit(note._id, note.note)}
                        >
                          <IconPencil className="mr-2 size-3.5" />
                          {t.rehabNotes.editNote}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeletingNoteId(note._id)}
                        >
                          <IconTrash className="mr-2 size-3.5" />
                          {t.rehabNotes.deleteNote}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add note form */}
      <div className="space-y-2">
        <Textarea
          placeholder={t.rehabNotes.notePlaceholder}
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          maxLength={2000}
          rows={3}
        />
        <Button
          size="sm"
          onClick={handleAddNote}
          disabled={!newNoteText.trim() || isSubmitting}
        >
          {isSubmitting ? t.common.loading : t.rehabNotes.saveNote}
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingNoteId} onOpenChange={(open) => !open && setDeletingNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.rehabNotes.deleteNote}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.rehabNotes.deleteConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              {t.common.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
