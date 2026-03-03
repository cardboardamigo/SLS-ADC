"use client";

import CrudPage, { CrudPageConfig } from "@/components/CrudPage";
import { addRTA, getRTAsForMonth, deleteRTA, updateRTA, getInsuranceNames, saveInsuranceIfNew } from "@/lib/census";
import { RTA } from "@/lib/types";
import { RTA_HOSPITALS, RTA_REASONS, INSURANCE_TYPES } from "@/lib/config";

const config: CrudPageConfig<RTA> = {
  entityName: "Return to Acute",
  entityNamePlural: "RTAs",
  fields: [
    { name: "hospital", label: "Receiving Hospital", type: "select", options: RTA_HOSPITALS, defaultValue: "UofU" },
    { name: "reason", label: "Reason", type: "select", options: RTA_REASONS, defaultValue: "Sepsis" },
    { name: "insuranceType", label: "Insurance Type", type: "select", options: INSURANCE_TYPES, defaultValue: "", placeholder: "— Insurance Type —" },
    { name: "insuranceName", label: "Insurance Name", type: "autocomplete", defaultValue: "", placeholder: "Enter insurance name", getSuggestions: getInsuranceNames, saveSuggestion: saveInsuranceIfNew },
  ],
  focusRingClass: "focus:ring-red-400",
  buttonClass: "bg-red-500 hover:bg-red-600",
  addItem: addRTA,
  getItemsForMonth: getRTAsForMonth,
  deleteItem: deleteRTA,
  updateItem: updateRTA,
  getItemTitle: (r) => `RTA to ${r.hospital}`,
  getItemSubtitle: (r) => {
    const ins = r.insuranceType ? ` \u00b7 ${r.insuranceType}${r.insuranceName ? ` (${r.insuranceName})` : ""}` : "";
    return `${r.date} \u00b7 ${r.reason}${ins}`;
  },
  activityType: "RTA",
  getActivityPatientName: (fields) => fields.hospital,
  groupByOptions: [
    { label: "Total", field: "total" },
    { label: "By Reason", field: "reason" },
    { label: "By Facility", field: "hospital" },
    { label: "By Insurance", field: "insuranceType" },
  ],
};

export default function RTAPage() {
  return <CrudPage config={config} />;
}
