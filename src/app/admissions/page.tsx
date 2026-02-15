"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { addAdmission, getAdmissionsForMonth, deleteAdmission, updateAdmission, recordActivity } from "@/lib/census";
import { Admission, PatientType, ClinicalLiaison } from "@/lib/types";
import { format, subMonths, addMonths } from "date-fns";

const PATIENT_TYPES: PatientType[] = ["Resp Complex", "Trach Vent", "Wound", "Med Complex"];
const CLINICAL_LIAISONS: ClinicalLiaison[] = ["Thad", "West"];

export default function AdmissionsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hospitalName, setHospitalName] = useState("");
  const [patientType, setPatientType] = useState<PatientType>("Resp Complex");
  const [clinicalLiaison, setClinicalLiaison] = useState<ClinicalLiaison>("Thad");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recentAdmissions, setRecentAdmissions] = useState<Admission[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Month navigation for the list
  const [listDate, setListDate] = useState(new Date());
  const listYear = listDate.getFullYear();
  const listMonth = listDate.getMonth() + 1;

  const loadRecent = useCallback(async () => {
    const data = await getAdmissionsForMonth(listYear, listMonth);
    setRecentAdmissions(data);
  }, [listYear, listMonth]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (user) loadRecent();
  }, [user, loading, router, loadRecent]);

  function startEdit(admission: Admission) {
    setEditingId(admission.id);
    setDate(admission.date);
    setHospitalName(admission.hospitalName);
    setPatientType(admission.patientType);
    setClinicalLiaison(admission.clinicalLiaison);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setDate(format(new Date(), "yyyy-MM-dd"));
    setHospitalName("");
    setPatientType("Resp Complex");
    setClinicalLiaison("Thad");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await updateAdmission(editingId, {
          date,
          hospitalName: hospitalName.trim(),
          patientType,
          clinicalLiaison,
        });
        setEditingId(null);
      } else {
        await addAdmission({
          date,
          hospitalName: hospitalName.trim(),
          patientType,
          clinicalLiaison,
          createdBy: user.uid,
          createdAt: new Date().toISOString(),
        });
        await recordActivity({
          type: "Admit",
          patientName: hospitalName.trim(),
          liaisonName: profile?.name ?? clinicalLiaison,
          userUID: user.uid,
        });
      }
      setSuccess(true);
      setHospitalName("");
      setPatientType("Resp Complex");
      setClinicalLiaison("Thad");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setTimeout(() => setSuccess(false), 2000);
      loadRecent();
    } catch (err) {
      console.error("Failed to save admission:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this admission?")) return;
    await deleteAdmission(id);
    if (editingId === id) cancelEdit();
    loadRecent();
  }

  const isCurrentMonth = listDate.getMonth() === new Date().getMonth() && listDate.getFullYear() === new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50 pb-24 pt-20">
      <Header />

      <div className="max-w-2xl mx-auto px-5 py-5">
        {/* Success Banner */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-5 text-center text-base font-medium animate-pulse">
            {editingId ? "Admission updated successfully" : "Admission recorded successfully"}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800">
              {editingId ? "Edit Admission" : "Record Admission"}
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
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 transition text-base"
            />
          </div>

          <div className="mb-5">
            <label className="block text-base font-medium text-gray-600 mb-2">Hospital Name</label>
            <input
              type="text"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              required
              placeholder="Enter hospital name"
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 transition text-base"
            />
          </div>

          <div className="mb-5">
            <label className="block text-base font-medium text-gray-600 mb-2">Patient Type</label>
            <select
              value={patientType}
              onChange={(e) => setPatientType(e.target.value as PatientType)}
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 transition bg-white text-base"
            >
              {PATIENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-base font-medium text-gray-600 mb-2">
              Clinical Liaison (CL)
            </label>
            <select
              value={clinicalLiaison}
              onChange={(e) => setClinicalLiaison(e.target.value as ClinicalLiaison)}
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 transition bg-white text-base"
            >
              {CLINICAL_LIAISONS.map((cl) => (
                <option key={cl} value={cl}>
                  {cl}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-500 text-white py-4 rounded-xl text-lg font-semibold hover:bg-green-600 disabled:opacity-50 transition"
          >
            {submitting ? "Saving..." : editingId ? "Update Admission" : "Record Admission"}
          </button>
        </form>

        {/* Recent Admissions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
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
              <p className="text-sm text-gray-400">{recentAdmissions.length} admission{recentAdmissions.length !== 1 ? "s" : ""}</p>
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

          {recentAdmissions.length === 0 ? (
            <p className="text-gray-400 text-base text-center py-6">No admissions this month</p>
          ) : (
            <div className="space-y-3">
              {recentAdmissions.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-gray-800">{a.hospitalName}</p>
                    <p className="text-sm text-gray-400">
                      {a.date} &middot; {a.patientType} &middot; CL: {a.clinicalLiaison}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => startEdit(a)}
                      className="text-[#38b2ac] hover:text-[#319795] p-2"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
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
