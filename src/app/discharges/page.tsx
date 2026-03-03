"use client";

import CrudPage, { CrudPageConfig } from "@/components/CrudPage";
import { addDischarge, getDischargesForMonth, deleteDischarge, updateDischarge, getDischargeFacilityNames, saveDischargeFacilityIfNew, getInsuranceNames, saveInsuranceIfNew } from "@/lib/census";
import { Discharge } from "@/lib/types";
import { DISCHARGE_TYPES, INSURANCE_TYPES } from "@/lib/config";

const config: CrudPageConfig<Discharge> = {
  entityName: "Discharge",
  entityNamePlural: "discharges",
  fields: [
    { name: "dischargeType", label: "Discharge Type", type: "select", options: DISCHARGE_TYPES, defaultValue: "IRF" },
    { name: "dischargeName", label: "Discharge Facility Name", type: "autocomplete", defaultValue: "", placeholder: "Enter facility name", disableSubmitWhenEmpty: true, getSuggestions: getDischargeFacilityNames, saveSuggestion: saveDischargeFacilityIfNew },
    { name: "insuranceType", label: "Insurance Type", type: "select", options: INSURANCE_TYPES, defaultValue: "", placeholder: "— Insurance Type —" },
    { name: "insuranceName", label: "Insurance Name", type: "autocomplete", defaultValue: "", placeholder: "Enter insurance name", getSuggestions: getInsuranceNames, saveSuggestion: saveInsuranceIfNew },
  ],
  focusRingClass: "focus:ring-red-400",
  buttonClass: "bg-red-500 hover:bg-red-600",
  addItem: addDischarge,
  getItemsForMonth: getDischargesForMonth,
  deleteItem: deleteDischarge,
  updateItem: updateDischarge,
  getItemTitle: (d) => d.dischargeName,
  getItemSubtitle: (d) => {
    const ins = d.insuranceType ? ` \u00b7 ${d.insuranceType}${d.insuranceName ? ` (${d.insuranceName})` : ""}` : "";
    return `${d.date} \u00b7 ${d.dischargeType}${ins}`;
  },
  activityType: "DC",
  getActivityPatientName: (fields) => fields.dischargeName.trim(),
  groupByOptions: [
    { label: "Total", field: "total" },
    { label: "By Facility Type", field: "dischargeType" },
    { label: "By Name", field: "dischargeName" },
    { label: "By Insurance", field: "insuranceType" },
  ],
};

export default function DischargesPage() {
  return <CrudPage config={config} />;
}
