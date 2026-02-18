"use client";

import AppLayout from "@/components/AppLayout";
import { useHistory } from "@/hooks/useHistory";
import type { DayCensusData } from "@/hooks/useHistory";
import { calculateBonus, formatCurrency } from "@/lib/bonus";
import { subMonths, addMonths, format } from "date-fns";

export default function HistoryPage() {
  const {
    loading,
    dataLoading,
    dataError,
    months,
    expandedMonth,
    setExpandedMonth,
    viewMode,
    setViewMode,
    calendarDate,
    setCalendarDate,
    calendarData,
    calendarLoading,
    selectedDay,
    setSelectedDay,
    isCurrentMonth,
    firstDayOfWeek,
    weekDays,
    hasActivity,
    loadData,
  } = useHistory();

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
      <AppLayout>
        <div className="content-below-header pb-24 lg:pb-8">
          <div className="content-container py-20 text-center">
            <p className="text-base mb-4" style={{ color: "var(--danger)" }}>{dataError}</p>
            <button
              onClick={loadData}
              className="text-white text-base font-semibold pill-button"
              style={{ background: "var(--primary)", padding: "14px 28px" }}
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="content-below-header pb-24 lg:pb-8">
        <div className="content-container py-8">
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
                className="px-4 py-2 text-sm font-medium transition-colors min-h-[44px]"
                style={{
                  background: viewMode === "list" ? "var(--primary)" : "var(--card)",
                  color: viewMode === "list" ? "#fff" : "var(--text-muted)",
                }}
              >
                List
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className="px-4 py-2 text-sm font-medium transition-colors min-h-[44px]"
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
            <div className="space-y-12">
              {months.map((m) => {
                const bonus = calculateBonus(m.adc.averageDailyCensus);
                const isExpanded = expandedMonth === m.adc.month;

                return (
                  <div key={m.adc.month} className="card card-flush overflow-hidden">
                    <button
                      onClick={() => setExpandedMonth(isExpanded ? null : m.adc.month)}
                      className="w-full p-5 flex items-center justify-between text-center"
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
                        <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 mt-4 mb-4">
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
                          {bonus.amount > 0 && (
                            <div
                              className="rounded-xl p-3 text-center col-span-3 lg:col-span-1"
                              style={{ background: "var(--status-rta-bg)" }}
                            >
                              <p className="text-xl font-bold" style={{ color: "var(--status-rta)" }}>
                                {formatCurrency(bonus.amount)}
                              </p>
                              <p className="text-sm" style={{ color: "var(--status-rta)" }}>
                                Bonus{bonus.tier && ` (${bonus.tier.adcThreshold}+)`}
                              </p>
                            </div>
                          )}
                        </div>

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
              <div className="card mb-12">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
                    className="p-2 rounded-full transition min-w-[48px] min-h-[48px] flex items-center justify-center"
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
                    className={`p-2 rounded-full transition min-w-[48px] min-h-[48px] flex items-center justify-center ${isCurrentMonth ? "opacity-30" : ""}`}
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
              <div className="card">
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
                    <div className="grid grid-cols-7 gap-1 lg:gap-2 mb-2">
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
                    <div className="grid grid-cols-7 gap-1 lg:gap-2">
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
                                className="text-sm lg:text-base font-bold leading-tight mt-0.5"
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
                                    className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full"
                                    style={{ background: "var(--status-admit)" }}
                                  />
                                )}
                                {day.discharges.length > 0 && (
                                  <div
                                    className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full"
                                    style={{ background: "var(--status-discharge)" }}
                                  />
                                )}
                                {day.rtas.length > 0 && (
                                  <div
                                    className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full"
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

        {/* ========== DAY DETAIL MODAL ========== */}
        {selectedDay && (
          <DayDetailModal day={selectedDay} onClose={() => setSelectedDay(null)} />
        )}
      </div>
    </AppLayout>
  );
}

// ── Day detail: bottom sheet on mobile, centered modal on desktop ──

function DayDetailModal({ day, onClose }: { day: DayCensusData; onClose: () => void }) {
  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ background: "var(--overlay)" }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl max-h-[80vh] overflow-y-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:right-auto lg:w-full lg:max-w-lg lg:rounded-2xl lg:-translate-x-1/2 lg:-translate-y-1/2"
        style={{
          background: "var(--card)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
        }}
      >
        {/* Drag handle - mobile only */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "var(--border)" }}
          />
        </div>

        <div className="px-6 pb-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                {format(new Date(day.date + "T12:00:00"), "EEEE, MMM d")}
              </h3>
              {day.endingCensus !== -1 && (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Ending Census: <span className="font-semibold" style={{ color: "var(--text)" }}>{day.endingCensus}</span>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                {day.admissions.length}
              </p>
              <p className="text-xs font-medium" style={{ color: "var(--status-admit)" }}>Admits</p>
            </div>
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: "var(--status-discharge-bg)" }}
            >
              <p className="text-xl font-bold" style={{ color: "var(--status-discharge)" }}>
                {day.discharges.length}
              </p>
              <p className="text-xs font-medium" style={{ color: "var(--status-discharge)" }}>D/C</p>
            </div>
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: "var(--status-rta-bg)" }}
            >
              <p className="text-xl font-bold" style={{ color: "var(--status-rta)" }}>
                {day.rtas.length}
              </p>
              <p className="text-xs font-medium" style={{ color: "var(--status-rta)" }}>RTA</p>
            </div>
          </div>

          {/* Admission Details */}
          {day.admissions.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--status-admit)" }}>
                Admissions
              </p>
              {day.admissions.map((a) => (
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
          {day.discharges.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--status-discharge)" }}>
                Discharges
              </p>
              {day.discharges.map((d) => (
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
          {day.rtas.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--status-rta)" }}>
                Returns to Acute
              </p>
              {day.rtas.map((r) => (
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
          {day.admissions.length === 0 &&
            day.discharges.length === 0 &&
            day.rtas.length === 0 && (
              <p className="text-center py-6 text-base" style={{ color: "var(--text-muted)" }}>
                No activity for this day
              </p>
            )}
        </div>
      </div>
    </>
  );
}
