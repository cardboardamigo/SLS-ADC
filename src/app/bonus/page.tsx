"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { calculateMonthlyADC } from "@/lib/census";
import { BONUS_TIERS, calculateBonus, formatCurrency } from "@/lib/bonus";
import { MonthlyADC } from "@/lib/types";
import { format, subMonths } from "date-fns";
import { generateBonusPDF } from "@/lib/pdfGenerator";

export default function BonusPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState<MonthlyADC | null>(null);
  const [previousMonths, setPreviousMonths] = useState<MonthlyADC[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setDataLoading(true);
      const now = new Date();
      const current = await calculateMonthlyADC(now.getFullYear(), now.getMonth() + 1);
      setCurrentMonth(current);

      // Load previous 6 months
      const prev: MonthlyADC[] = [];
      for (let i = 1; i <= 6; i++) {
        const d = subMonths(now, i);
        const monthData = await calculateMonthlyADC(d.getFullYear(), d.getMonth() + 1);
        prev.push(monthData);
      }
      setPreviousMonths(prev);
    } catch (err) {
      console.error("Failed to load bonus data:", err);
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
    } finally {
      setGeneratingPDF(false);
    }
  }

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-[#38b2ac] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentBonus = currentMonth ? calculateBonus(currentMonth.averageDailyCensus) : { tier: null, amount: 0 };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-14">
      <Header />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Current Month Bonus */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white mb-4 shadow-lg">
          <p className="text-white/80 text-sm mb-1">
            {currentMonth?.monthName} Projected Bonus
          </p>
          <p className="text-4xl font-bold mb-1">
            {formatCurrency(currentBonus.amount)}
          </p>
          <p className="text-white/70 text-sm">
            ADC: {currentMonth?.averageDailyCensus.toFixed(1)}
            {currentBonus.tier && ` (${currentBonus.tier.adcThreshold}+ tier)`}
          </p>
          {currentMonth && currentBonus.amount > 0 && (
            <button
              onClick={() => handleGeneratePDF(currentMonth)}
              disabled={generatingPDF}
              className="mt-4 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition w-full"
            >
              {generatingPDF ? "Generating..." : "Generate Bonus Submission Form (PDF)"}
            </button>
          )}
        </div>

        {/* Tier Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">Bonus Tiers</h2>
          <div className="space-y-2">
            {[...BONUS_TIERS].reverse().map((tier) => {
              const isActive =
                currentMonth &&
                currentMonth.averageDailyCensus >= tier.adcThreshold;
              const isCurrent = currentBonus.tier?.adcThreshold === tier.adcThreshold;
              return (
                <div
                  key={tier.adcThreshold}
                  className={`flex items-center justify-between p-3 rounded-xl transition ${
                    isCurrent
                      ? "bg-amber-50 border-2 border-amber-300"
                      : isActive
                      ? "bg-green-50 border border-green-200"
                      : "bg-gray-50 border border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isCurrent
                          ? "bg-amber-500"
                          : isActive
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        isActive ? "text-gray-800" : "text-gray-400"
                      }`}
                    >
                      {tier.adcThreshold} ADC
                    </span>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
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
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">Previous Months</h2>
          {previousMonths.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No previous data</p>
          ) : (
            <div className="space-y-2">
              {previousMonths.map((m) => {
                const bonus = calculateBonus(m.averageDailyCensus);
                return (
                  <div
                    key={m.month}
                    className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.monthName}</p>
                      <p className="text-xs text-gray-400">ADC: {m.averageDailyCensus.toFixed(1)}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          bonus.amount > 0 ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {formatCurrency(bonus.amount)}
                      </p>
                      {bonus.amount > 0 && (
                        <button
                          onClick={() => handleGeneratePDF(m)}
                          className="text-xs text-[#38b2ac] mt-0.5"
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
