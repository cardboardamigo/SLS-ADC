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
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db, withTimeout } from "./firebase";
import { Admission, Discharge, RTA, MonthlyADC, ActivityType, ActivityEntry } from "./types";
import { calculateBonus } from "./bonus";
import { format, getDaysInMonth, startOfMonth, endOfMonth } from "date-fns";

// --- Admissions ---
export async function addAdmission(data: Omit<Admission, "id">): Promise<string> {
  console.log("[DEBUG census.ts] addAdmission called with:", JSON.stringify(data));
  try {
    const ref = await withTimeout(addDoc(collection(db, "admissions"), data));
    console.log("[DEBUG census.ts] addAdmission SUCCESS — doc ID:", ref.id);
    return ref.id;
  } catch (err) {
    console.error("[DEBUG census.ts] addAdmission FAILED:", (err as Error)?.message, err);
    throw err;
  }
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

  const snapshot = await withTimeout(getDocs(q));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Admission));
}

export async function deleteAdmission(id: string): Promise<void> {
  await withTimeout(deleteDoc(doc(db, "admissions", id)));
}

export async function updateAdmission(id: string, data: Partial<Omit<Admission, "id">>): Promise<void> {
  await withTimeout(updateDoc(doc(db, "admissions", id), data));
}

// --- Discharges ---
export async function addDischarge(data: Omit<Discharge, "id">): Promise<string> {
  console.log("[DEBUG census.ts] addDischarge called with:", JSON.stringify(data));
  try {
    const ref = await withTimeout(addDoc(collection(db, "discharges"), data));
    console.log("[DEBUG census.ts] addDischarge SUCCESS — doc ID:", ref.id);
    return ref.id;
  } catch (err) {
    console.error("[DEBUG census.ts] addDischarge FAILED:", (err as Error)?.message, err);
    throw err;
  }
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

  const snapshot = await withTimeout(getDocs(q));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Discharge));
}

export async function deleteDischarge(id: string): Promise<void> {
  await withTimeout(deleteDoc(doc(db, "discharges", id)));
}

export async function updateDischarge(id: string, data: Partial<Omit<Discharge, "id">>): Promise<void> {
  await withTimeout(updateDoc(doc(db, "discharges", id), data));
}

// --- RTAs ---
export async function addRTA(data: Omit<RTA, "id">): Promise<string> {
  console.log("[DEBUG census.ts] addRTA called with:", JSON.stringify(data));
  try {
    const ref = await withTimeout(addDoc(collection(db, "rtas"), data));
    console.log("[DEBUG census.ts] addRTA SUCCESS — doc ID:", ref.id);
    return ref.id;
  } catch (err) {
    console.error("[DEBUG census.ts] addRTA FAILED:", (err as Error)?.message, err);
    throw err;
  }
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

  const snapshot = await withTimeout(getDocs(q));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RTA));
}

export async function deleteRTA(id: string): Promise<void> {
  await withTimeout(deleteDoc(doc(db, "rtas", id)));
}

export async function updateRTA(id: string, data: Partial<Omit<RTA, "id">>): Promise<void> {
  await withTimeout(updateDoc(doc(db, "rtas", id), data));
}

// --- Activity Log ---
export async function recordActivity(data: {
  type: ActivityType;
  patientName: string;
  liaisonName: string;
  userUID: string;
}): Promise<string> {
  const activityDoc = {
    type: data.type,
    patientName: data.patientName,
    timestamp: new Date().toISOString(),
    liaisonName: data.liaisonName,
    userUID: data.userUID,
  };
  console.log("[DEBUG census.ts] recordActivity called with:", JSON.stringify(activityDoc));
  try {
    const ref = await withTimeout(addDoc(collection(db, "activity"), activityDoc));
    console.log("[DEBUG census.ts] recordActivity SUCCESS — doc ID:", ref.id);
    return ref.id;
  } catch (err) {
    console.error("[DEBUG census.ts] recordActivity FAILED:", (err as Error)?.message, err);
    throw err;
  }
}

// --- Fetch Activity for Month ---
export async function getActivityForMonth(year: number, month: number): Promise<ActivityEntry[]> {
  const startTimestamp = new Date(year, month - 1, 1).toISOString();
  const endTimestamp = new Date(year, month, 1).toISOString();

  const q = query(
    collection(db, "activity"),
    where("timestamp", ">=", startTimestamp),
    where("timestamp", "<", endTimestamp),
    orderBy("timestamp", "desc")
  );

  const snapshot = await withTimeout(getDocs(q));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityEntry));
}

// --- Real-time Activity Subscription ---
export function subscribeToActivityForMonth(
  year: number,
  month: number,
  callback: (entries: ActivityEntry[]) => void
): () => void {
  const startTimestamp = new Date(year, month - 1, 1).toISOString();
  const endTimestamp = new Date(year, month, 1).toISOString();

  const q = query(
    collection(db, "activity"),
    where("timestamp", ">=", startTimestamp),
    where("timestamp", "<", endTimestamp),
    orderBy("timestamp", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityEntry));
      callback(entries);
    },
    (error) => {
      console.error("[census.ts] Activity subscription error:", error);
      callback([]);
    }
  );
}

// --- Census Calculation ---
export async function getStartingCensus(year: number, month: number): Promise<number> {
  const docRef = doc(db, "censusConfig", `${year}-${String(month).padStart(2, "0")}`);
  const snap = await withTimeout(getDoc(docRef));
  if (snap.exists()) {
    return snap.data().startingCensus ?? 0;
  }
  // Try to get from previous month's ending census
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevDocRef = doc(db, "censusConfig", `${prevYear}-${String(prevMonth).padStart(2, "0")}`);
  const prevSnap = await withTimeout(getDoc(prevDocRef));
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
  await withTimeout(setDoc(docRef, { startingCensus: census }, { merge: true }));
}

export async function setEndingCensus(
  year: number,
  month: number,
  census: number
): Promise<void> {
  const docRef = doc(db, "censusConfig", `${year}-${String(month).padStart(2, "0")}`);
  await withTimeout(setDoc(docRef, { endingCensus: census }, { merge: true }));
}

export async function calculateMonthlyADC(year: number, month: number): Promise<MonthlyADC> {
  const [admissions, discharges, rtas, startingCensus] = await Promise.all([
    getAdmissionsForMonth(year, month),
    getDischargesForMonth(year, month),
    getRTAsForMonth(year, month),
    getStartingCensus(year, month),
  ]);

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

// --- Get full month data (ADC + raw records) in a single parallel fetch ---
export async function getMonthSummary(year: number, month: number): Promise<{
  adc: MonthlyADC;
  admissions: Admission[];
  discharges: Discharge[];
  rtas: RTA[];
}> {
  const [admissions, discharges, rtas, startingCensus] = await Promise.all([
    getAdmissionsForMonth(year, month),
    getDischargesForMonth(year, month),
    getRTAsForMonth(year, month),
    getStartingCensus(year, month),
  ]);

  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const monthDate = new Date(year, month - 1);

  const dailyCensus: Record<string, { admissions: number; discharges: number; rtas: number }> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = format(new Date(year, month - 1, d), "yyyy-MM-dd");
    dailyCensus[dateStr] = { admissions: 0, discharges: 0, rtas: 0 };
  }

  for (const a of admissions) if (dailyCensus[a.date]) dailyCensus[a.date].admissions++;
  for (const d of discharges) if (dailyCensus[d.date]) dailyCensus[d.date].discharges++;
  for (const r of rtas) if (dailyCensus[r.date]) dailyCensus[r.date].rtas++;

  let runningCensus = startingCensus;
  let totalCensusDays = 0;
  const today = format(new Date(), "yyyy-MM-dd");
  let daysElapsed = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = format(new Date(year, month - 1, d), "yyyy-MM-dd");
    if (dateStr > today) break;
    const day = dailyCensus[dateStr];
    runningCensus = runningCensus + day.admissions - day.discharges - day.rtas;
    totalCensusDays += runningCensus;
    daysElapsed++;
  }

  const averageDailyCensus = daysElapsed > 0 ? totalCensusDays / daysElapsed : 0;
  const { tier, amount } = calculateBonus(averageDailyCensus);

  return {
    adc: {
      month: `${year}-${String(month).padStart(2, "0")}`,
      year,
      monthName: format(monthDate, "MMMM yyyy"),
      totalCensusDays,
      daysInMonth: daysElapsed,
      averageDailyCensus: Math.round(averageDailyCensus * 100) / 100,
      bonusTier: tier,
      bonusAmount: amount,
    },
    admissions,
    discharges,
    rtas,
  };
}
