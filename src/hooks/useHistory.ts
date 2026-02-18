"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { getMonthSummary, getStartingCensus } from "@/lib/census";
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

export type ViewMode = "list" | "calendar";

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
      const today = format(new Date(), "yyyy-MM-dd");
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
          endingCensus: dateStr <= today ? runningCensus : -1,
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
    // Actions
    loadData,
  };
}
