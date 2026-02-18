import {
  PATIENT_TYPES,
  CLINICAL_LIAISONS,
  DISCHARGE_TYPES,
  RTA_HOSPITALS,
  RTA_REASONS,
} from "./config";

export type PatientType = (typeof PATIENT_TYPES)[number];
export type ClinicalLiaison = (typeof CLINICAL_LIAISONS)[number];
export type DischargeType = (typeof DISCHARGE_TYPES)[number];
export type RTAHospital = (typeof RTA_HOSPITALS)[number];
export type RTAReason = (typeof RTA_REASONS)[number];

export interface Admission {
  id: string;
  date: string; // ISO date string
  hospitalName: string;
  patientType: PatientType;
  clinicalLiaison: ClinicalLiaison;
  createdBy: string;
  createdAt: string;
}

export interface Discharge {
  id: string;
  date: string;
  dischargeType: DischargeType;
  dischargeName: string;
  createdBy: string;
  createdAt: string;
}

export interface RTA {
  id: string;
  date: string;
  hospital: RTAHospital;
  reason: RTAReason;
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
