"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { getMonthSummary, getStartingCensus } from "@/lib/census";
import { MonthlyADC, Admission, Discharge, RTA } from "@/lib/types";
import { calculateBonus, formatCurrency } from "@/lib/bonus";
import { subMonths, addMonths, format, getDaysInMonth, getDay } from "date-fns";

interface MonthDetail {
  adc: MonthlyADC;
  admissions: Admission[];
  discharges: Discharge[];
  rtas: RTA[];
}

interface DayCensusData {
  date: string; // yyyy-MM-dd
  dayNumber: number;
  endingCensus: number;
  admissions: Admission[];
  discharges: Discharge[];
  rtas: RTA[];
}

type ViewMode = "list" | "calendar";

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
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

  const loadData = useCallback(async () => {
    try {
      setDataLoading(true);
      setDataError(null);
      const now = new Date();

      const results = await Promise.all(
        Array.from({ length: 12 }, (_, i) => {
          const d = subMonths(now, i);
          return getMonthSummary(d.getFullYear(), d.getMonth() + 1);
        })
      );

      setMonths(results);
    } catch (err) {
      console.error("Failed to load history:", err);
      setDataError("Failed to load history data. Please check your connection and try again.");
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Load calendar data for the selected month
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
          endingCensus: dateStr <= today ? runningCensus : -1, // -1 means future day
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

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (user) loadData();
  }, [user, loading, router, loadData]);

  useEffect(() => {
    if (user && viewMode === "calendar") {
      loadCalendarData();
    }
  }, [user, viewMode, loadCalendarData]);

  if (loading || dataLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (dataError) {
    return (
      <div
        className="min-h-screen pb-24 content-below-header"
        style={{ background: "var(--bg)" }}
      >
        <Header />
        <div className="form-wrapper py-20 text-center">
          <p className="text-base mb-4" style={{ color: "var(--danger)" }}>{dataError}</p>
          <button
            onClick={loadData}
            className="text-white text-base font-semibold"
            style={{ background: "var(--primary)", borderRadius: "50px", padding: "14px 28px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
          >
            Retry
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Calendar grid helpers
  const firstDayOfWeek = getDay(new Date(calendarYear, calendarMonth - 1, 1)); // 0=Sun
  const daysInMonth = getDaysInMonth(new Date(calendarYear, calendarMonth - 1));
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const hasActivity = (day: DayCensusData) =>
    day.admissions.length > 0 || day.discharges.length > 0 || day.rtas.length > 0;

  return (
    <div
      className="min-h-screen pb-24 content-below-header"
      style={{ background: "var(--bg)" }}
    >
      <Header />

      <div className="form-wrapper py-8">
        {/* Title + View Toggle */}
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
            {viewMode === "list" ? "Monthly History" : "Census Calendar"}
          </h2>
          <div
            className="flex rounded-full overflow-hidden border"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              onClick={() => setViewMode("list")}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: viewMode === "list" ? "var(--primary)" : "var(--card)",
                color: viewMode === "list" ? "#fff" : "var(--text-muted)",
              }}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: viewMode === "calendar" ? "var(--primary)" : "var(--card)",
                color: viewMode === "calendar" ? "#fff" : "var(--text-muted)",
              }}
            >
              Calendar
            </button>
          </div>
        </div>

        {/* ========== LIST VIEW ========== */}
        {viewMode === "list" && (
          <div className="space-y-4">
            {months.map((m) => {
              const bonus = calculateBonus(m.adc.averageDailyCensus);
              const isExpanded = expandedMonth === m.adc.month;

              return (
                <div key={m.adc.month} className="card overflow-hidden">
                  <button
                    onClick={() => setExpandedMonth(isExpanded ? null : m.adc.month)}
                    className="w-full p-5 flex items-center justify-between text-left"
                  >
                    <div>
                      <p className="text-base font-semibold" style={{ color: "var(--text)" }}>
                        {m.adc.monthName}
                      </p>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {m.admissions.length} admits &middot; {m.discharges.length} D/C &middot;{" "}
                        {m.rtas.length} RTA
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold" style={{ color: "var(--primary)" }}>
                        {m.adc.averageDailyCensus.toFixed(1)}
                      </p>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>ADC</p>
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      className="px-5 pb-5 border-t"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="grid grid-cols-3 gap-3 mt-4 mb-4">
                        <div
                          className="rounded-xl p-3 text-center"
                          style={{ background: "var(--status-admit-bg)" }}
                        >
                          <p className="text-xl font-bold" style={{ color: "var(--status-admit)" }}>
                            {m.admissions.length}
                          </p>
                          <p className="text-sm" style={{ color: "var(--status-admit)" }}>Admits</p>
                        </div>
                        <div
                          className="rounded-xl p-3 text-center"
                          style={{ background: "var(--status-discharge-bg)" }}
                        >
                          <p className="text-xl font-bold" style={{ color: "var(--status-discharge)" }}>
                            {m.discharges.length}
                          </p>
                          <p className="text-sm" style={{ color: "var(--status-discharge)" }}>D/C</p>
                        </div>
                        <div
                          className="rounded-xl p-3 text-center"
                          style={{ background: "var(--status-rta-bg)" }}
                        >
                          <p className="text-xl font-bold" style={{ color: "var(--status-rta)" }}>
                            {m.rtas.length}
                          </p>
                          <p className="text-sm" style={{ color: "var(--status-rta)" }}>RTA</p>
                        </div>
                      </div>

                      {bonus.amount > 0 && (
                        <div
                          className="rounded-lg p-4 text-center mb-4"
                          style={{ background: "var(--status-rta-bg)" }}
                        >
                          <p className="text-base" style={{ color: "var(--status-rta)" }}>
                            Bonus: <span className="font-bold">{formatCurrency(bonus.amount)}</span>
                            {bonus.tier && ` (${bonus.tier.adcThreshold}+ tier)`}
                          </p>
                        </div>
                      )}

                      {m.admissions.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                            Admissions
                          </p>
                          {m.admissions.map((a) => (
                            <p key={a.id} className="text-sm py-1" style={{ color: "var(--text-secondary)" }}>
                              {a.date} - {a.hospitalName} ({a.patientType}, CL: {a.clinicalLiaison})
                            </p>
                          ))}
                        </div>
                      )}

                      {m.discharges.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                            Discharges
                          </p>
                          {m.discharges.map((d) => (
                            <p key={d.id} className="text-sm py-1" style={{ color: "var(--text-secondary)" }}>
                              {d.date} - {d.dischargeName} ({d.dischargeType})
                            </p>
                          ))}
                        </div>
                      )}

                      {m.rtas.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                            Returns to Acute
                          </p>
                          {m.rtas.map((r) => (
                            <p key={r.id} className="text-sm py-1" style={{ color: "var(--text-secondary)" }}>
                              {r.date} - {r.hospital} ({r.reason})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ========== CALENDAR VIEW ========== */}
        {viewMode === "calendar" && (
          <>
            {/* Month Navigation */}
            <div className="card p-4 mb-12">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
                  className="p-2 rounded-full transition"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                  {format(calendarDate, "MMMM yyyy")}
                </h3>
                <button
                  onClick={() => !isCurrentMonth && setCalendarDate(addMonths(calendarDate, 1))}
                  className={`p-2 rounded-full transition ${isCurrentMonth ? "opacity-30" : ""}`}
                  style={{ color: "var(--text-secondary)" }}
                  disabled={isCurrentMonth}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="card p-4">
              {calendarLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div
                    className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                  />
                </div>
              ) : (
                <>
                  {/* Weekday Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map((day) => (
                      <div
                        key={day}
                        className="text-center text-xs font-semibold py-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Day Cells */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for offset */}
                    {Array.from({ length: firstDayOfWeek }, (_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}

                    {/* Day cells */}
                    {calendarData.map((day) => {
                      const isFuture = day.endingCensus === -1;
                      const hasAct = hasActivity(day);
                      const todayStr = format(new Date(), "yyyy-MM-dd");
                      const isToday = day.date === todayStr;

                      return (
                        <button
                          key={day.date}
                          onClick={() => hasAct && setSelectedDay(day)}
                          disabled={!hasAct}
                          className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${
                            hasAct ? "cursor-pointer active:scale-95" : "cursor-default"
                          }`}
                          style={{
                            background: isToday
                              ? "var(--status-admit-bg)"
                              : hasAct
                              ? "var(--surface)"
                              : "transparent",
                            border: isToday ? "2px solid var(--status-admit)" : "1px solid transparent",
                          }}
                        >
                          <span
                            className="text-xs leading-none"
                            style={{
                              color: isFuture ? "var(--text-muted)" : "var(--text-secondary)",
                            }}
                          >
                            {day.dayNumber}
                          </span>
                          {!isFuture && (
                            <span
                              className="text-sm font-bold leading-tight mt-0.5"
                              style={{ color: "var(--text)" }}
                            >
                              {day.endingCensus}
                            </span>
                          )}
                          {/* Activity indicator dots */}
                          {hasAct && (
                            <div className="flex gap-0.5 mt-0.5">
                              {day.admissions.length > 0 && (
                                <div
                                  className="w-1 h-1 rounded-full"
                                  style={{ background: "var(--status-admit)" }}
                                />
                              )}
                              {day.discharges.length > 0 && (
                                <div
                                  className="w-1 h-1 rounded-full"
                                  style={{ background: "var(--status-discharge)" }}
                                />
                              )}
                              {day.rtas.length > 0 && (
                                <div
                                  className="w-1 h-1 rounded-full"
                                  style={{ background: "var(--status-rta)" }}
                                />
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: "var(--status-admit)" }} />
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Admit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: "var(--status-discharge)" }} />
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>D/C</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: "var(--status-rta)" }} />
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>RTA</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ========== DAY DETAIL PAGER (Modal) ========== */}
      {selectedDay && (
        <>
          <div
            className="fixed inset-0 z-50"
            style={{ background: "var(--overlay)" }}
            onClick={() => setSelectedDay(null)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl max-h-[80vh] overflow-y-auto"
            style={{
              background: "var(--card)",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: "var(--border)" }}
              />
            </div>

            <div className="px-5 pb-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                    {format(new Date(selectedDay.date + "T12:00:00"), "EEEE, MMM d")}
                  </h3>
                  {selectedDay.endingCensus !== -1 && (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Ending Census: <span className="font-semibold" style={{ color: "var(--text)" }}>{selectedDay.endingCensus}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-2 rounded-full"
                  style={{ color: "var(--text-muted)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Summary badges */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div
                  className="rounded-xl p-3 text-center"
                  style={{ background: "var(--status-admit-bg)" }}
                >
                  <p className="text-xl font-bold" style={{ color: "var(--status-admit)" }}>
                    {selectedDay.admissions.length}
                  </p>
                  <p className="text-xs font-medium" style={{ color: "var(--status-admit)" }}>Admits</p>
                </div>
                <div
                  className="rounded-xl p-3 text-center"
                  style={{ background: "var(--status-discharge-bg)" }}
                >
                  <p className="text-xl font-bold" style={{ color: "var(--status-discharge)" }}>
                    {selectedDay.discharges.length}
                  </p>
                  <p className="text-xs font-medium" style={{ color: "var(--status-discharge)" }}>D/C</p>
                </div>
                <div
                  className="rounded-xl p-3 text-center"
                  style={{ background: "var(--status-rta-bg)" }}
                >
                  <p className="text-xl font-bold" style={{ color: "var(--status-rta)" }}>
                    {selectedDay.rtas.length}
                  </p>
                  <p className="text-xs font-medium" style={{ color: "var(--status-rta)" }}>RTA</p>
                </div>
              </div>

              {/* Admission Details */}
              {selectedDay.admissions.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2" style={{ color: "var(--status-admit)" }}>
                    Admissions
                  </p>
                  {selectedDay.admissions.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 py-2 border-b last:border-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: "var(--status-admit)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                          {a.hospitalName}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {a.patientType} &middot; CL: {a.clinicalLiaison}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Discharge Details */}
              {selectedDay.discharges.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2" style={{ color: "var(--status-discharge)" }}>
                    Discharges
                  </p>
                  {selectedDay.discharges.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-2 py-2 border-b last:border-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: "var(--status-discharge)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                          {d.dischargeName}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {d.dischargeType}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* RTA Details */}
              {selectedDay.rtas.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2" style={{ color: "var(--status-rta)" }}>
                    Returns to Acute
                  </p>
                  {selectedDay.rtas.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-2 py-2 border-b last:border-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: "var(--status-rta)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                          {r.hospital}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {r.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No activity message */}
              {selectedDay.admissions.length === 0 &&
                selectedDay.discharges.length === 0 &&
                selectedDay.rtas.length === 0 && (
                  <p className="text-center py-6 text-base" style={{ color: "var(--text-muted)" }}>
                    No activity for this day
                  </p>
                )}
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
