"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").transform((v) => v.trim()),
});

interface FolderCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: Id<"folders">;
}

export function FolderCreateDialog({
  open,
  onOpenChange,
  parentId,
}: FolderCreateDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const createFolder = useMutation(api.documents.mutations.createFolder);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await createFolder({ name: data.name, parentId });
      toast.success(parentId ? "Subfolder created" : "Category created");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{parentId ? "New Subfolder" : "New Category"}</DialogTitle>
          <DialogDescription>
            {parentId
              ? "Create a new subfolder within this category."
              : "Create a new document category."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="py-4">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input
                placeholder={parentId ? "Subfolder name" : "Category name"}
                {...form.register("name")}
                autoFocus
              />
              {form.formState.errors.name && (
                <FieldError>{form.formState.errors.name.message}</FieldError>
              )}
            </Field>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
