import {
  collection,
  query,
  where,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  setDoc,
  updateDoc,
  onSnapshot,
  getDoc as firestoreGetDoc,
} from "firebase/firestore";
import { db, withTimeout, getDocsResilient, getDocResilient } from "./firebase";
import {
  Admission,
  Discharge,
  RTA,
  MonthlyADC,
  ActivityType,
  ActivityEntry,
  BonusOverride,
} from "./types";
import { calculateBonus } from "./bonus";
import { format, getDaysInMonth, startOfMonth, endOfMonth } from "date-fns";

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// --- Hospitals (autocomplete suggestions) ---
export async function getHospitalNames(): Promise<string[]> {
  const q = query(collection(db, "hospitals"), orderBy("name"));
  const snapshot = await getDocsResilient(q);
  return snapshot.docs.map((d) => d.data().name as string);
}

export async function saveHospitalIfNew(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const existing = await getHospitalNames();
  const alreadyExists = existing.some(
    (h) => h.toLowerCase() === trimmed.toLowerCase()
  );
  if (alreadyExists) return;
  await withTimeout(
    addDoc(collection(db, "hospitals"), {
      name: trimmed,
      createdAt: new Date().toISOString(),
    })
  );
}

// --- Insurance Names (autocomplete suggestions) ---
export async function getInsuranceNames(): Promise<string[]> {
  const q = query(collection(db, "insuranceNames"), orderBy("name"));
  const snapshot = await getDocsResilient(q);
  return snapshot.docs.map((d) => d.data().name as string);
}

export async function saveInsuranceIfNew(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const existing = await getInsuranceNames();
  const alreadyExists = existing.some(
    (n) => n.toLowerCase() === trimmed.toLowerCase()
  );
  if (alreadyExists) return;
  await withTimeout(
    addDoc(collection(db, "insuranceNames"), {
      name: trimmed,
      createdAt: new Date().toISOString(),
    })
  );
}

// --- Discharge Facilities (autocomplete suggestions) ---
export async function getDischargeFacilityNames(): Promise<string[]> {
  const q = query(collection(db, "dischargeFacilities"), orderBy("name"));
  const snapshot = await getDocsResilient(q);
  return snapshot.docs.map((d) => d.data().name as string);
}

export async function saveDischargeFacilityIfNew(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const existing = await getDischargeFacilityNames();
  const alreadyExists = existing.some(
    (h) => h.toLowerCase() === trimmed.toLowerCase()
  );
  if (alreadyExists) return;
  await withTimeout(
    addDoc(collection(db, "dischargeFacilities"), {
      name: trimmed,
      createdAt: new Date().toISOString(),
    })
  );
}

// --- Admissions ---
export async function addAdmission(data: Omit<Admission, "id">): Promise<string> {
  const ref = await withTimeout(addDoc(collection(db, "admissions"), data));
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

  const snapshot = await getDocsResilient(q);
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
  const ref = await withTimeout(addDoc(collection(db, "discharges"), data));
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

  const snapshot = await getDocsResilient(q);
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
  const ref = await withTimeout(addDoc(collection(db, "rtas"), data));
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

  const snapshot = await getDocsResilient(q);
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
  const ref = await withTimeout(addDoc(collection(db, "activity"), activityDoc));
  return ref.id;
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
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const docRef = doc(db, "censusConfig", `${year}-${String(month).padStart(2, "0")}`);
  const prevDocRef = doc(db, "censusConfig", `${prevYear}-${String(prevMonth).padStart(2, "0")}`);

  // Fetch both months in parallel to avoid sequential round-trips.
  // Uses cache-first reads so this resolves instantly when data exists locally.
  const [snap, prevSnap] = await Promise.all([
    getDocResilient(docRef),
    getDocResilient(prevDocRef),
  ]);

  if (snap.exists()) {
    return snap.data().startingCensus ?? 0;
  }
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

// --- Bonus Overrides (super-user manual edits) ---
// This is a brand-new collection, so on most first-loads the override doc
// neither exists nor is cached — meaning every call hits the server.  If the
// server is slow or the user is on a flaky connection, a single timed-out
// fetch would otherwise crash the entire Bonus page.  "No override" is the
// overwhelmingly common case, so we treat a failed read as "no override"
// rather than propagating it.
export async function getBonusOverride(
  year: number,
  month: number
): Promise<BonusOverride | null> {
  try {
    const docRef = doc(db, "bonusOverrides", monthKey(year, month));
    const snap = await getDocResilient(docRef);
    if (!snap.exists()) return null;
    return { month: monthKey(year, month), ...(snap.data() as Omit<BonusOverride, "month">) };
  } catch (err) {
    console.warn(`[census.ts] getBonusOverride(${year}, ${month}) failed, defaulting to no override:`, err);
    return null;
  }
}

export async function setBonusOverride(
  year: number,
  month: number,
  override: { averageDailyCensus?: number | null; bonusAmount?: number | null },
  updatedBy: string
): Promise<void> {
  const docRef = doc(db, "bonusOverrides", monthKey(year, month));
  // Only persist fields that were explicitly provided (non-null). A null value
  // clears that field so the original calculation takes over.
  const payload: Record<string, unknown> = {
    updatedBy,
    updatedAt: new Date().toISOString(),
  };
  if (override.averageDailyCensus === null) {
    payload.averageDailyCensus = null;
  } else if (typeof override.averageDailyCensus === "number") {
    payload.averageDailyCensus = override.averageDailyCensus;
  }
  if (override.bonusAmount === null) {
    payload.bonusAmount = null;
  } else if (typeof override.bonusAmount === "number") {
    payload.bonusAmount = override.bonusAmount;
  }
  await withTimeout(setDoc(docRef, payload, { merge: true }));
}

export async function clearBonusOverride(year: number, month: number): Promise<void> {
  const docRef = doc(db, "bonusOverrides", monthKey(year, month));
  await withTimeout(deleteDoc(docRef));
}

/**
 * Apply a super-user override to a computed MonthlyADC.
 * Overriding the ADC re-derives the tier/amount via `calculateBonus`;
 * overriding the bonusAmount is applied last and wins unconditionally.
 */
function applyBonusOverride(
  base: MonthlyADC,
  override: BonusOverride | null
): MonthlyADC {
  if (!override) return base;
  let result = base;
  if (typeof override.averageDailyCensus === "number") {
    const adc = Math.round(override.averageDailyCensus * 100) / 100;
    const { tier, amount } = calculateBonus(adc);
    result = { ...result, averageDailyCensus: adc, bonusTier: tier, bonusAmount: amount };
  }
  if (typeof override.bonusAmount === "number") {
    result = { ...result, bonusAmount: override.bonusAmount };
  }
  return result;
}

function computeADC(
  year: number,
  month: number,
  admissions: Admission[],
  discharges: Discharge[],
  rtas: RTA[],
  startingCensus: number
): MonthlyADC {
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

export async function calculateMonthlyADC(year: number, month: number): Promise<MonthlyADC> {
  const [admissions, discharges, rtas, startingCensus, override] = await Promise.all([
    getAdmissionsForMonth(year, month),
    getDischargesForMonth(year, month),
    getRTAsForMonth(year, month),
    getStartingCensus(year, month),
    getBonusOverride(year, month),
  ]);

  const base = computeADC(year, month, admissions, discharges, rtas, startingCensus);
  return applyBonusOverride(base, override);
}

/**
 * Same as calculateMonthlyADC but reads the bonus override directly from the
 * server (bypassing the persistent cache).  Use this for PDF report generation
 * where accuracy matters more than latency.
 */
export async function calculateMonthlyADCFresh(year: number, month: number): Promise<MonthlyADC> {
  const overridePromise = (async (): Promise<BonusOverride | null> => {
    try {
      const docRef = doc(db, "bonusOverrides", monthKey(year, month));
      const snap = await withTimeout(firestoreGetDoc(docRef));
      if (!snap.exists()) return null;
      return { month: monthKey(year, month), ...(snap.data() as Omit<BonusOverride, "month">) };
    } catch {
      return null;
    }
  })();

  const [admissions, discharges, rtas, startingCensus, override] = await Promise.all([
    getAdmissionsForMonth(year, month),
    getDischargesForMonth(year, month),
    getRTAsForMonth(year, month),
    getStartingCensus(year, month),
    overridePromise,
  ]);

  const base = computeADC(year, month, admissions, discharges, rtas, startingCensus);
  return applyBonusOverride(base, override);
}

// --- Date-range queries (cross-month search) ---

export async function getAdmissionsForDateRange(startDate: string, endDate: string): Promise<Admission[]> {
  const q = query(
    collection(db, "admissions"),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc")
  );
  const snapshot = await getDocsResilient(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Admission));
}

export async function getDischargesForDateRange(startDate: string, endDate: string): Promise<Discharge[]> {
  const q = query(
    collection(db, "discharges"),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc")
  );
  const snapshot = await getDocsResilient(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Discharge));
}

export async function getRTAsForDateRange(startDate: string, endDate: string): Promise<RTA[]> {
  const q = query(
    collection(db, "rtas"),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc")
  );
  const snapshot = await getDocsResilient(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RTA));
}

// --- Check if entries exist for a date ---
export async function hasEntriesForDate(dateStr: string): Promise<boolean> {
  const admQ = query(collection(db, "admissions"), where("date", "==", dateStr));
  const dcQ = query(collection(db, "discharges"), where("date", "==", dateStr));
  const rtaQ = query(collection(db, "rtas"), where("date", "==", dateStr));

  const [admSnap, dcSnap, rtaSnap] = await Promise.all([
    getDocsResilient(admQ),
    getDocsResilient(dcQ),
    getDocsResilient(rtaQ),
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
  const [admissions, discharges, rtas, startingCensus, override] = await Promise.all([
    getAdmissionsForMonth(year, month),
    getDischargesForMonth(year, month),
    getRTAsForMonth(year, month),
    getStartingCensus(year, month),
    getBonusOverride(year, month),
  ]);

  const base = computeADC(year, month, admissions, discharges, rtas, startingCensus);
  return {
    adc: applyBonusOverride(base, override),
    admissions,
    discharges,
    rtas,
  };
}
