"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { addDischarge, getDischargesForMonth, deleteDischarge, updateDischarge, recordActivity } from "@/lib/census";
import { auth } from "@/lib/firebase";
import { Discharge, DischargeType } from "@/lib/types";
import { format, subMonths, addMonths } from "date-fns";

const DISCHARGE_TYPES: DischargeType[] = ["IRF", "SNF", "HH", "ALF", "Passed"];

export default function DischargesPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dischargeName, setDischargeName] = useState("");
  const [dischargeType, setDischargeType] = useState<DischargeType>("IRF");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recentDischarges, setRecentDischarges] = useState<Discharge[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const debugEndRef = useRef<HTMLDivElement>(null);

  function addDebugLog(msg: string) {
    const ts = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [...prev, `[${ts}] ${msg}`]);
    setTimeout(() => debugEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  // Month navigation for the list
  const [listDate, setListDate] = useState(new Date());
  const listYear = listDate.getFullYear();
  const listMonth = listDate.getMonth() + 1;

  const loadRecent = useCallback(async () => {
    const data = await getDischargesForMonth(listYear, listMonth);
    setRecentDischarges(data);
  }, [listYear, listMonth]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (user) loadRecent();
  }, [user, loading, router, loadRecent]);

  function startEdit(discharge: Discharge) {
    setEditingId(discharge.id);
    setDate(discharge.date);
    setDischargeName(discharge.dischargeName);
    setDischargeType(discharge.dischargeType);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setDate(format(new Date(), "yyyy-MM-dd"));
    setDischargeName("");
    setDischargeType("IRF");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    // DEBUG: Check Firebase auth state
    const authState = auth.currentUser ? `EXISTS (uid: ${auth.currentUser.uid})` : "NULL";
    const userState = user ? `EXISTS (uid: ${user.uid})` : "NULL";
    console.log("[DEBUG Discharges] auth.currentUser:", authState);
    console.log("[DEBUG Discharges] useAuth user:", userState);
    addDebugLog(`Auth: ${authState}`);
    addDebugLog(`User: ${userState}`);

    try {
      if (editingId) {
        const updateData = {
          date,
          dischargeType,
          dischargeName: dischargeName.trim(),
        };
        addDebugLog(`Updating ID: ${editingId} data: ${JSON.stringify(updateData)}`);
        console.log("[DEBUG Discharges] Updating discharge ID:", editingId, "with data:", JSON.stringify(updateData));
        await updateDischarge(editingId, updateData);
        console.log("[DEBUG Discharges] Update succeeded");
        addDebugLog("UPDATE SUCCESS");
        setEditingId(null);
      } else {
        const dischargeData = {
          date,
          dischargeType,
          dischargeName: dischargeName.trim(),
          createdBy: user.uid,
          createdAt: new Date().toISOString(),
        };
        addDebugLog(`Adding discharge: ${JSON.stringify(dischargeData)}`);
        console.log("[DEBUG Discharges] Adding new discharge with data:", JSON.stringify(dischargeData));
        const newId = await addDischarge(dischargeData);
        console.log("[DEBUG Discharges] addDischarge succeeded, new doc ID:", newId);
        addDebugLog(`addDischarge OK, docID: ${newId}`);
        await recordActivity({
          type: "DC",
          patientName: dischargeName.trim(),
          liaisonName: profile?.name ?? "",
          userUID: user.uid,
        });
        console.log("[DEBUG Discharges] recordActivity succeeded");
        addDebugLog("recordActivity OK");
      }
      setSuccess(true);
      addDebugLog("SAVE COMPLETE - SUCCESS");
      setDischargeName("");
      setDischargeType("IRF");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setTimeout(() => setSuccess(false), 2000);
      loadRecent();
    } catch (err: unknown) {
      const error = err as Error;
      const errCode = (error as { code?: string })?.code;
      console.error("[DEBUG Discharges] SAVE FAILED — error name:", error?.name);
      console.error("[DEBUG Discharges] SAVE FAILED — error message:", error?.message);
      console.error("[DEBUG Discharges] SAVE FAILED — error code:", errCode);
      console.error("[DEBUG Discharges] SAVE FAILED — full error:", err);
      addDebugLog(`SAVE FAILED: ${error?.name}: ${error?.message}`);
      addDebugLog(`Error code: ${errCode || "none"}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this discharge?")) return;
    await deleteDischarge(id);
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
            {editingId ? "Discharge updated successfully" : "Discharge recorded successfully"}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-6 mb-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800">
              {editingId ? "Edit Discharge" : "Record Discharge"}
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
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 transition text-base"
            />
          </div>

          <div className="mb-5">
            <label className="block text-base font-medium text-gray-600 mb-2">
              Discharge Type
            </label>
            <select
              value={dischargeType}
              onChange={(e) => setDischargeType(e.target.value as DischargeType)}
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 transition bg-white text-base"
            >
              {DISCHARGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-base font-medium text-gray-600 mb-2">
              Patient / Discharge Name
            </label>
            <input
              type="text"
              value={dischargeName}
              onChange={(e) => setDischargeName(e.target.value)}
              required
              placeholder="Enter name"
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 transition text-base"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !dischargeName.trim()}
            className="w-full bg-rose-600 text-white py-4 rounded-xl text-lg font-semibold hover:bg-rose-700 disabled:opacity-50 transition"
          >
            {submitting ? "Saving..." : editingId ? "Update Discharge" : "Record Discharge"}
          </button>
        </form>

        {/* Recent Discharges */}
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
              <p className="text-sm text-gray-400">{recentDischarges.length} discharge{recentDischarges.length !== 1 ? "s" : ""}</p>
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

          {recentDischarges.length === 0 ? (
            <p className="text-gray-400 text-base text-center py-6">No discharges this month</p>
          ) : (
            <div className="space-y-3">
              {recentDischarges.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-gray-800">{d.dischargeName}</p>
                    <p className="text-sm text-gray-400">
                      {d.date} &middot; {d.dischargeType}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => startEdit(d)}
                      className="text-[#38b2ac] hover:text-[#319795] p-2"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
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

      {/* Debug Panel */}
      <div className="max-w-2xl mx-auto px-5 pb-4">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="w-full text-xs text-gray-400 py-2 text-center border border-dashed border-gray-300 rounded-lg mb-2"
        >
          {showDebug ? "Hide" : "Show"} Debug Panel ({debugLogs.length} logs)
        </button>
        {showDebug && (
          <div className="bg-gray-900 text-green-400 rounded-lg p-3 max-h-60 overflow-y-auto text-xs font-mono">
            {debugLogs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Tap &quot;Record Discharge&quot; to see debug output.</p>
            ) : (
              debugLogs.map((log, i) => (
                <div key={i} className={`py-0.5 ${log.includes("FAILED") ? "text-red-400" : log.includes("SUCCESS") || log.includes(" OK") ? "text-emerald-400" : ""}`}>
                  {log}
                </div>
              ))
            )}
            <div ref={debugEndRef} />
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
