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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-[#38b2ac] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24 content-below-header">
        <Header />
        <div className="max-w-2xl mx-auto px-5 py-20 text-center">
          <p className="text-red-500 text-base mb-4">{dataError}</p>
          <button
            onClick={loadData}
            className="bg-[#1a365d] text-white px-6 py-3 rounded-xl text-base font-medium"
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
    <div className="min-h-screen bg-gray-50 pb-24 content-below-header">
      <Header />

      <div className="max-w-2xl mx-auto px-5 py-5">
        {pdfError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5 text-center text-base font-medium">
            {pdfError}
          </div>
        )}

        {/* Current Month Bonus */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-8 text-white mb-5 shadow-lg">
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
              className="mt-5 bg-white/20 hover:bg-white/30 text-white px-5 py-3 rounded-xl text-base font-medium transition w-full"
            >
              {generatingPDF ? "Generating..." : "Generate Bonus Submission Form (PDF)"}
            </button>
          )}
        </div>

        {/* Tier Chart */}
        <div className="card p-6 mb-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Bonus Tiers</h2>
          <div className="space-y-3">
            {[...BONUS_TIERS].reverse().map((tier) => {
              const isActive =
                currentMonth &&
                currentMonth.averageDailyCensus >= tier.adcThreshold;
              const isCurrent = currentBonus.tier?.adcThreshold === tier.adcThreshold;
              return (
                <div
                  key={tier.adcThreshold}
                  className={`flex items-center justify-between p-4 rounded-xl transition ${
                    isCurrent
                      ? "bg-amber-50 border-2 border-amber-300"
                      : isActive
                      ? "bg-green-50 border border-green-200"
                      : "bg-gray-50 border border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full ${
                        isCurrent
                          ? "bg-amber-500"
                          : isActive
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                    />
                    <span
                      className={`text-base font-medium ${
                        isActive ? "text-gray-800" : "text-gray-400"
                      }`}
                    >
                      {tier.adcThreshold} ADC
                    </span>
                  </div>
                  <span
                    className={`text-base font-semibold ${
                      isCurrent
                        ? "text-amber-600"
                        : isActive
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  >
                    {formatCurrency(tier.bonusAmount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Previous Months */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Previous Months</h2>
          {previousMonths.length === 0 ? (
            <p className="text-gray-400 text-base text-center py-6">No previous data</p>
          ) : (
            <div className="space-y-3">
              {previousMonths.map((m) => {
                const bonus = calculateBonus(m.averageDailyCensus);
                return (
                  <div
                    key={m.month}
                    className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="text-base font-medium text-gray-800">{m.monthName}</p>
                      <p className="text-sm text-gray-400">ADC: {m.averageDailyCensus.toFixed(1)}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-base font-semibold ${
                          bonus.amount > 0 ? "text-green-600" : "text-gray-400"
                        }`}
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
