"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import {
  IconFileText,
  IconDownload,
  IconUpload,
  IconPencil,
  IconLoader2,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ContractCardProps {
  playerId: Id<"players">;
}

/**
 * Contract card component with security-aware read-only mode.
 *
 * Story 6.2 AC4: readOnly === true → hide upload/edit/replace buttons, display-only fields.
 * Story 6.2 AC4: readOnly === false (admin) → show full edit/upload/replace functionality.
 * Story 6.2 AC4: "Download PDF" button visible in both modes.
 */
export function ContractCard({ playerId }: ContractCardProps) {
  const contract = useQuery(api.contracts.queries.getContract, { playerId });
  const downloadUrl = useQuery(api.contracts.queries.getContractDownloadUrl, {
    playerId,
  });

  // Loading state
  if (contract === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <IconLoader2 className="text-muted-foreground mb-3 size-10 animate-spin" />
        <p className="text-muted-foreground text-sm">Loading contract data…</p>
      </div>
    );
  }

  // No contract uploaded yet
  if (contract === null) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <IconFileText className="text-muted-foreground mb-3 size-10" />
            <h3 className="text-lg font-medium">No Contract Uploaded</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              No contract has been uploaded for this player yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { readOnly, extractionStatus, extractedData } = contract;

  return (
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
              <Button variant="outline" size="sm" disabled>
                <IconUpload className="mr-1 size-4" />
                Replace Contract
              </Button>
            )}
          </div>
        </div>

        {/* Extracted fields */}
        {extractedData ? (
          <div>
            {/* Story 6.2 AC4: Admin sees edit button; player-self sees static text only */}
            {!readOnly && (
              <div className="mb-4 flex justify-end">
                <Button variant="outline" size="sm" disabled>
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
        ) : (
          <div className="py-6 text-center">
            <p className="text-muted-foreground text-sm">
              {extractionStatus === "pending" || extractionStatus === "processing"
                ? "Contract data is being extracted…"
                : extractionStatus === "failed"
                  ? "Extraction failed. An admin can re-upload the contract."
                  : "No extracted data available."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
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
      <dd className="mt-0.5 font-medium">{value ?? "—"}</dd>
    </div>
  );
}

function ExtractionStatusBadge({
  status,
}: {
  status: "pending" | "processing" | "completed" | "failed";
}) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    processing: "secondary",
    completed: "default",
    failed: "destructive",
  };

  const labels: Record<string, string> = {
    pending: "Pending",
    processing: "Processing",
    completed: "Extracted",
    failed: "Failed",
  };

  return (
    <Badge variant={variants[status] ?? "secondary"}>
      {labels[status] ?? status}
    </Badge>
  );
}
