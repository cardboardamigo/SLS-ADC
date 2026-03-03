"use client";

import { useState, useRef, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import AutocompleteInput from "@/components/AutocompleteInput";
import { useHistory } from "@/hooks/useHistory";
import type { DayCensusData, SearchCategory } from "@/hooks/useHistory";
import { useAuth } from "@/contexts/AuthContext";
import { calculateBonus, formatCurrency } from "@/lib/bonus";
import {
  addAdmission, updateAdmission, deleteAdmission,
  addDischarge, updateDischarge, deleteDischarge,
  addRTA, updateRTA, deleteRTA,
  getHospitalNames, saveHospitalIfNew,
  getInsuranceNames, saveInsuranceIfNew,
  recordActivity,
} from "@/lib/census";
import { Admission, Discharge, RTA } from "@/lib/types";
import {
  PATIENT_TYPES, CLINICAL_LIAISONS,
  DISCHARGE_TYPES,
  RTA_HOSPITALS, RTA_REASONS,
  INSURANCE_TYPES,
} from "@/lib/config";
import { generateSearchReportPDF } from "@/lib/pdfGenerator";
import { subMonths, addMonths, format } from "date-fns";

function groupBy<T>(items: T[], field: keyof T): [string, number][] {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = String(item[field]) || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function GroupedSummary({ title, groups, color }: { title: string; groups: [string, number][]; color: string }) {
  if (groups.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
        {title}
      </p>
      <div className="space-y-1">
        {groups.map(([name, count]) => (
          <div
            key={name}
            className="flex items-center justify-between py-1.5 px-3 rounded-lg"
            style={{ background: "var(--surface)" }}
          >
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{name}</span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: color, color: "#fff" }}
            >
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    searchFilters,
    searchResults,
    searchLoading,
    hasSearched,
    updateSearchFilter,
    executeSearch,
    resetSearchFilters,
    loadData,
    loadCalendarData,
  } = useHistory();

  const chartRef = useRef<SVGSVGElement>(null);
  const [exporting, setExporting] = useState(false);

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
              {viewMode === "list" ? "Monthly History" : viewMode === "calendar" ? "Census Calendar" : "Search & Export"}
            </h2>
            <div
              className="flex rounded-full overflow-hidden border"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                onClick={() => setViewMode("list")}
                className="px-3 py-2 text-sm font-medium transition-colors min-h-[44px]"
                style={{
                  background: viewMode === "list" ? "var(--primary)" : "var(--card)",
                  color: viewMode === "list" ? "#fff" : "var(--text-muted)",
                }}
              >
                List
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className="px-3 py-2 text-sm font-medium transition-colors min-h-[44px]"
                style={{
                  background: viewMode === "calendar" ? "var(--primary)" : "var(--card)",
                  color: viewMode === "calendar" ? "#fff" : "var(--text-muted)",
                }}
              >
                Calendar
              </button>
              <button
                onClick={() => setViewMode("search")}
                className="px-3 py-2 text-sm font-medium transition-colors min-h-[44px]"
                style={{
                  background: viewMode === "search" ? "var(--primary)" : "var(--card)",
                  color: viewMode === "search" ? "#fff" : "var(--text-muted)",
                }}
              >
                Search
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
                  <div key={m.adc.month} className="card overflow-hidden">
                    <button
                      onClick={() => setExpandedMonth(isExpanded ? null : m.adc.month)}
                      className="w-full flex items-center justify-between text-center"
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
                        className="border-t pt-4"
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

                        {/* Grouped summaries */}
                        <GroupedSummary
                          title="Admissions by Hospital"
                          groups={groupBy(m.admissions, "hospitalName")}
                          color="var(--status-admit)"
                        />
                        <GroupedSummary
                          title="Admissions by Patient Type"
                          groups={groupBy(m.admissions, "patientType")}
                          color="var(--status-admit)"
                        />
                        <GroupedSummary
                          title="Discharges by Facility Type"
                          groups={groupBy(m.discharges, "dischargeType")}
                          color="var(--status-discharge)"
                        />
                        <GroupedSummary
                          title="Discharges by Name"
                          groups={groupBy(m.discharges, "dischargeName")}
                          color="var(--status-discharge)"
                        />
                        <GroupedSummary
                          title="RTAs by Reason"
                          groups={groupBy(m.rtas, "reason")}
                          color="var(--status-rta)"
                        />
                        <GroupedSummary
                          title="RTAs by Facility"
                          groups={groupBy(m.rtas, "hospital")}
                          color="var(--status-rta)"
                        />

                        {/* Detailed activity lists */}
                        {m.admissions.length > 0 && (
                          <div className="mt-6 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                            <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                              All Admissions
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
                              All Discharges
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
                              All Returns to Acute
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
                        const isClickable = !isFuture;

                        return (
                          <button
                            key={day.date}
                            onClick={() => isClickable && setSelectedDay(day)}
                            disabled={!isClickable}
                            className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${
                              isClickable ? "cursor-pointer active:scale-95" : "cursor-default"
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

          {/* ========== SEARCH VIEW ========== */}
          {viewMode === "search" && (
            <SearchView
              searchFilters={searchFilters}
              searchResults={searchResults}
              searchLoading={searchLoading}
              hasSearched={hasSearched}
              updateSearchFilter={updateSearchFilter}
              executeSearch={executeSearch}
              resetSearchFilters={resetSearchFilters}
              chartRef={chartRef}
              exporting={exporting}
              setExporting={setExporting}
            />
          )}
        </div>

        {/* ========== DAY DETAIL MODAL ========== */}
        {selectedDay && (
          <DayDetailModal
            day={selectedDay}
            onClose={() => setSelectedDay(null)}
            onDataChanged={async () => {
              await loadCalendarData();
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}

// ── SVG Line Chart ──────────────────────────────────────────────────────

function LineChart({
  items,
  dateField,
  color,
  label,
  svgRef,
}: {
  items: { date: string }[];
  dateField: string;
  color: string;
  label: string;
  svgRef?: React.Ref<SVGSVGElement>;
}) {
  if (items.length === 0) return null;

  // Group by date and count
  const counts: Record<string, number> = {};
  for (const item of items) {
    const d = (item as Record<string, string>)[dateField] || "";
    counts[d] = (counts[d] || 0) + 1;
  }

  const sortedDates = Object.keys(counts).sort();
  const values = sortedDates.map((d) => counts[d]);
  const maxVal = Math.max(...values, 1);

  const W = 600;
  const H = 200;
  const padL = 40;
  const padR = 20;
  const padT = 20;
  const padB = 50;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const xStep = sortedDates.length > 1 ? chartW / (sortedDates.length - 1) : chartW / 2;

  const points = sortedDates.map((_, i) => {
    const x = padL + (sortedDates.length > 1 ? i * xStep : chartW / 2);
    const y = padT + chartH - (values[i] / maxVal) * chartH;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Show every Nth label to avoid crowding
  const labelStep = Math.max(1, Math.floor(sortedDates.length / 8));

  return (
    <div className="card mt-4 overflow-x-auto">
      <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>
        {label} Over Time ({items.length} total)
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: 320, maxHeight: 260, background: "var(--card)" }}
      >
        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padT + chartH - frac * chartH;
          const val = Math.round(frac * maxVal);
          return (
            <g key={frac}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--border)" strokeWidth={0.5} />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="var(--text-muted)">
                {val}
              </text>
            </g>
          );
        })}

        {/* Line */}
        <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Area fill */}
        <path
          d={`${linePath} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`}
          fill={color}
          opacity={0.08}
        />

        {/* Dots + X labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill={color} />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize={9} fill="var(--text)" fontWeight="600">
              {values[i]}
            </text>
            {i % labelStep === 0 && (
              <text
                x={p.x}
                y={padT + chartH + 16}
                textAnchor="middle"
                fontSize={8}
                fill="var(--text-muted)"
                transform={`rotate(-35 ${p.x} ${padT + chartH + 16})`}
              >
                {sortedDates[i].substring(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Search View Component ───────────────────────────────────────────────

function SearchView({
  searchFilters,
  searchResults,
  searchLoading,
  hasSearched,
  updateSearchFilter,
  executeSearch,
  resetSearchFilters,
  chartRef,
  exporting,
  setExporting,
}: {
  searchFilters: ReturnType<typeof import("@/hooks/useHistory").useHistory>["searchFilters"];
  searchResults: ReturnType<typeof import("@/hooks/useHistory").useHistory>["searchResults"];
  searchLoading: boolean;
  hasSearched: boolean;
  updateSearchFilter: ReturnType<typeof import("@/hooks/useHistory").useHistory>["updateSearchFilter"];
  executeSearch: () => Promise<void>;
  resetSearchFilters: () => void;
  chartRef: React.RefObject<SVGSVGElement | null>;
  exporting: boolean;
  setExporting: (v: boolean) => void;
}) {
  const inputStyle: React.CSSProperties = {
    background: "var(--input-bg)",
    borderColor: "var(--border)",
    color: "var(--text)",
    borderRadius: "12px",
    padding: "10px 14px",
    width: "100%",
    fontSize: "0.875rem",
  };

  const categoryTabs: { key: SearchCategory; label: string; color: string }[] = [
    { key: "admissions", label: "Admissions", color: "var(--status-admit)" },
    { key: "discharges", label: "Discharges", color: "var(--status-discharge)" },
    { key: "rtas", label: "RTAs", color: "var(--status-rta)" },
  ];

  const currentTab = categoryTabs.find((t) => t.key === searchFilters.category)!;
  const resultCount =
    searchResults.admissions.length + searchResults.discharges.length + searchResults.rtas.length;

  const handleExportPDF = useCallback(async () => {
    setExporting(true);
    try {
      let chartImageDataUrl: string | undefined;
      if (searchFilters.showChart && chartRef.current) {
        const svgEl = chartRef.current;
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 1200, 400);
          const img = new Image();
          const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          await new Promise<void>((resolve) => {
            img.onload = () => {
              ctx.drawImage(img, 0, 0, 1200, 400);
              URL.revokeObjectURL(url);
              chartImageDataUrl = canvas.toDataURL("image/png");
              resolve();
            };
            img.onerror = () => {
              URL.revokeObjectURL(url);
              resolve();
            };
            img.src = url;
          });
        }
      }

      const filtersDesc: string[] = [];
      if (searchFilters.category === "admissions") {
        if (searchFilters.clinicalLiaison) filtersDesc.push(`CL: ${searchFilters.clinicalLiaison}`);
        if (searchFilters.hospital) filtersDesc.push(`Hospital: ${searchFilters.hospital}`);
        if (searchFilters.patientType) filtersDesc.push(`Type: ${searchFilters.patientType}`);
      } else if (searchFilters.category === "discharges") {
        if (searchFilters.dischargeType) filtersDesc.push(`Type: ${searchFilters.dischargeType}`);
        if (searchFilters.facilityName) filtersDesc.push(`Facility: ${searchFilters.facilityName}`);
      } else {
        if (searchFilters.rtaReason) filtersDesc.push(`Reason: ${searchFilters.rtaReason}`);
        if (searchFilters.rtaLocation) filtersDesc.push(`Location: ${searchFilters.rtaLocation}`);
      }

      const titleMap: Record<SearchCategory, string> = {
        admissions: "Admissions Report",
        discharges: "Discharges Report",
        rtas: "RTAs Report",
      };

      await generateSearchReportPDF({
        title: titleMap[searchFilters.category],
        dateRange: `${searchFilters.startDate} to ${searchFilters.endDate}`,
        filters: filtersDesc.join(", ") || "None",
        admissions: searchResults.admissions.length > 0 ? searchResults.admissions : undefined,
        discharges: searchResults.discharges.length > 0 ? searchResults.discharges : undefined,
        rtas: searchResults.rtas.length > 0 ? searchResults.rtas : undefined,
        chartImageDataUrl,
      });
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [searchFilters, searchResults, chartRef, setExporting]);

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="card">
        <div className="flex rounded-xl overflow-hidden border mb-6" style={{ borderColor: "var(--border)" }}>
          {categoryTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                updateSearchFilter("category", tab.key);
                resetSearchFilters();
              }}
              className="flex-1 py-2.5 text-sm font-semibold transition-colors min-h-[44px]"
              style={{
                background: searchFilters.category === tab.key ? tab.color : "var(--card)",
                color: searchFilters.category === tab.key ? "#fff" : "var(--text-muted)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
              Start Date
            </label>
            <input
              type="date"
              value={searchFilters.startDate}
              onChange={(e) => updateSearchFilter("startDate", e.target.value)}
              className="border focus:outline-none text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
              End Date
            </label>
            <input
              type="date"
              value={searchFilters.endDate}
              onChange={(e) => updateSearchFilter("endDate", e.target.value)}
              className="border focus:outline-none text-sm"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Category-specific filters */}
        {searchFilters.category === "admissions" && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                Clinical Liaison
              </label>
              <select
                value={searchFilters.clinicalLiaison}
                onChange={(e) => updateSearchFilter("clinicalLiaison", e.target.value)}
                className="border focus:outline-none text-sm"
                style={inputStyle}
              >
                <option value="">All</option>
                {CLINICAL_LIAISONS.map((cl) => (
                  <option key={cl} value={cl}>{cl}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                Hospital
              </label>
              <input
                type="text"
                value={searchFilters.hospital}
                onChange={(e) => updateSearchFilter("hospital", e.target.value)}
                placeholder="Filter by hospital name..."
                className="border focus:outline-none text-sm"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                Patient Type
              </label>
              <select
                value={searchFilters.patientType}
                onChange={(e) => updateSearchFilter("patientType", e.target.value)}
                className="border focus:outline-none text-sm"
                style={inputStyle}
              >
                <option value="">All</option>
                {PATIENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {searchFilters.category === "discharges" && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                Discharge Type
              </label>
              <select
                value={searchFilters.dischargeType}
                onChange={(e) => updateSearchFilter("dischargeType", e.target.value)}
                className="border focus:outline-none text-sm"
                style={inputStyle}
              >
                <option value="">All</option>
                {DISCHARGE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                Facility Name
              </label>
              <input
                type="text"
                value={searchFilters.facilityName}
                onChange={(e) => updateSearchFilter("facilityName", e.target.value)}
                placeholder="Filter by facility name..."
                className="border focus:outline-none text-sm"
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {searchFilters.category === "rtas" && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                Reason
              </label>
              <select
                value={searchFilters.rtaReason}
                onChange={(e) => updateSearchFilter("rtaReason", e.target.value)}
                className="border focus:outline-none text-sm"
                style={inputStyle}
              >
                <option value="">All</option>
                {RTA_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                Location
              </label>
              <select
                value={searchFilters.rtaLocation}
                onChange={(e) => updateSearchFilter("rtaLocation", e.target.value)}
                className="border focus:outline-none text-sm"
                style={inputStyle}
              >
                <option value="">All</option>
                {RTA_HOSPITALS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Insurance filters — shared across all categories */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
              Insurance Type
            </label>
            <select
              value={searchFilters.insuranceType}
              onChange={(e) => updateSearchFilter("insuranceType", e.target.value)}
              className="border focus:outline-none text-sm"
              style={inputStyle}
            >
              <option value="">All</option>
              {INSURANCE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
              Insurance Name
            </label>
            <input
              type="text"
              value={searchFilters.insuranceName}
              onChange={(e) => updateSearchFilter("insuranceName", e.target.value)}
              placeholder="Filter by name..."
              className="border focus:outline-none text-sm"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Chart toggle */}
        {searchFilters.category === "admissions" && (
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => updateSearchFilter("showChart", !searchFilters.showChart)}
              className="flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: searchFilters.showChart ? "var(--status-admit-bg)" : "var(--surface)",
                color: searchFilters.showChart ? "var(--status-admit)" : "var(--text-muted)",
                border: `1px solid ${searchFilters.showChart ? "var(--status-admit)" : "var(--border)"}`,
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              Line Graph
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={executeSearch}
            disabled={searchLoading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
            style={{ background: currentTab.color }}
          >
            {searchLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#fff", borderTopColor: "transparent" }} />
                Searching...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                Search
              </span>
            )}
          </button>
          <button
            onClick={resetSearchFilters}
            className="py-3 px-5 rounded-xl text-sm font-medium transition-colors"
            style={{ color: "var(--text-muted)", background: "var(--surface)" }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Results */}
      {hasSearched && !searchLoading && (
        <>
          {/* Result count + export */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
              {resultCount} result{resultCount !== 1 ? "s" : ""} found
            </p>
            {resultCount > 0 && (
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: "var(--primary)" }}
              >
                {exporting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#fff", borderTopColor: "transparent" }} />
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export PDF
                  </>
                )}
              </button>
            )}
          </div>

          {/* Line Chart (admissions only) */}
          {searchFilters.showChart && searchFilters.category === "admissions" && searchResults.admissions.length > 0 && (
            <LineChart
              items={searchResults.admissions}
              dateField="date"
              color="#059669"
              label="Admissions"
              svgRef={chartRef}
            />
          )}

          {/* Admission Results */}
          {searchResults.admissions.length > 0 && (
            <div className="card">
              <p className="text-sm font-semibold mb-3" style={{ color: "var(--status-admit)" }}>
                Admissions ({searchResults.admissions.length})
              </p>
              <div className="space-y-0">
                {searchResults.admissions.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 py-2.5 border-b last:border-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--status-admit)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                        {a.hospitalName}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {a.date} &middot; {a.patientType} &middot; CL: {a.clinicalLiaison}
                        {a.insuranceType && ` \u00b7 ${a.insuranceType}${a.insuranceName ? ` (${a.insuranceName})` : ""}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discharge Results */}
          {searchResults.discharges.length > 0 && (
            <div className="card">
              <p className="text-sm font-semibold mb-3" style={{ color: "var(--status-discharge)" }}>
                Discharges ({searchResults.discharges.length})
              </p>
              <div className="space-y-0">
                {searchResults.discharges.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 py-2.5 border-b last:border-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--status-discharge)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                        {d.dischargeName}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {d.date} &middot; {d.dischargeType}
                        {d.insuranceType && ` \u00b7 ${d.insuranceType}${d.insuranceName ? ` (${d.insuranceName})` : ""}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RTA Results */}
          {searchResults.rtas.length > 0 && (
            <div className="card">
              <p className="text-sm font-semibold mb-3" style={{ color: "var(--status-rta)" }}>
                Returns to Acute ({searchResults.rtas.length})
              </p>
              <div className="space-y-0">
                {searchResults.rtas.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 py-2.5 border-b last:border-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--status-rta)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                        {r.hospital}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {r.date} &middot; {r.reason}
                        {r.insuranceType && ` \u00b7 ${r.insuranceType}${r.insuranceName ? ` (${r.insuranceName})` : ""}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {resultCount === 0 && (
            <div className="card text-center py-8">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No records found matching your search criteria.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Day detail: bottom sheet on mobile, centered modal on desktop ──

type AddFormType = "admission" | "discharge" | "rta" | null;

interface EditState {
  type: "admission" | "discharge" | "rta";
  id: string;
  values: Record<string, string>;
}

function DayDetailModal({
  day,
  onClose,
  onDataChanged,
}: {
  day: DayCensusData;
  onClose: () => void;
  onDataChanged: () => Promise<void>;
}) {
  const { user, profile } = useAuth();

  // Add form state
  const [addForm, setAddForm] = useState<AddFormType>(null);
  const [addValues, setAddValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Edit state
  const [editState, setEditState] = useState<EditState | null>(null);

  // Local copy of day data so we can update after CRUD
  const [localDay, setLocalDay] = useState(day);

  const inputStyle: React.CSSProperties = {
    background: "var(--input-bg)",
    borderColor: "var(--border)",
    color: "var(--text)",
    borderRadius: "12px",
    padding: "10px 14px",
    width: "100%",
    fontSize: "0.875rem",
  };

  function showFeedback(type: "success" | "error", msg: string) {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 2000);
  }

  // ── Open add form ──
  function openAddForm(type: AddFormType) {
    setEditState(null);
    setAddForm(type);
    if (type === "admission") {
      const defaultCL = profile?.name && CLINICAL_LIAISONS.find((cl) => profile.name?.startsWith(cl));
      setAddValues({
        hospitalName: "",
        patientType: PATIENT_TYPES[0],
        clinicalLiaison: defaultCL || CLINICAL_LIAISONS[0],
        insuranceType: "",
        insuranceName: "",
      });
    } else if (type === "discharge") {
      setAddValues({ dischargeType: DISCHARGE_TYPES[0], dischargeName: "", insuranceType: "", insuranceName: "" });
    } else if (type === "rta") {
      setAddValues({ hospital: RTA_HOSPITALS[0], reason: RTA_REASONS[0], insuranceType: "", insuranceName: "" });
    }
  }

  // ── Submit add ──
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const base = { date: localDay.date, createdBy: user.uid, createdAt: new Date().toISOString() };
      const insFields = (vals: Record<string, string>) => ({
        ...(vals.insuranceType && { insuranceType: vals.insuranceType as Admission["insuranceType"] }),
        ...(vals.insuranceName?.trim() && { insuranceName: vals.insuranceName.trim() }),
      });
      if (addForm === "admission") {
        const admData = { ...base, hospitalName: addValues.hospitalName.trim(), patientType: addValues.patientType as Admission["patientType"], clinicalLiaison: addValues.clinicalLiaison as Admission["clinicalLiaison"], ...insFields(addValues) };
        const id = await addAdmission(admData);
        setLocalDay((prev) => ({ ...prev, admissions: [...prev.admissions, { id, ...admData }] }));
        recordActivity({ type: "Admit", patientName: addValues.hospitalName.trim(), liaisonName: profile?.name ?? "", userUID: user.uid }).catch(() => {});
        saveHospitalIfNew(addValues.hospitalName).catch(() => {});
        if (addValues.insuranceName?.trim()) saveInsuranceIfNew(addValues.insuranceName).catch(() => {});
      } else if (addForm === "discharge") {
        const dcData = { ...base, dischargeType: addValues.dischargeType as Discharge["dischargeType"], dischargeName: addValues.dischargeName.trim(), ...insFields(addValues) };
        const id = await addDischarge(dcData);
        setLocalDay((prev) => ({ ...prev, discharges: [...prev.discharges, { id, ...dcData }] }));
        recordActivity({ type: "DC", patientName: addValues.dischargeName.trim(), liaisonName: profile?.name ?? "", userUID: user.uid }).catch(() => {});
        if (addValues.insuranceName?.trim()) saveInsuranceIfNew(addValues.insuranceName).catch(() => {});
      } else if (addForm === "rta") {
        const rtaData = { ...base, hospital: addValues.hospital as RTA["hospital"], reason: addValues.reason as RTA["reason"], ...insFields(addValues) };
        const id = await addRTA(rtaData);
        setLocalDay((prev) => ({ ...prev, rtas: [...prev.rtas, { id, ...rtaData }] }));
        recordActivity({ type: "RTA", patientName: addValues.hospital, liaisonName: profile?.name ?? "", userUID: user.uid }).catch(() => {});
        if (addValues.insuranceName?.trim()) saveInsuranceIfNew(addValues.insuranceName).catch(() => {});
      }
      showFeedback("success", "Saved successfully");
      setAddForm(null);
      onDataChanged();
    } catch {
      showFeedback("error", "Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Start edit ──
  function startEditAdmission(a: Admission) {
    setAddForm(null);
    setEditState({ type: "admission", id: a.id, values: { hospitalName: a.hospitalName, patientType: a.patientType, clinicalLiaison: a.clinicalLiaison, insuranceType: a.insuranceType || "", insuranceName: a.insuranceName || "" } });
  }
  function startEditDischarge(d: Discharge) {
    setAddForm(null);
    setEditState({ type: "discharge", id: d.id, values: { dischargeType: d.dischargeType, dischargeName: d.dischargeName, insuranceType: d.insuranceType || "", insuranceName: d.insuranceName || "" } });
  }
  function startEditRTA(r: RTA) {
    setAddForm(null);
    setEditState({ type: "rta", id: r.id, values: { hospital: r.hospital, reason: r.reason, insuranceType: r.insuranceType || "", insuranceName: r.insuranceName || "" } });
  }

  // ── Submit edit ──
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editState) return;
    setSubmitting(true);
    const insUpdate = (vals: Record<string, string>) => ({
      insuranceType: (vals.insuranceType || undefined) as Admission["insuranceType"],
      ...(vals.insuranceName?.trim() ? { insuranceName: vals.insuranceName.trim() } : { insuranceName: "" }),
    });
    try {
      if (editState.type === "admission") {
        const upd = { hospitalName: editState.values.hospitalName.trim(), patientType: editState.values.patientType as Admission["patientType"], clinicalLiaison: editState.values.clinicalLiaison as Admission["clinicalLiaison"], ...insUpdate(editState.values) };
        await updateAdmission(editState.id, upd);
        setLocalDay((prev) => ({ ...prev, admissions: prev.admissions.map((a) => a.id === editState.id ? { ...a, ...upd } : a) }));
        saveHospitalIfNew(editState.values.hospitalName).catch(() => {});
        if (editState.values.insuranceName?.trim()) saveInsuranceIfNew(editState.values.insuranceName).catch(() => {});
      } else if (editState.type === "discharge") {
        const upd = { dischargeType: editState.values.dischargeType as Discharge["dischargeType"], dischargeName: editState.values.dischargeName.trim(), ...insUpdate(editState.values) };
        await updateDischarge(editState.id, upd);
        setLocalDay((prev) => ({ ...prev, discharges: prev.discharges.map((d) => d.id === editState.id ? { ...d, ...upd } : d) }));
        if (editState.values.insuranceName?.trim()) saveInsuranceIfNew(editState.values.insuranceName).catch(() => {});
      } else if (editState.type === "rta") {
        const upd = { hospital: editState.values.hospital as RTA["hospital"], reason: editState.values.reason as RTA["reason"], ...insUpdate(editState.values) };
        await updateRTA(editState.id, upd);
        setLocalDay((prev) => ({ ...prev, rtas: prev.rtas.map((r) => r.id === editState.id ? { ...r, ...upd } : r) }));
        if (editState.values.insuranceName?.trim()) saveInsuranceIfNew(editState.values.insuranceName).catch(() => {});
      }
      showFeedback("success", "Updated successfully");
      setEditState(null);
      onDataChanged();
    } catch {
      showFeedback("error", "Failed to update. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ──
  async function handleDeleteAdmission(id: string) {
    if (!confirm("Delete this admission?")) return;
    try {
      await deleteAdmission(id);
      setLocalDay((prev) => ({ ...prev, admissions: prev.admissions.filter((a) => a.id !== id) }));
      if (editState?.id === id) setEditState(null);
      showFeedback("success", "Deleted");
      onDataChanged();
    } catch {
      showFeedback("error", "Failed to delete.");
    }
  }
  async function handleDeleteDischarge(id: string) {
    if (!confirm("Delete this discharge?")) return;
    try {
      await deleteDischarge(id);
      setLocalDay((prev) => ({ ...prev, discharges: prev.discharges.filter((d) => d.id !== id) }));
      if (editState?.id === id) setEditState(null);
      showFeedback("success", "Deleted");
      onDataChanged();
    } catch {
      showFeedback("error", "Failed to delete.");
    }
  }
  async function handleDeleteRTA(id: string) {
    if (!confirm("Delete this RTA?")) return;
    try {
      await deleteRTA(id);
      setLocalDay((prev) => ({ ...prev, rtas: prev.rtas.filter((r) => r.id !== id) }));
      if (editState?.id === id) setEditState(null);
      showFeedback("success", "Deleted");
      onDataChanged();
    } catch {
      showFeedback("error", "Failed to delete.");
    }
  }

  function setEditValue(key: string, value: string) {
    setEditState((prev) => prev ? { ...prev, values: { ...prev.values, [key]: value } } : prev);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ background: "var(--overlay)" }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl max-h-[85vh] overflow-y-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:right-auto lg:w-full lg:max-w-lg lg:rounded-2xl lg:-translate-x-1/2 lg:-translate-y-1/2"
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
                {format(new Date(localDay.date + "T12:00:00"), "EEEE, MMM d")}
              </h3>
              {localDay.endingCensus !== -1 && (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Ending Census: <span className="font-semibold" style={{ color: "var(--text)" }}>{localDay.endingCensus}</span>
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

          {/* Feedback banner */}
          {feedback && (
            <div
              className="rounded-xl p-3 mb-4 text-center text-sm font-medium"
              style={{
                background: feedback.type === "success" ? "var(--status-admit-bg)" : "var(--status-discharge-bg)",
                color: feedback.type === "success" ? "var(--status-admit)" : "var(--status-discharge)",
              }}
            >
              {feedback.msg}
            </div>
          )}

          {/* Summary badges */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: "var(--status-admit-bg)" }}
            >
              <p className="text-xl font-bold" style={{ color: "var(--status-admit)" }}>
                {localDay.admissions.length}
              </p>
              <p className="text-xs font-medium" style={{ color: "var(--status-admit)" }}>Admits</p>
            </div>
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: "var(--status-discharge-bg)" }}
            >
              <p className="text-xl font-bold" style={{ color: "var(--status-discharge)" }}>
                {localDay.discharges.length}
              </p>
              <p className="text-xs font-medium" style={{ color: "var(--status-discharge)" }}>D/C</p>
            </div>
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: "var(--status-rta-bg)" }}
            >
              <p className="text-xl font-bold" style={{ color: "var(--status-rta)" }}>
                {localDay.rtas.length}
              </p>
              <p className="text-xs font-medium" style={{ color: "var(--status-rta)" }}>RTA</p>
            </div>
          </div>

          {/* ── Add buttons ── */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={() => addForm === "admission" ? setAddForm(null) : openAddForm("admission")}
              className="flex items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-semibold transition-all"
              style={{
                background: addForm === "admission" ? "var(--status-admit)" : "var(--surface)",
                color: addForm === "admission" ? "#fff" : "var(--status-admit)",
                border: `1px solid ${addForm === "admission" ? "var(--status-admit)" : "var(--border)"}`,
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Admit
            </button>
            <button
              onClick={() => addForm === "discharge" ? setAddForm(null) : openAddForm("discharge")}
              className="flex items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-semibold transition-all"
              style={{
                background: addForm === "discharge" ? "var(--status-discharge)" : "var(--surface)",
                color: addForm === "discharge" ? "#fff" : "var(--status-discharge)",
                border: `1px solid ${addForm === "discharge" ? "var(--status-discharge)" : "var(--border)"}`,
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              D/C
            </button>
            <button
              onClick={() => addForm === "rta" ? setAddForm(null) : openAddForm("rta")}
              className="flex items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-semibold transition-all"
              style={{
                background: addForm === "rta" ? "var(--status-rta)" : "var(--surface)",
                color: addForm === "rta" ? "#fff" : "var(--status-rta)",
                border: `1px solid ${addForm === "rta" ? "var(--status-rta)" : "var(--border)"}`,
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              RTA
            </button>
          </div>

          {/* ── Inline add form ── */}
          {addForm === "admission" && (
            <form onSubmit={handleAdd} className="rounded-xl p-4 mb-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--status-admit)" }}>New Admission</p>
              <AutocompleteInput
                value={addValues.hospitalName || ""}
                onChange={(v) => setAddValues((p) => ({ ...p, hospitalName: v }))}
                getSuggestions={getHospitalNames}
                placeholder="Hospital name"
                className="border focus:outline-none text-sm"
                style={inputStyle}
              />
              <select
                value={addValues.patientType}
                onChange={(e) => setAddValues((p) => ({ ...p, patientType: e.target.value }))}
                className="border focus:outline-none text-sm"
                style={inputStyle}
              >
                {PATIENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={addValues.clinicalLiaison}
                onChange={(e) => setAddValues((p) => ({ ...p, clinicalLiaison: e.target.value }))}
                className="border focus:outline-none text-sm"
                style={inputStyle}
              >
                {CLINICAL_LIAISONS.map((cl) => <option key={cl} value={cl}>{cl}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={addValues.insuranceType || ""}
                  onChange={(e) => setAddValues((p) => ({ ...p, insuranceType: e.target.value }))}
                  className="border focus:outline-none text-sm"
                  style={inputStyle}
                >
                  <option value="">— Ins. Type —</option>
                  {INSURANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <AutocompleteInput
                  value={addValues.insuranceName || ""}
                  onChange={(v) => setAddValues((p) => ({ ...p, insuranceName: v }))}
                  getSuggestions={getInsuranceNames}
                  placeholder="Insurance name"
                  className="border focus:outline-none text-sm"
                  style={inputStyle}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={submitting || !addValues.hospitalName?.trim()} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--status-admit)" }}>
                  {submitting ? "Saving..." : "Save"}
                </button>
                <button type="button" onClick={() => setAddForm(null)} className="rounded-xl py-2.5 px-4 text-sm" style={{ color: "var(--text-muted)" }}>Cancel</button>
              </div>
            </form>
          )}

          {addForm === "discharge" && (
            <form onSubmit={handleAdd} className="rounded-xl p-4 mb-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--status-discharge)" }}>New Discharge</p>
              <select
                value={addValues.dischargeType}
                onChange={(e) => setAddValues((p) => ({ ...p, dischargeType: e.target.value }))}
                className="border focus:outline-none text-sm"
                style={inputStyle}
              >
                {DISCHARGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                type="text"
                value={addValues.dischargeName || ""}
                onChange={(e) => setAddValues((p) => ({ ...p, dischargeName: e.target.value }))}
                placeholder="Patient name"
                className="border focus:outline-none text-sm"
                style={inputStyle}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={addValues.insuranceType || ""}
                  onChange={(e) => setAddValues((p) => ({ ...p, insuranceType: e.target.value }))}
                  className="border focus:outline-none text-sm"
                  style={inputStyle}
                >
                  <option value="">— Ins. Type —</option>
                  {INSURANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <AutocompleteInput
                  value={addValues.insuranceName || ""}
                  onChange={(v) => setAddValues((p) => ({ ...p, insuranceName: v }))}
                  getSuggestions={getInsuranceNames}
                  placeholder="Insurance name"
                  className="border focus:outline-none text-sm"
                  style={inputStyle}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={submitting || !addValues.dischargeName?.trim()} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--status-discharge)" }}>
                  {submitting ? "Saving..." : "Save"}
                </button>
                <button type="button" onClick={() => setAddForm(null)} className="rounded-xl py-2.5 px-4 text-sm" style={{ color: "var(--text-muted)" }}>Cancel</button>
              </div>
            </form>
          )}

          {addForm === "rta" && (
            <form onSubmit={handleAdd} className="rounded-xl p-4 mb-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--status-rta)" }}>New Return to Acute</p>
              <select
                value={addValues.hospital}
                onChange={(e) => setAddValues((p) => ({ ...p, hospital: e.target.value }))}
                className="border focus:outline-none text-sm"
                style={inputStyle}
              >
                {RTA_HOSPITALS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              <select
                value={addValues.reason}
                onChange={(e) => setAddValues((p) => ({ ...p, reason: e.target.value }))}
                className="border focus:outline-none text-sm"
                style={inputStyle}
              >
                {RTA_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={addValues.insuranceType || ""}
                  onChange={(e) => setAddValues((p) => ({ ...p, insuranceType: e.target.value }))}
                  className="border focus:outline-none text-sm"
                  style={inputStyle}
                >
                  <option value="">— Ins. Type —</option>
                  {INSURANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <AutocompleteInput
                  value={addValues.insuranceName || ""}
                  onChange={(v) => setAddValues((p) => ({ ...p, insuranceName: v }))}
                  getSuggestions={getInsuranceNames}
                  placeholder="Insurance name"
                  className="border focus:outline-none text-sm"
                  style={inputStyle}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={submitting} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--status-rta)" }}>
                  {submitting ? "Saving..." : "Save"}
                </button>
                <button type="button" onClick={() => setAddForm(null)} className="rounded-xl py-2.5 px-4 text-sm" style={{ color: "var(--text-muted)" }}>Cancel</button>
              </div>
            </form>
          )}

          {/* ── Admission Details ── */}
          {localDay.admissions.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--status-admit)" }}>
                Admissions
              </p>
              {localDay.admissions.map((a) => (
                editState?.type === "admission" && editState.id === a.id ? (
                  <form key={a.id} onSubmit={handleEdit} className="rounded-xl p-3 mb-2 space-y-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <AutocompleteInput
                      value={editState.values.hospitalName || ""}
                      onChange={(v) => setEditValue("hospitalName", v)}
                      getSuggestions={getHospitalNames}
                      placeholder="Hospital name"
                      className="border focus:outline-none text-sm"
                      style={inputStyle}
                    />
                    <select value={editState.values.patientType} onChange={(e) => setEditValue("patientType", e.target.value)} className="border focus:outline-none text-sm" style={inputStyle}>
                      {PATIENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={editState.values.clinicalLiaison} onChange={(e) => setEditValue("clinicalLiaison", e.target.value)} className="border focus:outline-none text-sm" style={inputStyle}>
                      {CLINICAL_LIAISONS.map((cl) => <option key={cl} value={cl}>{cl}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={editState.values.insuranceType || ""} onChange={(e) => setEditValue("insuranceType", e.target.value)} className="border focus:outline-none text-sm" style={inputStyle}>
                        <option value="">— Ins. Type —</option>
                        {INSURANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <AutocompleteInput value={editState.values.insuranceName || ""} onChange={(v) => setEditValue("insuranceName", v)} getSuggestions={getInsuranceNames} placeholder="Insurance name" className="border focus:outline-none text-sm" style={inputStyle} />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={submitting || !editState.values.hospitalName?.trim()} className="flex-1 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--status-admit)" }}>
                        {submitting ? "Saving..." : "Update"}
                      </button>
                      <button type="button" onClick={() => setEditState(null)} className="rounded-xl py-2 px-3 text-sm" style={{ color: "var(--text-muted)" }}>Cancel</button>
                    </div>
                  </form>
                ) : (
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
                        {a.insuranceType && ` \u00b7 ${a.insuranceType}${a.insuranceName ? ` (${a.insuranceName})` : ""}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-0 flex-shrink-0">
                      <button onClick={() => startEditAdmission(a)} className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center" style={{ color: "var(--accent)" }} title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button onClick={() => handleDeleteAdmission(a.id)} className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center" style={{ color: "var(--danger)" }} title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {/* ── Discharge Details ── */}
          {localDay.discharges.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--status-discharge)" }}>
                Discharges
              </p>
              {localDay.discharges.map((d) => (
                editState?.type === "discharge" && editState.id === d.id ? (
                  <form key={d.id} onSubmit={handleEdit} className="rounded-xl p-3 mb-2 space-y-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <select value={editState.values.dischargeType} onChange={(e) => setEditValue("dischargeType", e.target.value)} className="border focus:outline-none text-sm" style={inputStyle}>
                      {DISCHARGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input type="text" value={editState.values.dischargeName || ""} onChange={(e) => setEditValue("dischargeName", e.target.value)} placeholder="Patient name" className="border focus:outline-none text-sm" style={inputStyle} />
                    <div className="grid grid-cols-2 gap-2">
                      <select value={editState.values.insuranceType || ""} onChange={(e) => setEditValue("insuranceType", e.target.value)} className="border focus:outline-none text-sm" style={inputStyle}>
                        <option value="">— Ins. Type —</option>
                        {INSURANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <AutocompleteInput value={editState.values.insuranceName || ""} onChange={(v) => setEditValue("insuranceName", v)} getSuggestions={getInsuranceNames} placeholder="Insurance name" className="border focus:outline-none text-sm" style={inputStyle} />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={submitting || !editState.values.dischargeName?.trim()} className="flex-1 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--status-discharge)" }}>
                        {submitting ? "Saving..." : "Update"}
                      </button>
                      <button type="button" onClick={() => setEditState(null)} className="rounded-xl py-2 px-3 text-sm" style={{ color: "var(--text-muted)" }}>Cancel</button>
                    </div>
                  </form>
                ) : (
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
                        {d.insuranceType && ` \u00b7 ${d.insuranceType}${d.insuranceName ? ` (${d.insuranceName})` : ""}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-0 flex-shrink-0">
                      <button onClick={() => startEditDischarge(d)} className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center" style={{ color: "var(--accent)" }} title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button onClick={() => handleDeleteDischarge(d.id)} className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center" style={{ color: "var(--danger)" }} title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {/* ── RTA Details ── */}
          {localDay.rtas.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--status-rta)" }}>
                Returns to Acute
              </p>
              {localDay.rtas.map((r) => (
                editState?.type === "rta" && editState.id === r.id ? (
                  <form key={r.id} onSubmit={handleEdit} className="rounded-xl p-3 mb-2 space-y-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <select value={editState.values.hospital} onChange={(e) => setEditValue("hospital", e.target.value)} className="border focus:outline-none text-sm" style={inputStyle}>
                      {RTA_HOSPITALS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <select value={editState.values.reason} onChange={(e) => setEditValue("reason", e.target.value)} className="border focus:outline-none text-sm" style={inputStyle}>
                      {RTA_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={editState.values.insuranceType || ""} onChange={(e) => setEditValue("insuranceType", e.target.value)} className="border focus:outline-none text-sm" style={inputStyle}>
                        <option value="">— Ins. Type —</option>
                        {INSURANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <AutocompleteInput value={editState.values.insuranceName || ""} onChange={(v) => setEditValue("insuranceName", v)} getSuggestions={getInsuranceNames} placeholder="Insurance name" className="border focus:outline-none text-sm" style={inputStyle} />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={submitting} className="flex-1 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--status-rta)" }}>
                        {submitting ? "Saving..." : "Update"}
                      </button>
                      <button type="button" onClick={() => setEditState(null)} className="rounded-xl py-2 px-3 text-sm" style={{ color: "var(--text-muted)" }}>Cancel</button>
                    </div>
                  </form>
                ) : (
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
                        {r.insuranceType && ` \u00b7 ${r.insuranceType}${r.insuranceName ? ` (${r.insuranceName})` : ""}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-0 flex-shrink-0">
                      <button onClick={() => startEditRTA(r)} className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center" style={{ color: "var(--accent)" }} title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button onClick={() => handleDeleteRTA(r.id)} className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center" style={{ color: "var(--danger)" }} title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {/* No activity message */}
          {localDay.admissions.length === 0 &&
            localDay.discharges.length === 0 &&
            localDay.rtas.length === 0 &&
            !addForm && (
              <p className="text-center py-4 text-sm" style={{ color: "var(--text-muted)" }}>
                No activity for this day. Use the buttons above to add entries.
              </p>
            )}
        </div>
      </div>
    </>
  );
}
