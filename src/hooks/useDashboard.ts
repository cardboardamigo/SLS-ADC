"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  getMonthSummary,
  getStartingCensus,
  setStartingCensus as setStartingCensusAPI,
  subscribeToActivityForMonth,
} from "@/lib/census";
import { MonthlyADC, ActivityEntry } from "@/lib/types";
import { calculateBonus, formatCurrency } from "@/lib/bonus";
import { BONUS_TIERS, INSURANCE_TYPES } from "@/lib/config";

const PULL_THRESHOLD = 80;

export function useDashboard() {
  const { user, loading } = useAuthGuard();
  const router = useRouter();
  const [monthlyData, setMonthlyData] = useState<MonthlyADC | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [startCensus, setStartCensus] = useState<number>(0);
  const [editingCensus, setEditingCensus] = useState(false);
  const [censusInput, setCensusInput] = useState("");
  const [showBonusHint, setShowBonusHint] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [insuranceCounts, setInsuranceCounts] = useState<Record<string, number>>({});
  const [insuranceNameBreakdown, setInsuranceNameBreakdown] = useState<Record<string, Record<string, number>>>({});
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pull-to-refresh state
  const pullStartY = useRef(0);
  const pullRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  function computeInsurance(
    admissions: { insuranceType?: string; insuranceName?: string }[],
    discharges: { insuranceType?: string; insuranceName?: string }[],
    rtas: { insuranceType?: string; insuranceName?: string }[]
  ) {
    const counts: Record<string, number> = {};
    const nameBreakdown: Record<string, Record<string, number>> = {};
    for (const entry of [...admissions, ...discharges, ...rtas]) {
      const type = entry.insuranceType;
      if (!type) continue;
      counts[type] = (counts[type] || 0) + 1;
      if (!nameBreakdown[type]) nameBreakdown[type] = {};
      const name = entry.insuranceName?.trim() || "Unknown";
      nameBreakdown[type][name] = (nameBreakdown[type][name] || 0) + 1;
    }
    return { counts, nameBreakdown };
  }

  const loadData = useCallback(async () => {
    try {
      setDataLoading(true);
      setDataError(null);
      const [summary, sc] = await Promise.all([
        getMonthSummary(year, month),
        getStartingCensus(year, month),
      ]);
      setMonthlyData(summary.adc);
      setStartCensus(sc);
      const { counts, nameBreakdown } = computeInsurance(summary.admissions, summary.discharges, summary.rtas);
      setInsuranceCounts(counts);
      setInsuranceNameBreakdown(nameBreakdown);
    } catch (err) {
      console.error("Failed to load data:", err);
      setDataError("Failed to load census data. Please check your connection and try again.");
    } finally {
      setDataLoading(false);
    }
  }, [year, month]);

  const refreshData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [summary, sc] = await Promise.all([
        getMonthSummary(year, month),
        getStartingCensus(year, month),
      ]);
      setMonthlyData(summary.adc);
      setStartCensus(sc);
      setDataError(null);
      const { counts, nameBreakdown } = computeInsurance(summary.admissions, summary.discharges, summary.rtas);
      setInsuranceCounts(counts);
      setInsuranceNameBreakdown(nameBreakdown);
    } catch (err) {
      console.error("Failed to refresh data:", err);
    } finally {
      setRefreshing(false);
    }
  }, [year, month]);

  // Initial load (auth redirect handled by useAuthGuard)
  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // Pull-to-refresh touch handlers
  useEffect(() => {
    const el = pullRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop === 0) {
        pullStartY.current = e.touches[0].clientY;
      } else {
        pullStartY.current = 0;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!pullStartY.current) return;
      const distance = Math.max(0, e.touches[0].clientY - pullStartY.current);
      if (distance > 0) {
        setPullDistance(Math.min(distance, PULL_THRESHOLD * 1.5));
      }
    }

    function onTouchEnd() {
      if (pullDistance >= PULL_THRESHOLD && !refreshing) {
        refreshData();
      }
      setPullDistance(0);
      pullStartY.current = 0;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullDistance, refreshing, refreshData]);

  // Real-time listener for activity entries
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToActivityForMonth(year, month, (entries) => {
      setActivities(entries);
    });
    return unsubscribe;
  }, [user, year, month]);

  async function handleSetStartingCensus() {
    const val = parseInt(censusInput, 10);
    if (isNaN(val) || val < 0) return;
    await setStartingCensusAPI(year, month, val);
    setStartCensus(val);
    setEditingCensus(false);
    loadData();
  }

  function handleTripleTap() {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      router.push("/bonus");
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 800);
    }
  }

  // Computed values
  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const totalAdmits = activities.filter((a) => a.type === "Admit").length;
  const totalDischarges = activities.filter((a) => a.type === "DC").length;
  const totalRTAs = activities.filter((a) => a.type === "RTA").length;
  const currentCensus = monthlyData ? startCensus + totalAdmits - totalDischarges : 0;
  const adc = monthlyData?.averageDailyCensus ?? 0;
  const nextTier = (() => {
    const sorted = [...BONUS_TIERS].reverse();
    const current = sorted.findIndex((t) => adc < t.adcThreshold);
    return current >= 0 ? sorted[current] : null;
  })();

  return {
    // Auth / loading
    loading,
    dataLoading,
    dataError,
    refreshing,
    // Data
    monthlyData,
    activities,
    startCensus,
    now,
    year,
    month,
    // Census editing
    editingCensus,
    setEditingCensus,
    censusInput,
    setCensusInput,
    handleSetStartingCensus,
    // Bonus
    showBonusHint,
    setShowBonusHint,
    adc,
    nextTier,
    // FAB
    fabOpen,
    setFabOpen,
    // Pull-to-refresh
    pullRef,
    pullDistance,
    pullProgress,
    // Computed
    totalAdmits,
    totalDischarges,
    totalRTAs,
    currentCensus,
    // Insurance
    insuranceCounts,
    insuranceNameBreakdown,
    insuranceTypes: INSURANCE_TYPES,
    // Actions
    loadData,
    handleTripleTap,
    // Re-exports for JSX convenience
    calculateBonus,
    formatCurrency,
    router,
  };
}
