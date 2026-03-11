"use client";

import { useState, useCallback } from "react";
import {
  getUpcomingAppointments,
  getAppointmentHistory,
  getMyDoctors,
  getMyPatientProfile,
} from "@/lib/api-client";
import type { Appointment, MappingDoctor, PatientProfile } from "@/lib/types";

export interface PatientData {
  upcoming: Appointment[];
  history: Appointment[];
  doctors: MappingDoctor[];
  profile: PatientProfile | null;
  loading: boolean;
}

export function usePatientData() {
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<MappingDoctor[]>([]);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [upcomingRes, historyRes, doctorsRes] = await Promise.allSettled([
        getUpcomingAppointments(),
        getAppointmentHistory(),
        getMyDoctors(),
      ]);

      if (upcomingRes.status === "fulfilled") setUpcoming(upcomingRes.value);
      if (historyRes.status === "fulfilled") setHistory(historyRes.value);
      if (doctorsRes.status === "fulfilled") setDoctors(doctorsRes.value);

      try {
        const p = await getMyPatientProfile();
        setProfile(p);
      } catch {
        // Profile not yet created — not an error state
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback((p: PatientProfile | null) => {
    setProfile(p);
  }, []);

  return {
    upcoming,
    history,
    doctors,
    profile,
    loading,
    fetchData,
    updateProfile,
  };
}
