"use client";

import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventForm } from "@/components/calendar/EventForm";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEventDialog({ open, onOpenChange }: CreateEventDialogProps) {
  function handleSuccess() {
    toast.success("Event created");
    onOpenChange(false);
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Create Event</DialogTitle>
          <DialogDescription>
            Schedule a new event for your team.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6 pb-6">
          <EventForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
