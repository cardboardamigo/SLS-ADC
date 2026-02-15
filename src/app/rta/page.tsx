"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { addRTA, getRTAsForMonth, deleteRTA, updateRTA, recordActivity } from "@/lib/census";
import { RTA, RTAHospital, RTAReason } from "@/lib/types";
import { format, subMonths, addMonths } from "date-fns";

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
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hospital, setHospital] = useState<RTAHospital>("UofU");
  const [reason, setReason] = useState<RTAReason>("Sepsis");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [recentRTAs, setRecentRTAs] = useState<RTA[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Month navigation for the list
  const [listDate, setListDate] = useState(new Date());
  const listYear = listDate.getFullYear();
  const listMonth = listDate.getMonth() + 1;

  const loadRecent = useCallback(async () => {
    try {
      const data = await getRTAsForMonth(listYear, listMonth);
      setRecentRTAs(data);
    } catch (err) {
      console.error("Failed to load RTAs:", err);
    }
  }, [listYear, listMonth]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (user) loadRecent();
  }, [user, loading, router, loadRecent]);

  function startEdit(rta: RTA) {
    setEditingId(rta.id);
    setDate(rta.date);
    setHospital(rta.hospital);
    setReason(rta.reason);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setDate(format(new Date(), "yyyy-MM-dd"));
    setHospital("UofU");
    setReason("Sepsis");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setSaveError(null);

    try {
      if (editingId) {
        const updateData = {
          date,
          hospital,
          reason,
        };
        await updateRTA(editingId, updateData);
        setEditingId(null);
      } else {
        const rtaData = {
          date,
          hospital,
          reason,
          createdBy: user.uid,
          createdAt: new Date().toISOString(),
        };
        await addRTA(rtaData);
        await recordActivity({
          type: "RTA",
          patientName: hospital,
          liaisonName: profile?.name ?? "",
          userUID: user.uid,
        });
      }
      setSuccess(true);
      setDate(format(new Date(), "yyyy-MM-dd"));
      setHospital("UofU");
      setReason("Sepsis");
      setTimeout(() => setSuccess(false), 2000);
      loadRecent();
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Failed to save RTA:", err);
      setSaveError(error?.message?.includes("timed out")
        ? "Save timed out. Please check your connection and try again."
        : "Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this RTA entry?")) return;
    await deleteRTA(id);
    if (editingId === id) cancelEdit();
    loadRecent();
  }

  const isCurrentMonth = listDate.getMonth() === new Date().getMonth() && listDate.getFullYear() === new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50 pb-24 pt-20">
      <Header />

      <div className="max-w-2xl mx-auto px-5 py-5">
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 mb-5 text-center text-base font-medium animate-pulse">
            {editingId ? "RTA updated successfully" : "RTA recorded successfully"}
          </div>
        )}

        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5 text-center text-base font-medium">
            {saveError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-6 mb-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800">
              {editingId ? "Edit Return to Acute" : "Record Return to Acute"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-base text-gray-400 hover:text-gray-600"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="mb-5">
            <label className="block text-base font-medium text-gray-600 mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 transition text-base"
            />
          </div>

          <div className="mb-5">
            <label className="block text-base font-medium text-gray-600 mb-2">
              Receiving Hospital
            </label>
            <select
              value={hospital}
              onChange={(e) => setHospital(e.target.value as RTAHospital)}
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 transition bg-white text-base"
            >
              {RTA_HOSPITALS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-base font-medium text-gray-600 mb-2">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as RTAReason)}
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 transition bg-white text-base"
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
            className="w-full bg-red-500 text-white py-4 rounded-xl text-lg font-semibold hover:bg-red-600 disabled:opacity-50 transition"
          >
            {submitting ? "Saving..." : editingId ? "Update RTA" : "Record RTA"}
          </button>
        </form>

        {/* Recent RTAs */}
        <div className="card p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setListDate(subMonths(listDate, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-800">
                {format(listDate, "MMMM yyyy")}
              </h2>
              <p className="text-sm text-gray-400">{recentRTAs.length} RTA{recentRTAs.length !== 1 ? "s" : ""}</p>
            </div>
            <button
              onClick={() => !isCurrentMonth && setListDate(addMonths(listDate, 1))}
              className={`p-2 rounded-lg transition ${isCurrentMonth ? "opacity-30" : "hover:bg-gray-100"}`}
              disabled={isCurrentMonth}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {recentRTAs.length === 0 ? (
            <p className="text-gray-400 text-base text-center py-6">No RTAs this month</p>
          ) : (
            <div className="space-y-3">
              {recentRTAs.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-gray-800">RTA to {r.hospital}</p>
                    <p className="text-sm text-gray-400">
                      {r.date} &middot; {r.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => startEdit(r)}
                      className="text-[#38b2ac] hover:text-[#319795] p-2"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-red-400 hover:text-red-600 p-2"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
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
