"use client";

import CrudPage, { CrudPageConfig } from "@/components/CrudPage";
import { addDischarge, getDischargesForMonth, deleteDischarge, updateDischarge, getDischargeFacilityNames, saveDischargeFacilityIfNew } from "@/lib/census";
import { Discharge } from "@/lib/types";
import { DISCHARGE_TYPES } from "@/lib/config";

const config: CrudPageConfig<Discharge> = {
  entityName: "Discharge",
  entityNamePlural: "discharges",
  fields: [
    { name: "dischargeType", label: "Discharge Type", type: "select", options: DISCHARGE_TYPES, defaultValue: "IRF" },
    { name: "dischargeName", label: "Discharge Facility Name", type: "autocomplete", defaultValue: "", placeholder: "Enter facility name", disableSubmitWhenEmpty: true, getSuggestions: getDischargeFacilityNames, saveSuggestion: saveDischargeFacilityIfNew },
  ],
  focusRingClass: "focus:ring-red-400",
  buttonClass: "bg-red-500 hover:bg-red-600",
  addItem: addDischarge,
  getItemsForMonth: getDischargesForMonth,
  deleteItem: deleteDischarge,
  updateItem: updateDischarge,
  getItemTitle: (d) => d.dischargeName,
  getItemSubtitle: (d) => `${d.date} \u00b7 ${d.dischargeType}`,
  activityType: "DC",
  getActivityPatientName: (fields) => fields.dischargeName.trim(),
  groupByOptions: [
    { label: "Total", field: "total" },
    { label: "By Facility Type", field: "dischargeType" },
    { label: "By Name", field: "dischargeName" },
  ],
};

export default function DischargesPage() {
  return <CrudPage config={config} />;
}
