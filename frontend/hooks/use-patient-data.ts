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
      // All 4 requests fire in parallel — profile is no longer a sequential
      // second round-trip after the others finish.
      const [upcomingRes, historyRes, doctorsRes, profileRes] =
        await Promise.allSettled([
          getUpcomingAppointments(),
          getAppointmentHistory(),
          getMyDoctors(),
          getMyPatientProfile(),
        ]);

      if (upcomingRes.status === "fulfilled") setUpcoming(upcomingRes.value);
      if (historyRes.status === "fulfilled") setHistory(historyRes.value);
      if (doctorsRes.status === "fulfilled") setDoctors(doctorsRes.value);
      // Profile rejection is normal for new users — just leave it null
      if (profileRes.status === "fulfilled") setProfile(profileRes.value);
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
