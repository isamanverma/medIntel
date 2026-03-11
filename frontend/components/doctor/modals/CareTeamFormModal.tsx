"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UsersRound } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CareTeamFormState {
  patient_id: string;
  name: string;
  description: string;
}

interface CareTeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: CareTeamFormState;
  onPatch: (patch: Partial<CareTeamFormState>) => void;
  submitting: boolean;
  onSubmit: () => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CareTeamFormModal({
  isOpen,
  onClose,
  form,
  onPatch,
  submitting,
  onSubmit,
}: CareTeamFormModalProps) {
  const isValid = form.patient_id.trim() && form.name.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    await onSubmit();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
              <UsersRound className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Create Care Team
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Assemble a multi-doctor team to collaborate on a patient&apos;s
                care.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Patient ID */}
          <div className="space-y-1.5">
            <Label htmlFor="ct_patient_id" className="text-xs font-medium">
              Patient Profile ID
            </Label>
            <Input
              id="ct_patient_id"
              required
              placeholder="Patient profile ID"
              value={form.patient_id}
              onChange={(e) => onPatch({ patient_id: e.target.value })}
              className="h-9 text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Copy from the patient card in My Patients.
            </p>
          </div>

          {/* Team name */}
          <div className="space-y-1.5">
            <Label htmlFor="ct_name" className="text-xs font-medium">
              Team Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ct_name"
              required
              placeholder="e.g. Cardiac Care Team"
              value={form.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              className="h-9 text-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ct_description" className="text-xs font-medium">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="ct_description"
              placeholder="Brief description of the team's focus"
              value={form.description}
              onChange={(e) => onPatch({ description: e.target.value })}
              className="h-9 text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !isValid}
              className="flex-1 gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <UsersRound className="h-3.5 w-3.5" />
                  Create Team
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
