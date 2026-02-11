"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import {
  calculateMonthlyADC,
  getAdmissionsForMonth,
  getDischargesForMonth,
  getRTAsForMonth,
} from "@/lib/census";
import { MonthlyADC, Admission, Discharge, RTA } from "@/lib/types";
import { calculateBonus, formatCurrency } from "@/lib/bonus";
import { subMonths } from "date-fns";

interface MonthDetail {
  adc: MonthlyADC;
  admissions: Admission[];
  discharges: Discharge[];
  rtas: RTA[];
}

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [months, setMonths] = useState<MonthDetail[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setDataLoading(true);
      const now = new Date();
      const results: MonthDetail[] = [];

      for (let i = 0; i < 12; i++) {
        const d = subMonths(now, i);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;

        const [adc, admissions, discharges, rtas] = await Promise.all([
          calculateMonthlyADC(y, m),
          getAdmissionsForMonth(y, m),
          getDischargesForMonth(y, m),
          getRTAsForMonth(y, m),
        ]);

        results.push({ adc, admissions, discharges, rtas });
      }

      setMonths(results);
    } catch (err) {
      console.error("Failed to load history:", err);
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

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-[#38b2ac] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-14">
      <Header />

      <div className="max-w-lg mx-auto px-4 py-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Monthly History</h2>

        <div className="space-y-3">
          {months.map((m) => {
            const bonus = calculateBonus(m.adc.averageDailyCensus);
            const isExpanded = expandedMonth === m.adc.month;

            return (
              <div
                key={m.adc.month}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedMonth(isExpanded ? null : m.adc.month)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{m.adc.monthName}</p>
                    <p className="text-xs text-gray-400">
                      {m.admissions.length} admits &middot; {m.discharges.length} D/C &middot;{" "}
                      {m.rtas.length} RTA
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#1e3a5f]">
                      {m.adc.averageDailyCensus.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-400">ADC</p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-50">
                    <div className="grid grid-cols-3 gap-3 mt-3 mb-3">
                      <div className="bg-green-50 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-green-600">
                          {m.admissions.length}
                        </p>
                        <p className="text-xs text-green-700">Admits</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-orange-600">
                          {m.discharges.length}
                        </p>
                        <p className="text-xs text-orange-700">D/C</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-red-600">{m.rtas.length}</p>
                        <p className="text-xs text-red-700">RTA</p>
                      </div>
                    </div>

                    {bonus.amount > 0 && (
                      <div className="bg-amber-50 rounded-lg p-3 text-center">
                        <p className="text-sm text-amber-700">
                          Bonus: <span className="font-bold">{formatCurrency(bonus.amount)}</span>
                          {bonus.tier && ` (${bonus.tier.adcThreshold}+ tier)`}
                        </p>
                      </div>
                    )}

                    {/* Admission details */}
                    {m.admissions.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Admissions</p>
                        {m.admissions.map((a) => (
                          <p key={a.id} className="text-xs text-gray-600 py-0.5">
                            {a.date} - {a.hospitalName} ({a.patientType}, CL: {a.clinicalLiaison})
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Discharge details */}
                    {m.discharges.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Discharges</p>
                        {m.discharges.map((d) => (
                          <p key={d.id} className="text-xs text-gray-600 py-0.5">
                            {d.date} - {d.dischargeName} ({d.dischargeType})
                          </p>
                        ))}
                      </div>
                    )}

                    {/* RTA details */}
                    {m.rtas.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1">
                          Returns to Acute
                        </p>
                        {m.rtas.map((r) => (
                          <p key={r.id} className="text-xs text-gray-600 py-0.5">
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
      </div>

      <BottomNav />
    </div>
  );
}
