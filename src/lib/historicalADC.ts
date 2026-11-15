/**
 * Verified monthly ADC and approved recognition bonuses transcribed from
 * Joseph West Brewer's 2026 bonus time-sheet screenshots.
 * These are monthly aggregates, NOT patient-level admissions/discharges.
 * January and February are intentionally absent (no source reports supplied).
 * March uses West Brewer's 22.30, not Thad Webb's separate 22.70 report.
 */
export const HISTORICAL_ADC_2026: Record<string, { adc: number; bonus: number }> = {
  "2026-03": { adc: 22.30, bonus: 750 },
  "2026-04": { adc: 27.27, bonus: 2000 },
  "2026-05": { adc: 23.81, bonus: 1350 },
  "2026-06": { adc: 29.13, bonus: 3000 },
  "2026-07": { adc: 29.87, bonus: 3000 },
  "2026-08": { adc: 23.06, bonus: 1350 },
  "2026-09": { adc: 32.70, bonus: 4000 },
  "2026-10": { adc: 30.48, bonus: 4000 },
};
