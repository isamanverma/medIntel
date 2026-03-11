"use client";

import { useState, useCallback } from "react";
import {
  createPatientProfile,
  updatePatientProfile,
  generateConditionTags,
} from "@/lib/api-client";
import type { PatientProfile } from "@/lib/types";

export type ProfileTab = "personal" | "medical" | "insurance" | "contact";

export interface ProfileFormState {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  blood_group: string;
  emergency_contact: string;
  gender: string;
  phone: string;
  preferred_language: string;
  allergies: string;
  chronic_conditions: string;
  past_surgeries: string;
  height_cm: string;
  weight_kg: string;
  blood_pressure: string;
  insurance_provider: string;
  insurance_policy_number: string;
  insurance_group_number: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
  condition_description: string;
  condition_tags: string[];
}

const defaultForm: ProfileFormState = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  blood_group: "O+",
  emergency_contact: "",
  gender: "",
  phone: "",
  preferred_language: "English",
  allergies: "",
  chronic_conditions: "",
  past_surgeries: "",
  height_cm: "",
  weight_kg: "",
  blood_pressure: "",
  insurance_provider: "",
  insurance_policy_number: "",
  insurance_group_number: "",
  address_street: "",
  address_city: "",
  address_state: "",
  address_zip: "",
  address_country: "",
  condition_description: "",
  condition_tags: [],
};

interface UseProfileFormOptions {
  profile: PatientProfile | null;
  onSuccess: (p: PatientProfile) => void;
  toast: (msg: string, type: "success" | "error") => void;
}

export function useProfileForm({ profile, onSuccess, toast }: UseProfileFormOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");
  const [form, setForm] = useState<ProfileFormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [generatingTags, setGeneratingTags] = useState(false);

  const patchForm = useCallback(
    (patch: Partial<ProfileFormState>) =>
      setForm((prev) => ({ ...prev, ...patch })),
    []
  );

  const open = useCallback(() => {
    if (profile) {
      const existingTags = profile.condition_tags ?? [];
      setForm({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        date_of_birth: profile.date_of_birth?.slice(0, 10) ?? "",
        blood_group: profile.blood_group ?? "O+",
        emergency_contact: profile.emergency_contact ?? "",
        gender: profile.gender ?? "",
        phone: profile.phone ?? "",
        preferred_language: profile.preferred_language ?? "English",
        allergies: profile.allergies?.join(", ") ?? "",
        chronic_conditions: profile.chronic_conditions?.join(", ") ?? "",
        past_surgeries: profile.past_surgeries ?? "",
        height_cm: profile.height_cm ? String(profile.height_cm) : "",
        weight_kg: profile.weight_kg ? String(profile.weight_kg) : "",
        blood_pressure: profile.blood_pressure ?? "",
        insurance_provider: profile.insurance_provider ?? "",
        insurance_policy_number: profile.insurance_policy_number ?? "",
        insurance_group_number: profile.insurance_group_number ?? "",
        address_street: profile.address_street ?? "",
        address_city: profile.address_city ?? "",
        address_state: profile.address_state ?? "",
        address_zip: profile.address_zip ?? "",
        address_country: profile.address_country ?? "",
        condition_description: profile.condition_description ?? "",
        condition_tags: existingTags,
      });
    } else {
      setForm(defaultForm);
    }
    setActiveTab("personal");
    setIsOpen(true);
  }, [profile]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleGenerateTags = useCallback(async () => {
    if (!form.condition_description.trim()) {
      toast("Please enter a condition description first.", "error");
      return;
    }
    setGeneratingTags(true);
    try {
      const result = await generateConditionTags(form.condition_description);
      setForm((prev) => ({ ...prev, condition_tags: result.tags }));
      toast(`Generated ${result.tags.length} medical tags!`, "success");
    } catch (err: unknown) {
      const isBackendError =
        err !== null &&
        typeof err === "object" &&
        "status" in err &&
        typeof (err as { status: unknown }).status === "number";
      const status = isBackendError ? (err as { status: number }).status : null;

      if (status === 429) {
        toast("AI quota limit reached. Please wait a minute and try again.", "error");
      } else if (status === 503) {
        toast("AI service is not configured. Please contact support.", "error");
      } else {
        const msg = err instanceof Error ? err.message : "Failed to generate tags";
        toast(msg, "error");
      }
    } finally {
      setGeneratingTags(false);
    }
  }, [form.condition_description, toast]);

  const removeTag = useCallback((tag: string) => {
    setForm((prev) => ({
      ...prev,
      condition_tags: prev.condition_tags.filter((t) => t !== tag),
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      try {
        const payload = {
          ...form,
          allergies: form.allergies
            ? form.allergies.split(",").map((s) => s.trim())
            : [],
          chronic_conditions: form.chronic_conditions
            ? form.chronic_conditions.split(",").map((s) => s.trim())
            : [],
          height_cm: form.height_cm ? Number(form.height_cm) : undefined,
          weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
          condition_description: form.condition_description || undefined,
          condition_tags:
            form.condition_tags.length > 0 ? form.condition_tags : undefined,
        };

        const saved = profile
          ? await updatePatientProfile(payload)
          : await createPatientProfile(payload);

        onSuccess(saved);
        setIsOpen(false);
        toast(profile ? "Profile updated!" : "Profile created!", "success");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to save profile";
        toast(msg, "error");
      } finally {
        setSubmitting(false);
      }
    },
    [form, profile, onSuccess, toast]
  );

  return {
    isOpen,
    open,
    close,
    activeTab,
    setActiveTab,
    form,
    patchForm,
    submitting,
    generatingTags,
    handleGenerateTags,
    removeTag,
    handleSubmit,
  };
}
