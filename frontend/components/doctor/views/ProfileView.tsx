"use client";

import {
  Stethoscope,
  Copy,
  Check,
  Award,
  ShieldCheck,
  UserCircle,
  Pencil,
  X,
  Loader2,
  Save,
} from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/Toast";
import { updateDoctorProfile } from "@/lib/api-client";
import type { DoctorProfile, UserPublic } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileViewProps {
  user: UserPublic;
  profile: DoctorProfile | null;
  onCreateProfile: () => void;
  onProfileUpdated: (p: DoctorProfile) => void;
}

interface EditForm {
  first_name: string;
  last_name: string;
  specialization: string;
  license_number: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Copyable field ───────────────────────────────────────────────────────────

function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg bg-muted px-3 py-2 text-xs font-mono text-foreground">
          {value}
        </code>
        <button
          onClick={copy}
          className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Read-only info row ────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  colorClass = "text-muted-foreground",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  colorClass?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className={cn("h-4 w-4", colorClass)} />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

// ─── Editable field row ────────────────────────────────────────────────────────

function EditableField({
  icon: Icon,
  label,
  id,
  value,
  placeholder,
  colorClass = "text-muted-foreground",
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  id: string;
  value: string;
  placeholder?: string;
  colorClass?: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted mt-5">
        <Icon className={cn("h-4 w-4", colorClass)} />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Label
          htmlFor={id}
          className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
        >
          {label}
        </Label>
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 text-sm"
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfileView({
  user,
  profile,
  onCreateProfile,
  onProfileUpdated,
}: ProfileViewProps) {
  const { toast } = useToast();
  const initials = getInitials(user.name || "D");

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm>({
    first_name: "",
    last_name: "",
    specialization: "",
    license_number: "",
  });

  // ── Open edit mode pre-filled ─────────────────────────────────────────────
  const handleStartEdit = useCallback(() => {
    if (!profile) return;
    setForm({
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      specialization: profile.specialization ?? "",
      license_number: profile.license_number ?? "",
    });
    setIsEditing(true);
  }, [profile]);

  const handleCancel = () => {
    setIsEditing(false);
  };

  const patch = (field: keyof EditForm) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  // ── Save changes ──────────────────────────────────────────────────────────
  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (
        !form.first_name.trim() ||
        !form.last_name.trim() ||
        !form.specialization.trim() ||
        !form.license_number.trim()
      ) {
        toast("All fields are required.", "error");
        return;
      }
      setSaving(true);
      try {
        const updated = await updateDoctorProfile(form);
        onProfileUpdated(updated);
        setIsEditing(false);
        toast("Profile updated successfully!", "success");
      } catch (err: unknown) {
        toast(
          err instanceof Error ? err.message : "Failed to update profile",
          "error",
        );
      } finally {
        setSaving(false);
      }
    },
    [form, onProfileUpdated, toast],
  );

  const isDirty =
    isEditing &&
    profile &&
    (form.first_name !== (profile.first_name ?? "") ||
      form.last_name !== (profile.last_name ?? "") ||
      form.specialization !== (profile.specialization ?? "") ||
      form.license_number !== (profile.license_number ?? ""));

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your professional identity on MedIntel.
          </p>
        </div>

        {profile && !isEditing && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleStartEdit}
            className="gap-2 self-start"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Profile
          </Button>
        )}

        {isEditing && (
          <div className="flex items-center gap-2 self-start">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={saving}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              form="profile-edit-form"
              type="submit"
              disabled={saving || !isDirty}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ── Incomplete banner ────────────────────────────────────────────── */}
      {!profile && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-50 p-4 dark:bg-amber-500/10">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
            <Stethoscope className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Profile not set up
            </p>
            <p className="mt-0.5 text-xs text-amber-700/70 dark:text-amber-300/60">
              Add your specialization and license to unlock all features.
            </p>
          </div>
          <Button
            size="sm"
            onClick={onCreateProfile}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
          >
            Set Up Now
          </Button>
        </div>
      )}

      {/* ── Editing mode banner ──────────────────────────────────────────── */}
      {isEditing && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Pencil className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-sm font-medium text-primary">
            You are editing your profile. Changes will only be saved when you
            click <span className="font-semibold">Save Changes</span>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Identity card (left / top) ────────────────────────────────── */}
        <Card className="gap-0 py-0">
          <CardContent className="p-6">
            {/* Avatar + name block */}
            <div className="flex flex-col items-center text-center pb-5 border-b border-border">
              <Avatar className="h-20 w-20 ring-4 ring-border shadow-sm">
                <AvatarFallback className="bg-secondary/10 text-secondary text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="mt-4 space-y-1">
                <p className="text-lg font-bold text-foreground">
                  Dr. {user.name}
                </p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>

              {profile ? (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-secondary/30 text-secondary bg-secondary/5 text-xs"
                  >
                    <Stethoscope className="mr-1 h-3 w-3" />
                    {isEditing && form.specialization
                      ? form.specialization
                      : profile.specialization}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-600 bg-emerald-500/5 text-xs dark:text-emerald-400"
                  >
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                </div>
              ) : (
                <Badge
                  variant="outline"
                  className="mt-3 border-amber-500/30 text-amber-600 bg-amber-500/5 text-xs dark:text-amber-400"
                >
                  Profile incomplete
                </Badge>
              )}
            </div>

            {/* Role chip */}
            <div className="mt-5 flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Role</span>
              </div>
              <Badge className="bg-secondary/15 text-secondary hover:bg-secondary/20 font-medium text-xs border-0">
                DOCTOR
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* ── Professional details ──────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Professional info card */}
          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-secondary" />
                <CardTitle className="text-sm font-semibold">
                  Professional Information
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {profile ? (
                isEditing ? (
                  /* ── Inline edit form ──────────────────────────────────── */
                  <form
                    id="profile-edit-form"
                    onSubmit={handleSave}
                    className="grid grid-cols-1 gap-5 sm:grid-cols-2"
                  >
                    <EditableField
                      icon={UserCircle}
                      label="First Name"
                      id="first_name"
                      value={form.first_name}
                      placeholder="Jane"
                      colorClass="text-muted-foreground"
                      onChange={patch("first_name")}
                    />
                    <EditableField
                      icon={UserCircle}
                      label="Last Name"
                      id="last_name"
                      value={form.last_name}
                      placeholder="Smith"
                      colorClass="text-muted-foreground"
                      onChange={patch("last_name")}
                    />
                    <EditableField
                      icon={Stethoscope}
                      label="Specialization"
                      id="specialization"
                      value={form.specialization}
                      placeholder="e.g. Cardiology"
                      colorClass="text-secondary"
                      onChange={patch("specialization")}
                    />
                    <EditableField
                      icon={Award}
                      label="License Number"
                      id="license_number"
                      value={form.license_number}
                      placeholder="Medical license number"
                      colorClass="text-primary"
                      onChange={patch("license_number")}
                    />

                    {/* Static read-only rows */}
                    <InfoRow
                      icon={ShieldCheck}
                      label="Verification Status"
                      value="Active & Verified"
                      colorClass="text-emerald-500"
                    />
                    <InfoRow
                      icon={UserCircle}
                      label="Portal Role"
                      value="Doctor"
                      colorClass="text-muted-foreground"
                    />
                  </form>
                ) : (
                  /* ── Read-only view ─────────────────────────────────────── */
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <InfoRow
                      icon={UserCircle}
                      label="First Name"
                      value={profile.first_name}
                      colorClass="text-muted-foreground"
                    />
                    <InfoRow
                      icon={UserCircle}
                      label="Last Name"
                      value={profile.last_name}
                      colorClass="text-muted-foreground"
                    />
                    <InfoRow
                      icon={Stethoscope}
                      label="Specialization"
                      value={profile.specialization}
                      colorClass="text-secondary"
                    />
                    <InfoRow
                      icon={Award}
                      label="License Number"
                      value={profile.license_number ?? "—"}
                      colorClass="text-primary"
                    />
                    <InfoRow
                      icon={ShieldCheck}
                      label="Verification Status"
                      value="Active & Verified"
                      colorClass="text-emerald-500"
                    />
                    <InfoRow
                      icon={UserCircle}
                      label="Portal Role"
                      value="Doctor"
                      colorClass="text-muted-foreground"
                    />
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Stethoscope className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    No professional info yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    Add your specialization and license number to complete
                    setup.
                  </p>
                  <Button
                    size="sm"
                    onClick={onCreateProfile}
                    className="mt-5 gap-2"
                  >
                    <Stethoscope className="h-3.5 w-3.5" />
                    Complete Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* IDs card */}
          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  Account Identifiers
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground">
                Share your Doctor Profile ID with patients or colleagues so they
                can link you to their care team.
              </p>
              <Separator />
              <CopyableField label="User ID" value={user.id} />
              {profile && (
                <>
                  <CopyableField
                    label="Doctor Profile ID"
                    value={String(profile.id)}
                  />
                  {profile.license_number && (
                    <CopyableField
                      label="License Number"
                      value={profile.license_number}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
