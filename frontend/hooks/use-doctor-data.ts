"use client";

import { useState, useCallback } from "react";
import {
  getUpcomingAppointments,
  getMyPatients,
  getMyDoctorProfile,
  getSentReferrals,
  getReceivedReferrals,
  getDoctorCareTeams,
} from "@/lib/api-client";
import type {
  Appointment,
  MappingPatient,
  DoctorProfile,
  Referral,
  CareTeam,
} from "@/lib/types";

export interface DoctorData {
  upcoming: Appointment[];
  patients: MappingPatient[];
  profile: DoctorProfile | null;
  sentReferrals: Referral[];
  receivedReferrals: Referral[];
  careTeams: CareTeam[];
  loading: boolean;
}

export function useDoctorData() {
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<MappingPatient[]>([]);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [sentReferrals, setSentReferrals] = useState<Referral[]>([]);
  const [receivedReferrals, setReceivedReferrals] = useState<Referral[]>([]);
  const [careTeams, setCareTeams] = useState<CareTeam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [upcomingRes, patientsRes, sentRef, receivedRef, teamsRes] =
        await Promise.allSettled([
          getUpcomingAppointments(),
          getMyPatients(),
          getSentReferrals(),
          getReceivedReferrals(),
          getDoctorCareTeams(),
        ]);

      if (upcomingRes.status === "fulfilled") setUpcoming(upcomingRes.value);
      if (patientsRes.status === "fulfilled") setPatients(patientsRes.value);
      if (sentRef.status === "fulfilled") setSentReferrals(sentRef.value);
      if (receivedRef.status === "fulfilled")
        setReceivedReferrals(receivedRef.value);
      if (teamsRes.status === "fulfilled") setCareTeams(teamsRes.value);

      try {
        const p = await getMyDoctorProfile();
        setProfile(p);
      } catch {
        // No profile yet — not an error state
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback((p: DoctorProfile | null) => {
    setProfile(p);
  }, []);

  return {
    upcoming,
    patients,
    profile,
    sentReferrals,
    receivedReferrals,
    careTeams,
    loading,
    fetchData,
    updateProfile,
  };
}
