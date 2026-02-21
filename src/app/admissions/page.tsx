"use client";

import CrudPage, { CrudPageConfig } from "@/components/CrudPage";
import { addAdmission, getAdmissionsForMonth, deleteAdmission, updateAdmission, getHospitalNames, saveHospitalIfNew } from "@/lib/census";
import { Admission } from "@/lib/types";
import { PATIENT_TYPES, CLINICAL_LIAISONS } from "@/lib/config";

const config: CrudPageConfig<Admission> = {
  entityName: "Admission",
  entityNamePlural: "admissions",
  fields: [
    { name: "hospitalName", label: "Hospital Name", type: "autocomplete", defaultValue: "", placeholder: "Enter hospital name", getSuggestions: getHospitalNames, saveSuggestion: saveHospitalIfNew },
    { name: "patientType", label: "Patient Type", type: "select", options: PATIENT_TYPES, defaultValue: "Resp Complex" },
    { name: "clinicalLiaison", label: "Clinical Liaison (CL)", type: "select", options: CLINICAL_LIAISONS, defaultValue: "Thad" },
  ],
  focusRingClass: "focus:ring-green-400",
  buttonClass: "bg-emerald-600 hover:bg-emerald-700",
  addItem: addAdmission,
  getItemsForMonth: getAdmissionsForMonth,
  deleteItem: deleteAdmission,
  updateItem: updateAdmission,
  getItemTitle: (a) => a.hospitalName,
  getItemSubtitle: (a) => `${a.date} \u00b7 ${a.patientType} \u00b7 CL: ${a.clinicalLiaison}`,
  activityType: "Admit",
  getActivityPatientName: (fields) => fields.hospitalName.trim(),
  groupByOptions: [
    { label: "Total", field: "total" },
    { label: "By Hospital", field: "hospitalName" },
    { label: "By Patient Type", field: "patientType" },
  ],
  getProfileDefaults: (profile): Record<string, string> => {
    const match = CLINICAL_LIAISONS.find((cl) => profile.name?.startsWith(cl));
    return match ? { clinicalLiaison: match } : {};
  },
};

export default function AdmissionsPage() {
  return <CrudPage config={config} />;
}
