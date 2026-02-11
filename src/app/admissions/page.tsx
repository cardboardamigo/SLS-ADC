"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { addAdmission, getAdmissionsForMonth, deleteAdmission } from "@/lib/census";
import { Admission, PatientType, ClinicalLiaison } from "@/lib/types";
import { format } from "date-fns";

const PATIENT_TYPES: PatientType[] = ["Resp Complex", "Trach Vent", "Wound", "Med Complex"];
const CLINICAL_LIAISONS: ClinicalLiaison[] = ["Thad", "West"];

export default function AdmissionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hospitalName, setHospitalName] = useState("");
  const [patientType, setPatientType] = useState<PatientType>("Resp Complex");
  const [clinicalLiaison, setClinicalLiaison] = useState<ClinicalLiaison>("Thad");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recentAdmissions, setRecentAdmissions] = useState<Admission[]>([]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const loadRecent = useCallback(async () => {
    const data = await getAdmissionsForMonth(currentYear, currentMonth);
    setRecentAdmissions(data);
  }, [currentYear, currentMonth]);

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
      await addAdmission({
        date,
        hospitalName: hospitalName.trim(),
        patientType,
        clinicalLiaison,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      });
      setSuccess(true);
      setHospitalName("");
      setTimeout(() => setSuccess(false), 2000);
      loadRecent();
    } catch (err) {
      console.error("Failed to add admission:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this admission?")) return;
    await deleteAdmission(id);
    loadRecent();
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-14">
      <Header />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Success Banner */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 mb-4 text-center text-sm font-medium animate-pulse">
            Admission recorded successfully
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <h2 className="font-semibold text-gray-800 mb-4">Record Admission</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 transition"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">Hospital Name</label>
            <input
              type="text"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              required
              placeholder="Enter hospital name"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 transition"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">Patient Type</label>
            <select
              value={patientType}
              onChange={(e) => setPatientType(e.target.value as PatientType)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 transition bg-white"
            >
              {PATIENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Clinical Liaison (CL)
            </label>
            <select
              value={clinicalLiaison}
              onChange={(e) => setClinicalLiaison(e.target.value as ClinicalLiaison)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 transition bg-white"
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
            className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 disabled:opacity-50 transition"
          >
            {submitting ? "Saving..." : "Record Admission"}
          </button>
        </form>

        {/* Recent Admissions */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">
            This Month&apos;s Admissions ({recentAdmissions.length})
          </h2>
          {recentAdmissions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No admissions this month</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentAdmissions.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{a.hospitalName}</p>
                    <p className="text-xs text-gray-400">
                      {a.date} &middot; {a.patientType} &middot; CL: {a.clinicalLiaison}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(a.id)}
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
