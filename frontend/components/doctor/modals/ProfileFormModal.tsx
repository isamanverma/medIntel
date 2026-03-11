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
import { Loader2, Stethoscope } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DoctorProfileFormState {
  first_name: string;
  last_name: string;
  specialization: string;
  license_number: string;
}

interface ProfileFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  form: DoctorProfileFormState;
  onPatch: (patch: Partial<DoctorProfileFormState>) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfileFormModal({
  isOpen,
  onClose,
  isEditing,
  form,
  onPatch,
  submitting,
  onSubmit,
}: ProfileFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
              <Stethoscope className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {isEditing ? "Edit Doctor Profile" : "Complete Your Profile"}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {isEditing
                  ? "Update your professional information."
                  : "Add your details to start managing patients."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name" className="text-xs font-medium">
                First Name
              </Label>
              <Input
                id="first_name"
                required
                placeholder="Jane"
                value={form.first_name}
                onChange={(e) => onPatch({ first_name: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name" className="text-xs font-medium">
                Last Name
              </Label>
              <Input
                id="last_name"
                required
                placeholder="Smith"
                value={form.last_name}
                onChange={(e) => onPatch({ last_name: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Specialization */}
          <div className="space-y-1.5">
            <Label htmlFor="specialization" className="text-xs font-medium">
              Specialization
            </Label>
            <Input
              id="specialization"
              required
              placeholder="e.g. Cardiology, General Practice"
              value={form.specialization}
              onChange={(e) => onPatch({ specialization: e.target.value })}
              className="h-9 text-sm"
            />
          </div>

          {/* License number */}
          <div className="space-y-1.5">
            <Label htmlFor="license_number" className="text-xs font-medium">
              License Number
            </Label>
            <Input
              id="license_number"
              required
              placeholder="Medical license number"
              value={form.license_number}
              onChange={(e) => onPatch({ license_number: e.target.value })}
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
              disabled={
                submitting ||
                !form.first_name ||
                !form.last_name ||
                !form.specialization ||
                !form.license_number
              }
              className="flex-1 gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Profile"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
