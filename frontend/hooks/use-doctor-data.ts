"use client";

import type {
  Appointment,
  CareTeam,
  DoctorProfile,
  MappingPatient,
  Referral,
} from "@/lib/types";
import {
  getAppointmentHistory,
  getDoctorCareTeams,
  getMyDoctorProfile,
  getMyPatients,
  getReceivedReferrals,
  getSentReferrals,
  getUpcomingAppointments,
} from "@/lib/api-client";
import { useCallback, useState } from "react";

export interface DoctorData {
  upcoming: Appointment[];
  history: Appointment[];
  patients: MappingPatient[];
  profile: DoctorProfile | null;
  sentReferrals: Referral[];
  receivedReferrals: Referral[];
  careTeams: CareTeam[];
  loading: boolean;
}

export function useDoctorData() {
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [history, setHistory] = useState<Appointment[]>([]);
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
        historyRes,
        patientsRes,
        sentRef,
        receivedRef,
        teamsRes,
        profileRes,
      ] = await Promise.allSettled([
        getUpcomingAppointments(),
        getAppointmentHistory(),
        getMyPatients(),
        getSentReferrals(),
        getReceivedReferrals(),
        getDoctorCareTeams(),
        getMyDoctorProfile(),
      ]);

      if (upcomingRes.status === "fulfilled") setUpcoming(upcomingRes.value);
      if (historyRes.status === "fulfilled") setHistory(historyRes.value);
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
    history,
    patients,
    profile,
    sentReferrals,
    receivedReferrals,
    careTeams,
    loading,
    fetchData,
    updateProfile,
    setUpcoming,
    setHistory,
  };
}
