"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  IconFileText,
  IconDownload,
  IconUpload,
  IconPencil,
  IconLoader2,
  IconAlertTriangle,
  IconCheck,
  IconX,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContractUploadDialog } from "./ContractUploadDialog";
import { getConvexErrorMessage } from "@/utils/getConvexErrorMessage";

// ---------------------------------------------------------------------------
// Edit form schema
// ---------------------------------------------------------------------------

const contractFieldsSchema = z.object({
  salary: z.string(),
  bonuses: z.string(),
  clauses: z.string(),
  duration: z.string(),
  terminationTerms: z.string(),
  governingLaw: z.string(),
});

type ContractFieldsForm = z.infer<typeof contractFieldsSchema>;

// ---------------------------------------------------------------------------
// ContractCard
// ---------------------------------------------------------------------------

interface ContractCardProps {
  playerId: Id<"players">;
  isAdmin?: boolean;
}

/**
 * Contract card component with security-aware read-only mode.
 *
 * Story 6.2 AC4: readOnly === true → hide upload/edit/replace buttons, display-only fields.
 * Story 6.2 AC4: readOnly === false (admin) → show full edit/upload/replace functionality.
 * Story 6.2 AC4: "Download PDF" button visible in both modes.
 */
export function ContractCard({ playerId, isAdmin = false }: ContractCardProps) {
  const contract = useQuery(api.contracts.queries.getContract, { playerId });
  const downloadUrl = useQuery(api.contracts.queries.getContractDownloadUrl, {
    playerId,
  });

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  // Loading state
  if (contract === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <IconLoader2 className="text-muted-foreground mb-3 size-10 animate-spin" />
        <p className="text-muted-foreground text-sm">Loading contract data...</p>
      </div>
    );
  }

  // No contract uploaded yet
  if (contract === null) {
    return (
      <>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <IconFileText className="text-muted-foreground mb-3 size-10" />
              <h3 className="text-lg font-medium">No Contract Uploaded</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                No contract has been uploaded for this player yet.
              </p>
              {isAdmin && (
                <Button
                  className="mt-4"
                  onClick={() => setUploadOpen(true)}
                >
                  <IconUpload className="mr-1 size-4" />
                  Upload Contract
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <ContractUploadDialog
            open={uploadOpen}
            onOpenChange={setUploadOpen}
            playerId={playerId}
          />
        )}
      </>
    );
  }

  const { readOnly, extractionStatus, extractedData, extractionError } = contract;

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          {/* Header row: status badge + action buttons */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Contract Details</h3>
              <ExtractionStatusBadge status={extractionStatus} />
            </div>

            <div className="flex items-center gap-2">
              {/* Story 6.2 AC4: Download PDF visible in both admin and player-self modes */}
              {downloadUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                    <IconDownload className="mr-1 size-4" />
                    Download PDF
                  </a>
                </Button>
              )}

              {/* Story 6.2 AC4: Upload/Replace only visible when readOnly === false (admin) */}
              {!readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadOpen(true)}
                >
                  <IconUpload className="mr-1 size-4" />
                  Replace Contract
                </Button>
              )}
            </div>
          </div>

          {/* Extraction status feedback */}
          {(extractionStatus === "pending" || extractionStatus === "processing") && (
            <div className="bg-muted/50 mb-4 flex items-center gap-3 rounded-lg p-4">
              <IconLoader2 className="text-primary size-5 animate-spin shrink-0" />
              <p className="text-sm">
                Extracting contract data... This may take a few moments.
              </p>
            </div>
          )}

          {extractionStatus === "failed" && (
            <div className="bg-destructive/10 mb-4 flex items-center gap-3 rounded-lg p-4">
              <IconAlertTriangle className="text-destructive size-5 shrink-0" />
              <div className="flex-1">
                <p className="text-destructive text-sm font-medium">
                  Extraction failed
                </p>
                {extractionError && (
                  <p className="text-destructive/80 mt-0.5 text-xs">
                    {extractionError}
                  </p>
                )}
              </div>
              {!readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadOpen(true)}
                >
                  Re-upload
                </Button>
              )}
            </div>
          )}

          {/* Extracted fields */}
          {extractedData ? (
            isEditing && !readOnly ? (
              <ContractEditForm
                playerId={playerId}
                extractedData={extractedData}
                onCancel={() => setIsEditing(false)}
                onSaved={() => setIsEditing(false)}
              />
            ) : (
              <div>
                {/* Story 6.2 AC4: Admin sees edit button; player-self sees static text only */}
                {!readOnly && (
                  <div className="mb-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <IconPencil className="mr-1 size-4" />
                      Edit Fields
                    </Button>
                  </div>
                )}

                <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                  <ContractField label="Salary" value={extractedData.salary} />
                  <ContractField label="Bonuses" value={extractedData.bonuses} />
                  <ContractField label="Duration" value={extractedData.duration} />
                  <ContractField label="Clauses" value={extractedData.clauses} />
                  <ContractField
                    label="Termination Terms"
                    value={extractedData.terminationTerms}
                  />
                  <ContractField
                    label="Governing Law"
                    value={extractedData.governingLaw}
                  />
                </dl>
              </div>
            )
          ) : (
            <div className="py-6 text-center">
              <p className="text-muted-foreground text-sm">
                {extractionStatus === "pending" || extractionStatus === "processing"
                  ? "Contract data is being extracted..."
                  : extractionStatus === "failed"
                    ? "Extraction failed. An admin can re-upload the contract."
                    : "No extracted data available."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ContractUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        playerId={playerId}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// ContractEditForm
// ---------------------------------------------------------------------------

function ContractEditForm({
  playerId,
  extractedData,
  onCancel,
  onSaved,
}: {
  playerId: Id<"players">;
  extractedData: {
    salary?: string | null;
    bonuses?: string | null;
    clauses?: string | null;
    duration?: string | null;
    terminationTerms?: string | null;
    governingLaw?: string | null;
  };
  onCancel: () => void;
  onSaved: () => void;
}) {
  const updateContractFields = useMutation(
    api.contracts.mutations.updateContractFields,
  );

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ContractFieldsForm>({
    resolver: zodResolver(contractFieldsSchema),
    defaultValues: {
      salary: extractedData.salary ?? "",
      bonuses: extractedData.bonuses ?? "",
      clauses: extractedData.clauses ?? "",
      duration: extractedData.duration ?? "",
      terminationTerms: extractedData.terminationTerms ?? "",
      governingLaw: extractedData.governingLaw ?? "",
    },
  });

  async function onSubmit(data: ContractFieldsForm) {
    try {
      // Convert empty strings to undefined
      const cleaned: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries(data)) {
        cleaned[key] = value?.trim() || undefined;
      }

      await updateContractFields({
        playerId,
        extractedData: cleaned as {
          salary?: string;
          bonuses?: string;
          clauses?: string;
          duration?: string;
          terminationTerms?: string;
          governingLaw?: string;
        },
      });

      toast.success("Contract fields updated");
      onSaved();
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    }
  }

  const fields = [
    { name: "salary" as const, label: "Salary" },
    { name: "bonuses" as const, label: "Bonuses" },
    { name: "duration" as const, label: "Duration" },
    { name: "clauses" as const, label: "Clauses" },
    { name: "terminationTerms" as const, label: "Termination Terms" },
    { name: "governingLaw" as const, label: "Governing Law" },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map(({ name, label }) => (
          <div key={name} className="space-y-1.5">
            <Label htmlFor={`contract-${name}`}>{label}</Label>
            <Input
              id={`contract-${name}`}
              {...register(name)}
              placeholder={`Enter ${label.toLowerCase()}`}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <IconX className="mr-1 size-4" />
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? (
            <IconLoader2 className="mr-1 size-4 animate-spin" />
          ) : (
            <IconCheck className="mr-1 size-4" />
          )}
          Save
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ContractField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="mt-0.5 font-medium">{value ?? "\u2014"}</dd>
    </div>
  );
}

const EXTRACTION_STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  processing: "secondary",
  completed: "default",
  failed: "destructive",
};

const EXTRACTION_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Extracted",
  failed: "Failed",
};

function ExtractionStatusBadge({
  status,
}: {
  status: "pending" | "processing" | "completed" | "failed";
}) {
  return (
    <Badge variant={EXTRACTION_STATUS_VARIANTS[status] ?? "secondary"}>
      {EXTRACTION_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
