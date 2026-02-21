"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AutocompleteInput from "@/components/AutocompleteInput";
import { useHistory } from "@/hooks/useHistory";
import type { DayCensusData } from "@/hooks/useHistory";
import { useAuth } from "@/contexts/AuthContext";
import { calculateBonus, formatCurrency } from "@/lib/bonus";
import {
  addAdmission, updateAdmission, deleteAdmission,
  addDischarge, updateDischarge, deleteDischarge,
  addRTA, updateRTA, deleteRTA,
  getHospitalNames, saveHospitalIfNew,
  recordActivity,
} from "@/lib/census";
import { Admission, Discharge, RTA } from "@/lib/types";
import {
  PATIENT_TYPES, CLINICAL_LIAISONS,
  DISCHARGE_TYPES,
  RTA_HOSPITALS, RTA_REASONS,
} from "@/lib/config";
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
    loadData,
    loadCalendarData,
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
      });
    } else if (type === "discharge") {
      setAddValues({ dischargeType: DISCHARGE_TYPES[0], dischargeName: "" });
    } else if (type === "rta") {
      setAddValues({ hospital: RTA_HOSPITALS[0], reason: RTA_REASONS[0] });
    }
  }

  // ── Submit add ──
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const base = { date: localDay.date, createdBy: user.uid, createdAt: new Date().toISOString() };
      if (addForm === "admission") {
        const id = await addAdmission({ ...base, hospitalName: addValues.hospitalName.trim(), patientType: addValues.patientType as Admission["patientType"], clinicalLiaison: addValues.clinicalLiaison as Admission["clinicalLiaison"] });
        setLocalDay((prev) => ({ ...prev, admissions: [...prev.admissions, { id, ...base, hospitalName: addValues.hospitalName.trim(), patientType: addValues.patientType as Admission["patientType"], clinicalLiaison: addValues.clinicalLiaison as Admission["clinicalLiaison"] }] }));
        recordActivity({ type: "Admit", patientName: addValues.hospitalName.trim(), liaisonName: profile?.name ?? "", userUID: user.uid }).catch(() => {});
        saveHospitalIfNew(addValues.hospitalName).catch(() => {});
      } else if (addForm === "discharge") {
        const id = await addDischarge({ ...base, dischargeType: addValues.dischargeType as Discharge["dischargeType"], dischargeName: addValues.dischargeName.trim() });
        setLocalDay((prev) => ({ ...prev, discharges: [...prev.discharges, { id, ...base, dischargeType: addValues.dischargeType as Discharge["dischargeType"], dischargeName: addValues.dischargeName.trim() }] }));
        recordActivity({ type: "DC", patientName: addValues.dischargeName.trim(), liaisonName: profile?.name ?? "", userUID: user.uid }).catch(() => {});
      } else if (addForm === "rta") {
        const id = await addRTA({ ...base, hospital: addValues.hospital as RTA["hospital"], reason: addValues.reason as RTA["reason"] });
        setLocalDay((prev) => ({ ...prev, rtas: [...prev.rtas, { id, ...base, hospital: addValues.hospital as RTA["hospital"], reason: addValues.reason as RTA["reason"] }] }));
        recordActivity({ type: "RTA", patientName: addValues.hospital, liaisonName: profile?.name ?? "", userUID: user.uid }).catch(() => {});
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
    setEditState({ type: "admission", id: a.id, values: { hospitalName: a.hospitalName, patientType: a.patientType, clinicalLiaison: a.clinicalLiaison } });
  }
  function startEditDischarge(d: Discharge) {
    setAddForm(null);
    setEditState({ type: "discharge", id: d.id, values: { dischargeType: d.dischargeType, dischargeName: d.dischargeName } });
  }
  function startEditRTA(r: RTA) {
    setAddForm(null);
    setEditState({ type: "rta", id: r.id, values: { hospital: r.hospital, reason: r.reason } });
  }

  // ── Submit edit ──
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editState) return;
    setSubmitting(true);
    try {
      if (editState.type === "admission") {
        await updateAdmission(editState.id, { hospitalName: editState.values.hospitalName.trim(), patientType: editState.values.patientType as Admission["patientType"], clinicalLiaison: editState.values.clinicalLiaison as Admission["clinicalLiaison"] });
        setLocalDay((prev) => ({ ...prev, admissions: prev.admissions.map((a) => a.id === editState.id ? { ...a, hospitalName: editState.values.hospitalName.trim(), patientType: editState.values.patientType as Admission["patientType"], clinicalLiaison: editState.values.clinicalLiaison as Admission["clinicalLiaison"] } : a) }));
        saveHospitalIfNew(editState.values.hospitalName).catch(() => {});
      } else if (editState.type === "discharge") {
        await updateDischarge(editState.id, { dischargeType: editState.values.dischargeType as Discharge["dischargeType"], dischargeName: editState.values.dischargeName.trim() });
        setLocalDay((prev) => ({ ...prev, discharges: prev.discharges.map((d) => d.id === editState.id ? { ...d, dischargeType: editState.values.dischargeType as Discharge["dischargeType"], dischargeName: editState.values.dischargeName.trim() } : d) }));
      } else if (editState.type === "rta") {
        await updateRTA(editState.id, { hospital: editState.values.hospital as RTA["hospital"], reason: editState.values.reason as RTA["reason"] });
        setLocalDay((prev) => ({ ...prev, rtas: prev.rtas.map((r) => r.id === editState.id ? { ...r, hospital: editState.values.hospital as RTA["hospital"], reason: editState.values.reason as RTA["reason"] } : r) }));
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
