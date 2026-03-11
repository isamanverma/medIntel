"use client";

import { useState, useCallback } from "react";
import { createAppointment } from "@/lib/api-client";
import type { PatientProfile } from "@/lib/types";

export interface BookingFormState {
  doctor_id: string;
  scheduled_time: string;
  meeting_notes: string;
  meeting_tags: string[];
}

const defaultForm: BookingFormState = {
  doctor_id: "",
  scheduled_time: "",
  meeting_notes: "",
  meeting_tags: [],
};

interface UseBookingFormOptions {
  profile: PatientProfile | null;
  onSuccess: () => Promise<void>;
  toast: (msg: string, type: "success" | "error") => void;
}

export function useBookingForm({
  profile,
  onSuccess,
  toast,
}: UseBookingFormOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<BookingFormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const patchForm = useCallback(
    (patch: Partial<BookingFormState>) =>
      setForm((prev) => ({ ...prev, ...patch })),
    [],
  );

  const open = useCallback((prefillDoctorId?: string) => {
    setForm({
      ...defaultForm,
      doctor_id: prefillDoctorId ?? "",
    });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setForm(defaultForm);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!profile) {
        toast(
          "Please complete your profile before booking an appointment.",
          "error",
        );
        return;
      }

      setSubmitting(true);
      try {
        const tagSuffix =
          form.meeting_tags.length > 0
            ? `${form.meeting_notes ? "\n\n" : ""}Symptom tags: ${form.meeting_tags.join(", ")}`
            : "";
        const fullNotes = form.meeting_notes
          ? form.meeting_notes + tagSuffix
          : tagSuffix || undefined;

        await createAppointment({
          patient_id: profile.id,
          doctor_id: form.doctor_id,
          scheduled_time: new Date(form.scheduled_time).toISOString(),
          meeting_notes: fullNotes,
        });

        close();
        toast("Appointment booked successfully!", "success");
        await onSuccess();
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to book appointment";
        toast(msg, "error");
      } finally {
        setSubmitting(false);
      }
    },
    [profile, form, close, onSuccess, toast],
  );

  return {
    isOpen,
    open,
    close,
    form,
    patchForm,
    submitting,
    handleSubmit,
  };
}
