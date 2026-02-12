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
  getStartingCensus,
  setStartingCensus,
} from "@/lib/census";
import { MonthlyADC, Admission, Discharge, RTA } from "@/lib/types";
import { calculateBonus, formatCurrency, BONUS_TIERS } from "@/lib/bonus";
import { format } from "date-fns";
import { useRef } from "react";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [monthlyData, setMonthlyData] = useState<MonthlyADC | null>(null);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [discharges, setDischarges] = useState<Discharge[]>([]);
  const [rtas, setRTAs] = useState<RTA[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [startCensus, setStartCensus] = useState<number>(0);
  const [editingCensus, setEditingCensus] = useState(false);
  const [censusInput, setCensusInput] = useState("");
  const [showBonusHint, setShowBonusHint] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const loadData = useCallback(async () => {
    try {
      setDataLoading(true);
      const [adc, adm, dc, rtaData, sc] = await Promise.all([
        calculateMonthlyADC(year, month),
        getAdmissionsForMonth(year, month),
        getDischargesForMonth(year, month),
        getRTAsForMonth(year, month),
        getStartingCensus(year, month),
      ]);
      setMonthlyData(adc);
      setAdmissions(adm);
      setDischarges(dc);
      setRTAs(rtaData);
      setStartCensus(sc);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setDataLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (user) loadData();
  }, [user, loading, router, loadData]);

  async function handleSetStartingCensus() {
    const val = parseInt(censusInput, 10);
    if (isNaN(val) || val < 0) return;
    await setStartingCensus(year, month, val);
    setStartCensus(val);
    setEditingCensus(false);
    loadData();
  }

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#38b2ac] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-base">Loading census data...</p>
        </div>
      </div>
    );
  }

  const currentCensus = monthlyData
    ? startCensus + admissions.length - discharges.length - rtas.length
    : 0;
  const adc = monthlyData?.averageDailyCensus ?? 0;
  const { tier: nextTier } = (() => {
    const sorted = [...BONUS_TIERS].reverse();
    const current = sorted.findIndex((t) => adc < t.adcThreshold);
    return current >= 0
      ? { tier: sorted[current] }
      : { tier: null };
  })();

  return (
    <div className="min-h-screen bg-gray-50 pb-24 pt-20">
      <Header />

      <div className="max-w-2xl mx-auto px-5 py-5">
        {/* ADC Hero Card */}
        <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2c5282] rounded-2xl p-8 text-white mb-5 shadow-lg">
          <div className="text-center">
            <p className="text-white/70 text-base mb-1">{format(now, "MMMM yyyy")} ADC</p>
            <p className="text-6xl font-bold mb-2">{adc.toFixed(1)}</p>
            <p className="text-white/60 text-sm">
              {monthlyData?.daysInMonth ?? 0} days tracked
            </p>
          </div>

          <div className="flex justify-between mt-6 pt-5 border-t border-white/20">
            <div className="text-center flex-1">
              <p className="text-3xl font-semibold">{currentCensus}</p>
              <p className="text-white/60 text-sm">Current</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-3xl font-semibold text-green-300">+{admissions.length}</p>
              <p className="text-white/60 text-sm">Admits</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-3xl font-semibold text-orange-300">-{discharges.length}</p>
              <p className="text-white/60 text-sm">D/C</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-3xl font-semibold text-red-300">-{rtas.length}</p>
              <p className="text-white/60 text-sm">RTA</p>
            </div>
          </div>
        </div>

        {/* Starting Census */}
        <div className="bg-white rounded-xl p-5 mb-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base text-gray-500">Starting Census (Month)</p>
              <p className="text-2xl font-semibold">{startCensus}</p>
            </div>
            {!editingCensus ? (
              <button
                onClick={() => {
                  setCensusInput(String(startCensus));
                  setEditingCensus(true);
                }}
                className="text-base text-[#38b2ac] font-medium px-4 py-2"
              >
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={censusInput}
                  onChange={(e) => setCensusInput(e.target.value)}
                  className="w-24 px-3 py-2 border rounded-lg text-center text-lg"
                />
                <button
                  onClick={handleSetStartingCensus}
                  className="text-base bg-[#38b2ac] text-white px-4 py-2 rounded-lg"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingCensus(false)}
                  className="text-base text-gray-400 px-2 py-2"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bonus Hint - subtle */}
        {nextTier && (
          <div
            className="bg-amber-50 rounded-xl p-4 mb-5 border border-amber-100 cursor-pointer"
            onClick={() => setShowBonusHint(!showBonusHint)}
          >
            <p className="text-base text-amber-700">
              {adc >= 20
                ? `Current tier: ${formatCurrency(calculateBonus(adc).amount)}`
                : `${(nextTier.adcThreshold - adc).toFixed(1)} ADC to next milestone`}
            </p>
            {showBonusHint && (
              <p className="text-sm text-amber-600 mt-2">
                Next: {nextTier.adcThreshold} ADC = {formatCurrency(nextTier.bonusAmount)}
              </p>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <button
            onClick={() => router.push("/admissions")}
            className="bg-green-50 border border-green-200 rounded-xl p-5 text-center hover:bg-green-100 transition"
          >
            <div className="text-green-600 font-bold text-2xl">+</div>
            <p className="text-sm text-green-700 font-medium mt-1">Admission</p>
          </button>
          <button
            onClick={() => router.push("/discharges")}
            className="bg-orange-50 border border-orange-200 rounded-xl p-5 text-center hover:bg-orange-100 transition"
          >
            <div className="text-orange-600 font-bold text-2xl">-</div>
            <p className="text-sm text-orange-700 font-medium mt-1">Discharge</p>
          </button>
          <button
            onClick={() => router.push("/rta")}
            className="bg-red-50 border border-red-200 rounded-xl p-5 text-center hover:bg-red-100 transition"
          >
            <div className="text-red-600 font-bold text-2xl">&larr;</div>
            <p className="text-sm text-red-700 font-medium mt-1">RTA</p>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
            <button
              onClick={() => router.push("/history")}
              className="text-base text-[#38b2ac] font-medium"
            >
              View All
            </button>
          </div>

          {admissions.length === 0 && discharges.length === 0 && rtas.length === 0 ? (
            <p className="text-gray-400 text-base text-center py-6">
              No entries this month. Tap a button above to start tracking.
            </p>
          ) : (
            <div className="space-y-3">
              {[
                ...admissions.slice(0, 5).map((a) => ({
                  type: "admit" as const,
                  date: a.date,
                  label: `${a.hospitalName} - ${a.patientType}`,
                  sub: a.clinicalLiaison,
                })),
                ...discharges.slice(0, 5).map((d) => ({
                  type: "dc" as const,
                  date: d.date,
                  label: `${d.dischargeName} - ${d.dischargeType}`,
                  sub: "",
                })),
                ...rtas.slice(0, 5).map((r) => ({
                  type: "rta" as const,
                  date: r.date,
                  label: `RTA to ${r.hospital}`,
                  sub: r.reason,
                })),
              ]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 10)
                .map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
                  >
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        item.type === "admit"
                          ? "bg-green-400"
                          : item.type === "dc"
                          ? "bg-orange-400"
                          : "bg-red-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-gray-800 truncate">{item.label}</p>
                      <p className="text-sm text-gray-400">
                        {item.date}
                        {item.sub ? ` \u00b7 ${item.sub}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-medium px-3 py-1 rounded-full ${
                        item.type === "admit"
                          ? "bg-green-100 text-green-700"
                          : item.type === "dc"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.type === "admit" ? "ADM" : item.type === "dc" ? "D/C" : "RTA"}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Hidden bonus access - triple tap area */}
        <div
          className="mt-6 text-center"
          onClick={() => {
            tapCountRef.current += 1;
            if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
            if (tapCountRef.current >= 3) {
              tapCountRef.current = 0;
              router.push("/bonus");
            } else {
              tapTimerRef.current = setTimeout(() => {
                tapCountRef.current = 0;
              }, 800);
            }
          }}
        >
          <p className="text-sm text-gray-300 select-none">v1.0 - SLS Census Tracker</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
