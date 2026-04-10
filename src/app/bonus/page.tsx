"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import AppLayout from "@/components/AppLayout";
import {
  calculateMonthlyADC,
  setBonusOverride,
  clearBonusOverride,
} from "@/lib/census";
import { BONUS_TIERS, formatCurrency } from "@/lib/bonus";
import { MonthlyADC } from "@/lib/types";
import { subMonths } from "date-fns";
import { generateBonusPDF, generateBonusReportPDF } from "@/lib/pdfGenerator";

export default function BonusPage() {
  const { user, profile, loading } = useAuthGuard();
  const [currentMonth, setCurrentMonth] = useState<MonthlyADC | null>(null);
  const [previousMonths, setPreviousMonths] = useState<MonthlyADC[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [editingMonth, setEditingMonth] = useState<MonthlyADC | null>(null);

  // All authenticated users can edit bonus overrides so everyone can
  // adjust values and print accurate bonus reports.
  const canEdit = Boolean(user);

  const loadData = useCallback(async () => {
    try {
      setDataLoading(true);
      setDataError(null);
      const now = new Date();

      // Load each month independently via allSettled so a single flaky fetch
      // (e.g. a cold cache read on a slow mobile connection) doesn't wipe out
      // all 7 months of bonus data.  We only surface an error if EVERY month
      // failed — otherwise we show whatever loaded successfully.
      const monthPromises = Array.from({ length: 7 }, (_, i) => {
        const d = i === 0 ? now : subMonths(now, i);
        return calculateMonthlyADC(d.getFullYear(), d.getMonth() + 1);
      });
      const results = await Promise.allSettled(monthPromises);

      const [currentResult, ...prevResults] = results;
      const current =
        currentResult.status === "fulfilled" ? currentResult.value : null;
      const prev = prevResults
        .filter(
          (r): r is PromiseFulfilledResult<MonthlyADC> => r.status === "fulfilled"
        )
        .map((r) => r.value);

      const anyFailed = results.some((r) => r.status === "rejected");
      if (anyFailed) {
        const failures = results
          .filter((r): r is PromiseRejectedResult => r.status === "rejected")
          .map((r) => r.reason);
        console.warn("Some bonus months failed to load:", failures);
      }

      if (!current && prev.length === 0) {
        throw new Error("All months failed to load");
      }

      setCurrentMonth(current);
      setPreviousMonths(prev);
    } catch (err) {
      console.error("Failed to load bonus data:", err);
      setDataError("Failed to load bonus data. Please check your connection and try again.");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  async function handleGeneratePDF(monthData: MonthlyADC) {
    if (!profile) return;
    setGeneratingPDF(true);
    setPdfError(null);
    try {
      await generateBonusPDF({
        userName: profile.name,
        userEmail: profile.email,
        userTitle: profile.title,
        month: monthData.monthName,
        adc: monthData.averageDailyCensus,
        bonusAmount: monthData.bonusAmount,
      });
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      setPdfError("Failed to generate PDF. Please try again.");
    } finally {
      setGeneratingPDF(false);
    }
  }

  async function handleSaveOverride(
    monthData: MonthlyADC,
    override: { averageDailyCensus?: number | null; bonusAmount?: number | null }
  ) {
    const [y, m] = monthData.month.split("-").map(Number);
    await setBonusOverride(y, m, override, profile?.email ?? user?.email ?? "unknown");
    setEditingMonth(null);
    await loadData();
  }

  async function handleClearOverride(monthData: MonthlyADC) {
    const [y, m] = monthData.month.split("-").map(Number);
    await clearBonusOverride(y, m);
    setEditingMonth(null);
    await loadData();
  }

  async function handleExportReport(monthData: MonthlyADC) {
    if (!profile) return;
    setGeneratingReport(true);
    setPdfError(null);
    try {
      await generateBonusReportPDF({
        userName: profile.name,
        userEmail: profile.email,
        userTitle: profile.title,
        facility: "SL Specialty Hospital",
        month: monthData.monthName,
        year: monthData.year,
        adc: monthData.averageDailyCensus,
        bonusAmount: monthData.bonusAmount,
        daysTracked: monthData.daysInMonth,
        totalCensusDays: monthData.totalCensusDays,
      });
    } catch (err) {
      console.error("Failed to generate report PDF:", err);
      setPdfError("Failed to generate report. Please try again.");
    } finally {
      setGeneratingReport(false);
    }
  }

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}></div>
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

  // Use values straight from MonthlyADC so any super-user override is respected.
  const currentBonusAmount = currentMonth?.bonusAmount ?? 0;
  const currentBonusTier = currentMonth?.bonusTier ?? null;

  return (
    <AppLayout>
      <div className="content-below-header pb-24 lg:pb-8">
        <div className="content-container py-8">
          {pdfError && (
            <div className="rounded-xl p-4 mb-12 text-center text-base font-medium" style={{ background: "var(--status-discharge-bg)", border: "1px solid var(--status-discharge)", color: "var(--status-discharge)" }}>
              {pdfError}
            </div>
          )}

          {/* Desktop: 2-column layout */}
          <div className="lg:grid lg:grid-cols-2 lg:gap-8">
            {/* Left column: Hero + Tier chart */}
            <div>
              {/* Current Month Bonus */}
              <div className="card text-white mb-12 shadow-lg" style={{ border: "none", background: "linear-gradient(to bottom right, #f59e0b, #d97706)" }}>
                <p className="text-white/80 text-base mb-1 text-center lg:text-left">
                  {currentMonth?.monthName} Projected Bonus
                </p>
                <p className="text-5xl font-bold mb-2 text-center lg:text-left">
                  {formatCurrency(currentBonusAmount)}
                </p>
                <p className="text-white/70 text-base text-center lg:text-left">
                  ADC: {currentMonth?.averageDailyCensus.toFixed(1)}
                  {currentBonusTier && ` (${currentBonusTier.adcThreshold}+ tier)`}
                </p>
                {canEdit && currentMonth && (
                  <button
                    onClick={() => setEditingMonth(currentMonth)}
                    className="mt-3 bg-white/10 hover:bg-white/20 text-white/90 text-sm font-medium transition w-full max-w-[400px] mx-auto block pill-button"
                    style={{ padding: "10px 24px" }}
                  >
                    Edit ADC / Bonus
                  </button>
                )}
                {currentMonth && (
                  <button
                    onClick={() => handleExportReport(currentMonth)}
                    disabled={generatingReport}
                    className="mt-5 bg-white/20 hover:bg-white/30 text-white text-base font-semibold transition w-full max-w-[400px] mx-auto flex items-center justify-center gap-2 pill-button"
                    style={{ padding: "14px 28px" }}
                  >
                    {generatingReport ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Export Monthly Report
                      </>
                    )}
                  </button>
                )}
                {currentMonth && currentBonusAmount > 0 && (
                  <button
                    onClick={() => handleGeneratePDF(currentMonth)}
                    disabled={generatingPDF}
                    className="mt-3 bg-white/10 hover:bg-white/20 text-white/90 text-sm font-medium transition w-full max-w-[400px] mx-auto block pill-button"
                    style={{ padding: "10px 24px" }}
                  >
                    {generatingPDF ? "Generating..." : "Generate Submission Form (PDF)"}
                  </button>
                )}
              </div>

              {/* Tier Chart */}
              <div className="card mb-12">
                <h2 className="text-lg font-semibold mb-4 text-center lg:text-left" style={{ color: "var(--text)" }}>Bonus Tiers</h2>
                <div className="space-y-3">
                  {[...BONUS_TIERS].reverse().map((tier) => {
                    const isActive =
                      currentMonth &&
                      currentMonth.averageDailyCensus >= tier.adcThreshold;
                    const isCurrent = currentBonusTier?.adcThreshold === tier.adcThreshold;
                    return (
                      <div
                        key={tier.adcThreshold}
                        className="flex items-center justify-between p-4 rounded-xl transition"
                        style={{
                          background: isCurrent
                            ? "var(--status-rta-bg)"
                            : isActive
                            ? "var(--status-admit-bg)"
                            : "var(--surface)",
                          border: isCurrent
                            ? "2px solid var(--status-rta)"
                            : isActive
                            ? "1px solid var(--status-admit)"
                            : "1px solid var(--border)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{
                              background: isCurrent
                                ? "var(--status-rta)"
                                : isActive
                                ? "var(--status-admit)"
                                : "var(--text-muted)",
                            }}
                          />
                          <span
                            className="text-base font-medium"
                            style={{ color: isActive ? "var(--text)" : "var(--text-muted)" }}
                          >
                            {tier.adcThreshold} ADC
                          </span>
                        </div>
                        <span
                          className="text-base font-semibold"
                          style={{
                            color: isCurrent
                              ? "var(--status-rta)"
                              : isActive
                              ? "var(--success)"
                              : "var(--text-muted)",
                          }}
                        >
                          {formatCurrency(tier.bonusAmount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right column: Previous Months */}
            <div>
              <div className="card">
                <h2 className="text-lg font-semibold mb-4 text-center lg:text-left" style={{ color: "var(--text)" }}>Previous Months</h2>
                {previousMonths.length === 0 ? (
                  <p className="text-base text-center py-6" style={{ color: "var(--text-muted)" }}>No previous data</p>
                ) : (
                  <div className="space-y-3">
                    {previousMonths.map((m) => {
                      return (
                        <div
                          key={m.month}
                          className="flex items-center justify-between py-4 border-b last:border-0"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <div>
                            <p className="text-base font-medium" style={{ color: "var(--text)" }}>{m.monthName}</p>
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>ADC: {m.averageDailyCensus.toFixed(1)}</p>
                          </div>
                          <div className="text-right">
                            <p
                              className="text-base font-semibold"
                              style={{ color: m.bonusAmount > 0 ? "var(--success)" : "var(--text-muted)" }}
                            >
                              {formatCurrency(m.bonusAmount)}
                            </p>
                            <div className="flex gap-3 mt-1 justify-end flex-wrap">
                              <button
                                onClick={() => handleExportReport(m)}
                                className="text-sm"
                                style={{ color: "var(--accent)" }}
                              >
                                Report
                              </button>
                              {m.bonusAmount > 0 && (
                                <button
                                  onClick={() => handleGeneratePDF(m)}
                                  className="text-sm"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  Form
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  onClick={() => setEditingMonth(m)}
                                  className="text-sm"
                                  style={{ color: "var(--primary)" }}
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {canEdit && editingMonth && (
        <BonusEditModal
          monthData={editingMonth}
          onClose={() => setEditingMonth(null)}
          onSave={handleSaveOverride}
          onClear={handleClearOverride}
        />
      )}
    </AppLayout>
  );
}

function BonusEditModal({
  monthData,
  onClose,
  onSave,
  onClear,
}: {
  monthData: MonthlyADC;
  onClose: () => void;
  onSave: (
    monthData: MonthlyADC,
    override: { averageDailyCensus?: number | null; bonusAmount?: number | null }
  ) => Promise<void>;
  onClear: (monthData: MonthlyADC) => Promise<void>;
}) {
  const [adcInput, setAdcInput] = useState<string>(monthData.averageDailyCensus.toFixed(2));
  const [bonusInput, setBonusInput] = useState<string>(String(monthData.bonusAmount));
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedAdc = adcInput.trim();
    const trimmedBonus = bonusInput.trim();

    const adcValue = trimmedAdc === "" ? null : Number(trimmedAdc);
    const bonusValue = trimmedBonus === "" ? null : Number(trimmedBonus);

    if (adcValue !== null && (!Number.isFinite(adcValue) || adcValue < 0)) {
      setError("ADC must be a non-negative number.");
      return;
    }
    if (bonusValue !== null && (!Number.isFinite(bonusValue) || bonusValue < 0)) {
      setError("Bonus amount must be a non-negative number.");
      return;
    }

    try {
      setSaving(true);
      await onSave(monthData, { averageDailyCensus: adcValue, bonusAmount: bonusValue });
    } catch (err) {
      console.error("Failed to save bonus override:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
        setError("Permission denied. Please sign out and sign back in, then try again.");
      } else if (msg.includes("timed out")) {
        setError("Save timed out — check your connection and try again.");
      } else {
        setError(`Failed to save: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleClearClick() {
    setError(null);
    try {
      setClearing(true);
      await onClear(monthData);
    } catch (err) {
      console.error("Failed to clear bonus override:", err);
      setError("Failed to reset. Please try again.");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md"
        style={{ background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text)" }}>
          Edit {monthData.monthName}
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          Override the calculated ADC and/or bonus amount. Leave a field blank to use
          the calculated value.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--text)" }}
              htmlFor="override-adc"
            >
              Average Daily Census (ADC)
            </label>
            <input
              id="override-adc"
              type="number"
              step="0.01"
              min="0"
              value={adcInput}
              onChange={(e) => setAdcInput(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-base"
              style={{
                background: "var(--bg)",
                color: "var(--text)",
                border: "1px solid var(--border)",
              }}
              placeholder="e.g. 32.5"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--text)" }}
              htmlFor="override-bonus"
            >
              Bonus Amount ($)
            </label>
            <input
              id="override-bonus"
              type="number"
              step="1"
              min="0"
              value={bonusInput}
              onChange={(e) => setBonusInput(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-base"
              style={{
                background: "var(--bg)",
                color: "var(--text)",
                border: "1px solid var(--border)",
              }}
              placeholder="e.g. 5000"
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Overriding the bonus amount takes precedence over the tier calculation.
            </p>
          </div>
          {error && (
            <p className="text-sm" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || clearing}
              className="text-white text-base font-semibold pill-button w-full"
              style={{ background: "var(--primary)", padding: "14px 28px" }}
            >
              {saving ? "Saving..." : "Save Override"}
            </button>
            <button
              type="button"
              onClick={handleClearClick}
              disabled={saving || clearing}
              className="text-base font-medium pill-button w-full"
              style={{
                background: "transparent",
                color: "var(--danger)",
                border: "1px solid var(--danger)",
                padding: "12px 24px",
              }}
            >
              {clearing ? "Resetting..." : "Reset to Calculated Values"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving || clearing}
              className="text-base font-medium w-full"
              style={{ color: "var(--text-muted)", padding: "10px" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
