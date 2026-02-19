/**
 * Centralized configuration — single source of truth for all domain arrays.
 * Add/remove values here; union types in types.ts derive automatically.
 */

/** Login users */
export const USERS = [
  { initials: "WB", name: "West Brewer", email: "jbrewer@slspecialty.org", profilePic: "/Profile wb.jpg" },
  { initials: "TW", name: "Thad Webb", email: "twebb@slspecialty.org", profilePic: null },
] as const;

/** Clinical data arrays */
export const PATIENT_TYPES = ["Resp Complex", "Trach Vent", "Wound", "Med Complex"] as const;
export const CLINICAL_LIAISONS = ["Thad", "West"] as const;
export const DISCHARGE_TYPES = ["IRF", "SNF", "HH", "ALF", "Passed"] as const;
export const RTA_HOSPITALS = ["UofU", "IMC", "SMH", "SLR", "HC-JV", "HC-JVW", "HCH"] as const;
export const RTA_REASONS = [
  "Sepsis",
  "^Resp",
  "^Cardiac",
  "GI Bleed",
  "Family Request",
  "Sx",
  "Procedure",
  "Other",
] as const;

/** Bonus tiers — highest ADC first */
export const BONUS_TIERS = [
  { adcThreshold: 36, bonusAmount: 7000 },
  { adcThreshold: 33, bonusAmount: 5000 },
  { adcThreshold: 30, bonusAmount: 4000 },
  { adcThreshold: 28, bonusAmount: 3000 },
  { adcThreshold: 26, bonusAmount: 2000 },
  { adcThreshold: 23, bonusAmount: 1350 },
  { adcThreshold: 20, bonusAmount: 750 },
] as const;

/** Header page title lookup */
export const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Census Tracker",
  "/admissions": "New Admission",
  "/discharges": "Discharge",
  "/rta": "Return to Acute",
  "/history": "Monthly History",
  "/bonus": "Bonus Tracker",
  "/profile": "My Profile",
};
