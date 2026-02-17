"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { calculateMonthlyADC } from "@/lib/census";
import { BONUS_TIERS, calculateBonus, formatCurrency } from "@/lib/bonus";
import { MonthlyADC } from "@/lib/types";
import { subMonths } from "date-fns";
import { generateBonusPDF } from "@/lib/pdfGenerator";

export default function BonusPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState<MonthlyADC | null>(null);
  const [previousMonths, setPreviousMonths] = useState<MonthlyADC[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setDataLoading(true);
      setDataError(null);
      const now = new Date();

      // Load current + previous 6 months in parallel
      const months = Array.from({ length: 7 }, (_, i) => {
        const d = i === 0 ? now : subMonths(now, i);
        return calculateMonthlyADC(d.getFullYear(), d.getMonth() + 1);
      });
      const [current, ...prev] = await Promise.all(months);
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
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (user) loadData();
  }, [user, loading, router, loadData]);

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

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}></div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen pb-24 content-below-header" style={{ background: "var(--bg)" }}>
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

  const currentBonus = currentMonth ? calculateBonus(currentMonth.averageDailyCensus) : { tier: null, amount: 0 };

  return (
    <div className="min-h-screen pb-24 content-below-header" style={{ background: "var(--bg)" }}>
      <Header />

      <div className="form-wrapper py-8">
        {pdfError && (
          <div className="rounded-xl p-4 mb-12 text-center text-base font-medium" style={{ background: "var(--status-discharge-bg)", border: "1px solid var(--status-discharge)", color: "var(--status-discharge)" }}>
            {pdfError}
          </div>
        )}

        {/* Current Month Bonus */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-8 text-white mb-12 shadow-lg">
          <p className="text-white/80 text-base mb-1">
            {currentMonth?.monthName} Projected Bonus
          </p>
          <p className="text-5xl font-bold mb-2">
            {formatCurrency(currentBonus.amount)}
          </p>
          <p className="text-white/70 text-base">
            ADC: {currentMonth?.averageDailyCensus.toFixed(1)}
            {currentBonus.tier && ` (${currentBonus.tier.adcThreshold}+ tier)`}
          </p>
          {currentMonth && currentBonus.amount > 0 && (
            <button
              onClick={() => handleGeneratePDF(currentMonth)}
              disabled={generatingPDF}
              className="mt-5 bg-white/20 hover:bg-white/30 text-white text-base font-semibold transition w-full max-w-[400px] mx-auto block"
              style={{ borderRadius: "50px", padding: "14px 28px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
            >
              {generatingPDF ? "Generating..." : "Generate Bonus Submission Form (PDF)"}
            </button>
          )}
        </div>

        {/* Tier Chart */}
        <div className="card p-8 mb-12">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>Bonus Tiers</h2>
          <div className="space-y-3">
            {[...BONUS_TIERS].reverse().map((tier) => {
              const isActive =
                currentMonth &&
                currentMonth.averageDailyCensus >= tier.adcThreshold;
              const isCurrent = currentBonus.tier?.adcThreshold === tier.adcThreshold;
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

        {/* Previous Months */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>Previous Months</h2>
          {previousMonths.length === 0 ? (
            <p className="text-base text-center py-6" style={{ color: "var(--text-muted)" }}>No previous data</p>
          ) : (
            <div className="space-y-3">
              {previousMonths.map((m) => {
                const bonus = calculateBonus(m.averageDailyCensus);
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
                        style={{ color: bonus.amount > 0 ? "var(--success)" : "var(--text-muted)" }}
                      >
                        {formatCurrency(bonus.amount)}
                      </p>
                      {bonus.amount > 0 && (
                        <button
                          onClick={() => handleGeneratePDF(m)}
                          className="text-sm text-[#38b2ac] mt-1"
                        >
                          Get PDF
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
