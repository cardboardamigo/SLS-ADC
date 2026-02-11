import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { Admission, Discharge, RTA, MonthlyADC } from "./types";
import { calculateBonus } from "./bonus";
import { format, getDaysInMonth, startOfMonth, endOfMonth, parseISO } from "date-fns";

// --- Admissions ---
export async function addAdmission(data: Omit<Admission, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "admissions"), data);
  return ref.id;
}

export async function getAdmissionsForMonth(year: number, month: number): Promise<Admission[]> {
  const startDate = format(startOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
  const endDate = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");

  const q = query(
    collection(db, "admissions"),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Admission));
}

export async function deleteAdmission(id: string): Promise<void> {
  await deleteDoc(doc(db, "admissions", id));
}

// --- Discharges ---
export async function addDischarge(data: Omit<Discharge, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "discharges"), data);
  return ref.id;
}

export async function getDischargesForMonth(year: number, month: number): Promise<Discharge[]> {
  const startDate = format(startOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
  const endDate = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");

  const q = query(
    collection(db, "discharges"),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Discharge));
}

export async function deleteDischarge(id: string): Promise<void> {
  await deleteDoc(doc(db, "discharges", id));
}

// --- RTAs ---
export async function addRTA(data: Omit<RTA, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "rtas"), data);
  return ref.id;
}

export async function getRTAsForMonth(year: number, month: number): Promise<RTA[]> {
  const startDate = format(startOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
  const endDate = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");

  const q = query(
    collection(db, "rtas"),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RTA));
}

export async function deleteRTA(id: string): Promise<void> {
  await deleteDoc(doc(db, "rtas", id));
}

// --- Census Calculation ---
export async function getStartingCensus(year: number, month: number): Promise<number> {
  const docRef = doc(db, "censusConfig", `${year}-${String(month).padStart(2, "0")}`);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data().startingCensus ?? 0;
  }
  // Try to get from previous month's ending census
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevDocRef = doc(db, "censusConfig", `${prevYear}-${String(prevMonth).padStart(2, "0")}`);
  const prevSnap = await getDoc(prevDocRef);
  if (prevSnap.exists() && prevSnap.data().endingCensus !== undefined) {
    return prevSnap.data().endingCensus;
  }
  return 0;
}

export async function setStartingCensus(
  year: number,
  month: number,
  census: number
): Promise<void> {
  const docRef = doc(db, "censusConfig", `${year}-${String(month).padStart(2, "0")}`);
  await setDoc(docRef, { startingCensus: census }, { merge: true });
}

export async function setEndingCensus(
  year: number,
  month: number,
  census: number
): Promise<void> {
  const docRef = doc(db, "censusConfig", `${year}-${String(month).padStart(2, "0")}`);
  await setDoc(docRef, { endingCensus: census }, { merge: true });
}

export async function calculateMonthlyADC(year: number, month: number): Promise<MonthlyADC> {
  const admissions = await getAdmissionsForMonth(year, month);
  const discharges = await getDischargesForMonth(year, month);
  const rtas = await getRTAsForMonth(year, month);
  const startingCensus = await getStartingCensus(year, month);

  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const monthDate = new Date(year, month - 1);

  // Build daily census map
  const dailyCensus: Record<string, { admissions: number; discharges: number; rtas: number }> = {};

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = format(new Date(year, month - 1, d), "yyyy-MM-dd");
    dailyCensus[dateStr] = { admissions: 0, discharges: 0, rtas: 0 };
  }

  for (const a of admissions) {
    if (dailyCensus[a.date]) dailyCensus[a.date].admissions++;
  }
  for (const d of discharges) {
    if (dailyCensus[d.date]) dailyCensus[d.date].discharges++;
  }
  for (const r of rtas) {
    if (dailyCensus[r.date]) dailyCensus[r.date].rtas++;
  }

  // Calculate running census and total census-days
  let runningCensus = startingCensus;
  let totalCensusDays = 0;
  const today = format(new Date(), "yyyy-MM-dd");
  let daysElapsed = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = format(new Date(year, month - 1, d), "yyyy-MM-dd");
    if (dateStr > today) break;
    const day = dailyCensus[dateStr];
    // Net change: admissions add, discharges and RTAs subtract
    runningCensus = runningCensus + day.admissions - day.discharges - day.rtas;
    totalCensusDays += runningCensus;
    daysElapsed++;
  }

  const averageDailyCensus = daysElapsed > 0 ? totalCensusDays / daysElapsed : 0;
  const { tier, amount } = calculateBonus(averageDailyCensus);

  return {
    month: `${year}-${String(month).padStart(2, "0")}`,
    year,
    monthName: format(monthDate, "MMMM yyyy"),
    totalCensusDays,
    daysInMonth: daysElapsed,
    averageDailyCensus: Math.round(averageDailyCensus * 100) / 100,
    bonusTier: tier,
    bonusAmount: amount,
  };
}

// --- Check if entries exist for a date ---
export async function hasEntriesForDate(dateStr: string): Promise<boolean> {
  const admQ = query(collection(db, "admissions"), where("date", "==", dateStr));
  const dcQ = query(collection(db, "discharges"), where("date", "==", dateStr));
  const rtaQ = query(collection(db, "rtas"), where("date", "==", dateStr));

  const [admSnap, dcSnap, rtaSnap] = await Promise.all([
    getDocs(admQ),
    getDocs(dcQ),
    getDocs(rtaQ),
  ]);

  return !admSnap.empty || !dcSnap.empty || !rtaSnap.empty;
}
