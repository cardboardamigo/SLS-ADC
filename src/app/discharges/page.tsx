"use client";

import CrudPage, { CrudPageConfig } from "@/components/CrudPage";
import { addDischarge, getDischargesForMonth, deleteDischarge, updateDischarge } from "@/lib/census";
import { Discharge, DischargeType } from "@/lib/types";

const DISCHARGE_TYPES: DischargeType[] = ["IRF", "SNF", "HH", "ALF", "Passed"];

const config: CrudPageConfig<Discharge> = {
  entityName: "Discharge",
  entityNamePlural: "discharges",
  fields: [
    { name: "dischargeType", label: "Discharge Type", type: "select", options: DISCHARGE_TYPES, defaultValue: "IRF" },
    { name: "dischargeName", label: "Patient / Discharge Name", type: "text", defaultValue: "", placeholder: "Enter name", disableSubmitWhenEmpty: true },
  ],
  focusRingClass: "focus:ring-rose-400",
  buttonClass: "bg-rose-600 hover:bg-rose-700",
  addItem: addDischarge,
  getItemsForMonth: getDischargesForMonth,
  deleteItem: deleteDischarge,
  updateItem: updateDischarge,
  getItemTitle: (d) => d.dischargeName,
  getItemSubtitle: (d) => `${d.date} \u00b7 ${d.dischargeType}`,
  activityType: "DC",
  getActivityPatientName: (fields) => fields.dischargeName.trim(),
};

export default function DischargesPage() {
  return <CrudPage config={config} />;
}
