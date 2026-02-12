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
        <div className="w-10 h-10 border-4 border-[#38b2ac] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 pt-20">
      <Header />

      <div className="max-w-2xl mx-auto px-5 py-5">
        <h2 className="text-xl font-semibold text-gray-800 mb-5">Monthly History</h2>

        <div className="space-y-4">
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
                  className="w-full p-5 flex items-center justify-between text-left"
                >
                  <div>
                    <p className="text-base font-semibold text-gray-800">{m.adc.monthName}</p>
                    <p className="text-sm text-gray-400">
                      {m.admissions.length} admits &middot; {m.discharges.length} D/C &middot;{" "}
                      {m.rtas.length} RTA
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-[#1e3a5f]">
                      {m.adc.averageDailyCensus.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-400">ADC</p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-50">
                    <div className="grid grid-cols-3 gap-3 mt-4 mb-4">
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-green-600">
                          {m.admissions.length}
                        </p>
                        <p className="text-sm text-green-700">Admits</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-orange-600">
                          {m.discharges.length}
                        </p>
                        <p className="text-sm text-orange-700">D/C</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-red-600">{m.rtas.length}</p>
                        <p className="text-sm text-red-700">RTA</p>
                      </div>
                    </div>

                    {bonus.amount > 0 && (
                      <div className="bg-amber-50 rounded-lg p-4 text-center mb-4">
                        <p className="text-base text-amber-700">
                          Bonus: <span className="font-bold">{formatCurrency(bonus.amount)}</span>
                          {bonus.tier && ` (${bonus.tier.adcThreshold}+ tier)`}
                        </p>
                      </div>
                    )}

                    {/* Admission details */}
                    {m.admissions.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-500 mb-2">Admissions</p>
                        {m.admissions.map((a) => (
                          <p key={a.id} className="text-sm text-gray-600 py-1">
                            {a.date} - {a.hospitalName} ({a.patientType}, CL: {a.clinicalLiaison})
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Discharge details */}
                    {m.discharges.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-500 mb-2">Discharges</p>
                        {m.discharges.map((d) => (
                          <p key={d.id} className="text-sm text-gray-600 py-1">
                            {d.date} - {d.dischargeName} ({d.dischargeType})
                          </p>
                        ))}
                      </div>
                    )}

                    {/* RTA details */}
                    {m.rtas.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-500 mb-2">
                          Returns to Acute
                        </p>
                        {m.rtas.map((r) => (
                          <p key={r.id} className="text-sm text-gray-600 py-1">
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
