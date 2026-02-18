"use client";

import CrudPage, { CrudPageConfig } from "@/components/CrudPage";
import { addRTA, getRTAsForMonth, deleteRTA, updateRTA } from "@/lib/census";
import { RTA } from "@/lib/types";
import { RTA_HOSPITALS, RTA_REASONS } from "@/lib/config";

const config: CrudPageConfig<RTA> = {
  entityName: "Return to Acute",
  entityNamePlural: "RTAs",
  fields: [
    { name: "hospital", label: "Receiving Hospital", type: "select", options: RTA_HOSPITALS, defaultValue: "UofU" },
    { name: "reason", label: "Reason", type: "select", options: RTA_REASONS, defaultValue: "Sepsis" },
  ],
  focusRingClass: "focus:ring-red-400",
  buttonClass: "bg-red-500 hover:bg-red-600",
  addItem: addRTA,
  getItemsForMonth: getRTAsForMonth,
  deleteItem: deleteRTA,
  updateItem: updateRTA,
  getItemTitle: (r) => `RTA to ${r.hospital}`,
  getItemSubtitle: (r) => `${r.date} \u00b7 ${r.reason}`,
  activityType: "RTA",
  getActivityPatientName: (fields) => fields.hospital,
};

export default function RTAPage() {
  return <CrudPage config={config} />;
}
