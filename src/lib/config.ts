/**
 * Centralized configuration — single source of truth for all domain arrays.
 * Add/remove values here; union types in types.ts derive automatically.
 */

/** Login users */
export const USERS = [
  { initials: "WB", name: "West Brewer", email: "jbrewer@slspecialty.org", profilePic: "/Profile wb.jpg" },
  { initials: "TW", name: "Thad Webb", email: "twebb@slspecialty.org", profilePic: null },
] as const;

/**
 * Super users can manually override values on the bonus report
 * (e.g. correct an ADC or bonus amount for a historical month).
 */
export const SUPER_USER_EMAILS = ["jbrewer@slspecialty.org"] as const;

export function isSuperUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return (SUPER_USER_EMAILS as readonly string[]).includes(email.toLowerCase());
}

/** Clinical data arrays */
export const PATIENT_TYPES = ["Resp Complex", "Trach Vent", "Wound", "Med Complex"] as const;
export const CLINICAL_LIAISONS = ["Thad", "West"] as const;
export const DISCHARGE_TYPES = ["IRF", "SNF", "HH", "ALF", "Passed"] as const;
export const INSURANCE_TYPES = ["MCR", "M-MCR", "MCD", "M-MCD", "Private"] as const;
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
  "/profile/edit": "Edit Profile",
};
