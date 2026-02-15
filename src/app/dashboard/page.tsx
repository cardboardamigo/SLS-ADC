"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import {
  calculateMonthlyADC,
  getStartingCensus,
  setStartingCensus,
  subscribeToActivityForMonth,
} from "@/lib/census";
import { MonthlyADC, ActivityEntry } from "@/lib/types";
import { calculateBonus, formatCurrency, BONUS_TIERS } from "@/lib/bonus";
import { format } from "date-fns";
import { useRef } from "react";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [monthlyData, setMonthlyData] = useState<MonthlyADC | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [startCensus, setStartCensus] = useState<number>(0);
  const [editingCensus, setEditingCensus] = useState(false);
  const [censusInput, setCensusInput] = useState("");
  const [showBonusHint, setShowBonusHint] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const loadData = useCallback(async () => {
    try {
      setDataLoading(true);
      setDataError(null);
      const [adc, sc] = await Promise.all([
        calculateMonthlyADC(year, month),
        getStartingCensus(year, month),
      ]);
      setMonthlyData(adc);
      setStartCensus(sc);
    } catch (err) {
      console.error("Failed to load data:", err);
      setDataError("Failed to load census data. Please check your connection and try again.");
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

  // Real-time listener for activity entries (keeps Current Census up-to-date)
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToActivityForMonth(year, month, (entries) => {
      setActivities(entries);
    });
    return unsubscribe;
  }, [user, year, month]);

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

  if (dataError) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24 pt-20">
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

  const totalAdmits = activities.filter((a) => a.type === "Admit").length;
  const totalDischarges = activities.filter((a) => a.type === "DC").length;
  const totalRTAs = activities.filter((a) => a.type === "RTA").length;
  const currentCensus = monthlyData
    ? startCensus + totalAdmits - totalDischarges
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
        <div className="bg-gradient-to-br from-[#1a365d] to-[#2a4a7f] rounded-xl p-8 text-white mb-5 shadow-lg">
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
              <p className="text-3xl font-semibold text-emerald-300">+{totalAdmits}</p>
              <p className="text-white/60 text-sm">Admits</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-3xl font-semibold text-rose-300">-{totalDischarges}</p>
              <p className="text-white/60 text-sm">D/C</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-3xl font-semibold text-amber-300">-{totalRTAs}</p>
              <p className="text-white/60 text-sm">RTA</p>
            </div>
          </div>
        </div>

        {/* Starting Census */}
        <div className="card p-5 mb-5">
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

        {/* Recent Activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
            <button
              onClick={() => router.push("/history")}
              className="text-base text-[#38b2ac] font-medium"
            >
              View All
            </button>
          </div>

          {activities.length === 0 ? (
            <p className="text-gray-400 text-base text-center py-6">
              No entries this month. Tap + to start tracking.
            </p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
                >
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      item.type === "Admit"
                        ? "bg-emerald-400"
                        : item.type === "DC"
                        ? "bg-rose-400"
                        : "bg-amber-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-gray-800 truncate">{item.patientName}</p>
                    <p className="text-sm text-gray-400">
                      {format(new Date(item.timestamp), "MMM d, h:mm a")}
                      {item.liaisonName ? ` \u00b7 ${item.liaisonName}` : ""}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-medium px-3 py-1 rounded-full ${
                      item.type === "Admit"
                        ? "bg-emerald-50 text-emerald-700"
                        : item.type === "DC"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.type === "Admit" ? "ADM" : item.type === "DC" ? "D/C" : "RTA"}
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

      {/* Floating Action Button */}
      {fabOpen && (
        <div
          className="fixed inset-0 fab-backdrop z-40"
          onClick={() => setFabOpen(false)}
        />
      )}
      <div className="fixed bottom-20 right-5 z-50 flex flex-col items-end">
        {fabOpen && (
          <div className="flex flex-col gap-3 mb-4">
            <button
              onClick={() => { router.push("/admissions"); setFabOpen(false); }}
              className="fab-item-enter flex items-center gap-2.5 bg-white rounded-full pl-4 pr-2 py-2 shadow-lg border border-gray-100"
              style={{ animationDelay: "0ms" }}
            >
              <span className="text-sm font-medium text-[#1a365d]">Admit</span>
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-emerald-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
              </div>
            </button>
            <button
              onClick={() => { router.push("/discharges"); setFabOpen(false); }}
              className="fab-item-enter flex items-center gap-2.5 bg-white rounded-full pl-4 pr-2 py-2 shadow-lg border border-gray-100"
              style={{ animationDelay: "50ms" }}
            >
              <span className="text-sm font-medium text-[#1a365d]">Discharge</span>
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-rose-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </div>
            </button>
            <button
              onClick={() => { router.push("/rta"); setFabOpen(false); }}
              className="fab-item-enter flex items-center gap-2.5 bg-white rounded-full pl-4 pr-2 py-2 shadow-lg border border-gray-100"
              style={{ animationDelay: "100ms" }}
            >
              <span className="text-sm font-medium text-[#1a365d]">RTA</span>
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
              </div>
            </button>
          </div>
        )}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className="w-14 h-14 rounded-full bg-[#1a365d] text-white shadow-lg flex items-center justify-center transition-transform duration-200 hover:shadow-xl active:scale-95"
          style={{ transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
