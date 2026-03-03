"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  getMonthSummary,
  getStartingCensus,
  getAdmissionsForDateRange,
  getDischargesForDateRange,
  getRTAsForDateRange,
} from "@/lib/census";
import { MonthlyADC, Admission, Discharge, RTA } from "@/lib/types";
import { subMonths, getDaysInMonth, getDay, format } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────

export interface MonthDetail {
  adc: MonthlyADC;
  admissions: Admission[];
  discharges: Discharge[];
  rtas: RTA[];
}

export interface DayCensusData {
  date: string; // yyyy-MM-dd
  dayNumber: number;
  endingCensus: number;
  admissions: Admission[];
  discharges: Discharge[];
  rtas: RTA[];
}

export type ViewMode = "list" | "calendar" | "search";
export type SearchCategory = "admissions" | "discharges" | "rtas";

export interface SearchFilters {
  startDate: string;
  endDate: string;
  category: SearchCategory;
  // Admission filters
  clinicalLiaison: string;
  hospital: string;
  patientType: string;
  // Discharge filters
  dischargeType: string;
  facilityName: string;
  // RTA filters
  rtaReason: string;
  rtaLocation: string;
  // Insurance filters (all categories)
  insuranceType: string;
  insuranceName: string;
  // Chart toggle
  showChart: boolean;
}

export interface SearchResults {
  admissions: Admission[];
  discharges: Discharge[];
  rtas: RTA[];
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useHistory() {
  const { user, loading } = useAuthGuard();

  const [months, setMonths] = useState<MonthDetail[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // Calendar view state
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<DayCensusData[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayCensusData | null>(null);

  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth() + 1;
  const isCurrentMonth =
    calendarDate.getMonth() === new Date().getMonth() &&
    calendarDate.getFullYear() === new Date().getFullYear();

  // Search state
  const today = format(new Date(), "yyyy-MM-dd");
  const thirtyDaysAgo = format(subMonths(new Date(), 1), "yyyy-MM-dd");

  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    startDate: thirtyDaysAgo,
    endDate: today,
    category: "admissions",
    clinicalLiaison: "",
    hospital: "",
    patientType: "",
    dischargeType: "",
    facilityName: "",
    rtaReason: "",
    rtaLocation: "",
    insuranceType: "",
    insuranceName: "",
    showChart: false,
  });
  const [searchResults, setSearchResults] = useState<SearchResults>({
    admissions: [],
    discharges: [],
    rtas: [],
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // ── Data loaders ─────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      setDataLoading(true);
      setDataError(null);
      const now = new Date();

      const results = await Promise.all(
        Array.from({ length: 12 }, (_, i) => {
          const d = subMonths(now, i);
          return getMonthSummary(d.getFullYear(), d.getMonth() + 1);
        }),
      );

      setMonths(results);
    } catch (err) {
      console.error("Failed to load history:", err);
      setDataError("Failed to load history data. Please check your connection and try again.");
    } finally {
      setDataLoading(false);
    }
  }, []);

  const loadCalendarData = useCallback(async () => {
    try {
      setCalendarLoading(true);
      const [summary, startCensus] = await Promise.all([
        getMonthSummary(calendarYear, calendarMonth),
        getStartingCensus(calendarYear, calendarMonth),
      ]);

      const daysInMonth = getDaysInMonth(new Date(calendarYear, calendarMonth - 1));
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const days: DayCensusData[] = [];
      let runningCensus = startCensus;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = format(new Date(calendarYear, calendarMonth - 1, d), "yyyy-MM-dd");

        const dayAdmissions = summary.admissions.filter((a) => a.date === dateStr);
        const dayDischarges = summary.discharges.filter((dc) => dc.date === dateStr);
        const dayRtas = summary.rtas.filter((r) => r.date === dateStr);

        runningCensus = runningCensus + dayAdmissions.length - dayDischarges.length - dayRtas.length;

        days.push({
          date: dateStr,
          dayNumber: d,
          endingCensus: dateStr <= todayStr ? runningCensus : -1,
          admissions: dayAdmissions,
          discharges: dayDischarges,
          rtas: dayRtas,
        });
      }

      setCalendarData(days);
    } catch (err) {
      console.error("Failed to load calendar data:", err);
    } finally {
      setCalendarLoading(false);
    }
  }, [calendarYear, calendarMonth]);

  // ── Search ─────────────────────────────────────────────────────────

  const executeSearch = useCallback(async () => {
    if (!searchFilters.startDate || !searchFilters.endDate) return;
    setSearchLoading(true);
    setHasSearched(true);
    try {
      const { startDate, endDate, category } = searchFilters;

      if (category === "admissions") {
        let results = await getAdmissionsForDateRange(startDate, endDate);
        if (searchFilters.clinicalLiaison) {
          results = results.filter((a) => a.clinicalLiaison === searchFilters.clinicalLiaison);
        }
        if (searchFilters.hospital) {
          results = results.filter((a) =>
            a.hospitalName.toLowerCase().includes(searchFilters.hospital.toLowerCase())
          );
        }
        if (searchFilters.patientType) {
          results = results.filter((a) => a.patientType === searchFilters.patientType);
        }
        if (searchFilters.insuranceType) {
          results = results.filter((a) => a.insuranceType === searchFilters.insuranceType);
        }
        if (searchFilters.insuranceName) {
          results = results.filter((a) =>
            (a.insuranceName || "").toLowerCase().includes(searchFilters.insuranceName.toLowerCase())
          );
        }
        setSearchResults({ admissions: results, discharges: [], rtas: [] });
      } else if (category === "discharges") {
        let results = await getDischargesForDateRange(startDate, endDate);
        if (searchFilters.dischargeType) {
          results = results.filter((d) => d.dischargeType === searchFilters.dischargeType);
        }
        if (searchFilters.facilityName) {
          results = results.filter((d) =>
            d.dischargeName.toLowerCase().includes(searchFilters.facilityName.toLowerCase())
          );
        }
        if (searchFilters.insuranceType) {
          results = results.filter((d) => d.insuranceType === searchFilters.insuranceType);
        }
        if (searchFilters.insuranceName) {
          results = results.filter((d) =>
            (d.insuranceName || "").toLowerCase().includes(searchFilters.insuranceName.toLowerCase())
          );
        }
        setSearchResults({ admissions: [], discharges: results, rtas: [] });
      } else {
        let results = await getRTAsForDateRange(startDate, endDate);
        if (searchFilters.rtaReason) {
          results = results.filter((r) => r.reason === searchFilters.rtaReason);
        }
        if (searchFilters.rtaLocation) {
          results = results.filter((r) => r.hospital === searchFilters.rtaLocation);
        }
        if (searchFilters.insuranceType) {
          results = results.filter((r) => r.insuranceType === searchFilters.insuranceType);
        }
        if (searchFilters.insuranceName) {
          results = results.filter((r) =>
            (r.insuranceName || "").toLowerCase().includes(searchFilters.insuranceName.toLowerCase())
          );
        }
        setSearchResults({ admissions: [], discharges: [], rtas: results });
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearchLoading(false);
    }
  }, [searchFilters]);

  function updateSearchFilter<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) {
    setSearchFilters((prev) => ({ ...prev, [key]: value }));
  }

  function resetSearchFilters() {
    setSearchFilters({
      startDate: thirtyDaysAgo,
      endDate: today,
      category: searchFilters.category,
      clinicalLiaison: "",
      hospital: "",
      patientType: "",
      dischargeType: "",
      facilityName: "",
      rtaReason: "",
      rtaLocation: "",
      insuranceType: "",
      insuranceName: "",
      showChart: false,
    });
    setSearchResults({ admissions: [], discharges: [], rtas: [] });
    setHasSearched(false);
  }

  // ── Effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  useEffect(() => {
    if (user && viewMode === "calendar") {
      loadCalendarData();
    }
  }, [user, viewMode, loadCalendarData]);

  // ── Calendar grid helpers ────────────────────────────────────────────

  const firstDayOfWeek = getDay(new Date(calendarYear, calendarMonth - 1, 1));
  const daysInMonth = getDaysInMonth(new Date(calendarYear, calendarMonth - 1));
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

  const hasActivity = (day: DayCensusData) =>
    day.admissions.length > 0 || day.discharges.length > 0 || day.rtas.length > 0;

  return {
    // Auth / loading
    loading,
    dataLoading,
    dataError,
    // List view
    months,
    expandedMonth,
    setExpandedMonth,
    // Calendar view
    viewMode,
    setViewMode,
    calendarDate,
    setCalendarDate,
    calendarData,
    calendarLoading,
    selectedDay,
    setSelectedDay,
    calendarYear,
    calendarMonth,
    isCurrentMonth,
    // Calendar grid
    firstDayOfWeek,
    daysInMonth,
    weekDays,
    hasActivity,
    // Search
    searchFilters,
    searchResults,
    searchLoading,
    hasSearched,
    updateSearchFilter,
    executeSearch,
    resetSearchFilters,
    // Actions
    loadData,
    loadCalendarData,
  };
}
