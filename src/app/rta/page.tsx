"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { addRTA, getRTAsForMonth, deleteRTA } from "@/lib/census";
import { RTA, RTAHospital, RTAReason } from "@/lib/types";
import { format } from "date-fns";

const RTA_HOSPITALS: RTAHospital[] = ["UofU", "IMC", "SMH", "SLR", "HC-JV", "HC-JVW", "HCH"];
const RTA_REASONS: RTAReason[] = [
  "Sepsis",
  "^Resp",
  "^Cardiac",
  "GI Bleed",
  "Family Request",
  "Sx",
  "Procedure",
  "Other",
];

export default function RTAPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hospital, setHospital] = useState<RTAHospital>("UofU");
  const [reason, setReason] = useState<RTAReason>("Sepsis");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recentRTAs, setRecentRTAs] = useState<RTA[]>([]);

  const now = new Date();

  const loadRecent = useCallback(async () => {
    const data = await getRTAsForMonth(now.getFullYear(), now.getMonth() + 1);
    setRecentRTAs(data);
  }, [now.getFullYear(), now.getMonth()]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (user) loadRecent();
  }, [user, loading, router, loadRecent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await addRTA({
        date,
        hospital,
        reason,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      loadRecent();
    } catch (err) {
      console.error("Failed to add RTA:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this RTA entry?")) return;
    await deleteRTA(id);
    loadRecent();
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-14">
      <Header />

      <div className="max-w-lg mx-auto px-4 py-4">
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 mb-4 text-center text-sm font-medium animate-pulse">
            RTA recorded successfully
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <h2 className="font-semibold text-gray-800 mb-4">Record Return to Acute</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 transition"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Receiving Hospital
            </label>
            <select
              value={hospital}
              onChange={(e) => setHospital(e.target.value as RTAHospital)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 transition bg-white"
            >
              {RTA_HOSPITALS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-600 mb-1">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as RTAReason)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 transition bg-white"
            >
              {RTA_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 transition"
          >
            {submitting ? "Saving..." : "Record RTA"}
          </button>
        </form>

        {/* Recent RTAs */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">
            This Month&apos;s RTAs ({recentRTAs.length})
          </h2>
          {recentRTAs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No RTAs this month</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentRTAs.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">RTA to {r.hospital}</p>
                    <p className="text-xs text-gray-400">
                      {r.date} &middot; {r.reason}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
