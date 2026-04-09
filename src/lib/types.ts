import {
  PATIENT_TYPES,
  CLINICAL_LIAISONS,
  DISCHARGE_TYPES,
  RTA_HOSPITALS,
  RTA_REASONS,
  INSURANCE_TYPES,
} from "./config";

export type PatientType = (typeof PATIENT_TYPES)[number];
export type ClinicalLiaison = (typeof CLINICAL_LIAISONS)[number];
export type DischargeType = (typeof DISCHARGE_TYPES)[number];
export type RTAHospital = (typeof RTA_HOSPITALS)[number];
export type RTAReason = (typeof RTA_REASONS)[number];
export type InsuranceType = (typeof INSURANCE_TYPES)[number];

export interface Admission {
  id: string;
  date: string; // ISO date string
  hospitalName: string;
  patientType: PatientType;
  clinicalLiaison: ClinicalLiaison;
  insuranceType?: InsuranceType;
  insuranceName?: string;
  createdBy: string;
  createdAt: string;
}

export interface Discharge {
  id: string;
  date: string;
  dischargeType: DischargeType;
  dischargeName: string;
  insuranceType?: InsuranceType;
  insuranceName?: string;
  createdBy: string;
  createdAt: string;
}

export interface RTA {
  id: string;
  date: string;
  hospital: RTAHospital;
  reason: RTAReason;
  insuranceType?: InsuranceType;
  insuranceName?: string;
  createdBy: string;
  createdAt: string;
}

export interface DailyCensus {
  date: string;
  admissions: number;
  discharges: number;
  rtas: number;
  netChange: number;
  runningCensus: number;
}

export interface MonthlyADC {
  month: string; // YYYY-MM
  year: number;
  monthName: string;
  totalCensusDays: number;
  daysInMonth: number;
  averageDailyCensus: number;
  bonusTier: BonusTier | null;
  bonusAmount: number;
}

export interface BonusTier {
  adcThreshold: number;
  bonusAmount: number;
}

/**
 * Super-user override for a given month's bonus report.
 * Either field may be set independently:
 *  - `averageDailyCensus` overrides the computed ADC (and re-derives the tier/amount)
 *  - `bonusAmount` overrides the dollar amount directly (final say)
 */
export interface BonusOverride {
  month: string; // YYYY-MM
  averageDailyCensus?: number;
  bonusAmount?: number;
  updatedBy?: string;
  updatedAt?: string;
}

export type ThemeMode = "light" | "dark";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  phone: string;
  title: string;
  profilePicUrl: string;
  theme?: ThemeMode;
}

export interface BonusSubmission {
  id: string;
  userId: string;
  userName: string;
  month: string;
  year: number;
  adc: number;
  bonusAmount: number;
  signatureDate: string;
  createdAt: string;
}

export type ActivityType = "Admit" | "DC" | "RTA";

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  patientName: string;
  timestamp: string;
  liaisonName: string;
  userUID: string;
}
