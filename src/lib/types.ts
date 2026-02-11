export type PatientType = "Resp Complex" | "Trach Vent" | "Wound" | "Med Complex";

export type ClinicalLiaison = "Thad" | "West";

export type DischargeType = "IRF" | "SNF" | "HH" | "ALF" | "Passed";

export type RTAHospital = "UofU" | "IMC" | "SMH" | "SLR" | "HC-JV" | "HC-JVW" | "HCH";

export type RTAReason =
  | "Sepsis"
  | "^Resp"
  | "^Cardiac"
  | "GI Bleed"
  | "Family Request"
  | "Sx"
  | "Procedure"
  | "Other";

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

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  phone: string;
  title: string;
  profilePicUrl: string;
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
