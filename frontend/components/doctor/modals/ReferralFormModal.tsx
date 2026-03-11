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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowRightLeft } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReferralFormState {
  patient_id: string;
  referred_doctor_id: string;
  reason: string;
}

interface ReferralFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: ReferralFormState;
  onPatch: (patch: Partial<ReferralFormState>) => void;
  submitting: boolean;
  onSubmit: () => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReferralFormModal({
  isOpen,
  onClose,
  form,
  onPatch,
  submitting,
  onSubmit,
}: ReferralFormModalProps) {
  const isValid =
    form.patient_id.trim() &&
    form.referred_doctor_id.trim() &&
    form.reason.trim();

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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
              <ArrowRightLeft className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Refer Patient
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Send a referral to another doctor for a patient in your care.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Patient ID */}
          <div className="space-y-1.5">
            <Label htmlFor="referral_patient_id" className="text-xs font-medium">
              Patient Profile ID
            </Label>
            <Input
              id="referral_patient_id"
              required
              placeholder="Patient profile ID"
              value={form.patient_id}
              onChange={(e) => onPatch({ patient_id: e.target.value })}
              className="h-9 text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Copy this from the patient&apos;s profile card in My Patients.
            </p>
          </div>

          {/* Referred Doctor ID */}
          <div className="space-y-1.5">
            <Label
              htmlFor="referred_doctor_id"
              className="text-xs font-medium"
            >
              Referred Doctor Profile ID
            </Label>
            <Input
              id="referred_doctor_id"
              required
              placeholder="Doctor profile ID"
              value={form.referred_doctor_id}
              onChange={(e) => onPatch({ referred_doctor_id: e.target.value })}
              className="h-9 text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              The receiving doctor must share their profile ID with you.
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="referral_reason" className="text-xs font-medium">
              Reason for Referral
            </Label>
            <Textarea
              id="referral_reason"
              required
              placeholder="Describe why you are referring this patient…"
              value={form.reason}
              onChange={(e) => onPatch({ reason: e.target.value })}
              rows={3}
              className="resize-none text-sm"
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
              className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-600 dark:hover:bg-violet-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Send Referral
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
