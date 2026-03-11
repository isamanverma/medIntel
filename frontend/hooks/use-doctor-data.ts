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
      // All 6 requests fire in parallel — profile is no longer a sequential
      // second round-trip after the others finish.
      const [
        upcomingRes,
        patientsRes,
        sentRef,
        receivedRef,
        teamsRes,
        profileRes,
      ] = await Promise.allSettled([
        getUpcomingAppointments(),
        getMyPatients(),
        getSentReferrals(),
        getReceivedReferrals(),
        getDoctorCareTeams(),
        getMyDoctorProfile(),
      ]);

      if (upcomingRes.status === "fulfilled") setUpcoming(upcomingRes.value);
      if (patientsRes.status === "fulfilled") setPatients(patientsRes.value);
      if (sentRef.status === "fulfilled") setSentReferrals(sentRef.value);
      if (receivedRef.status === "fulfilled")
        setReceivedReferrals(receivedRef.value);
      if (teamsRes.status === "fulfilled") setCareTeams(teamsRes.value);
      // Profile rejection is normal for new doctors — just leave it null
      if (profileRes.status === "fulfilled") setProfile(profileRes.value);
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
