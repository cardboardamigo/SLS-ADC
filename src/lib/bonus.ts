import { BonusTier } from "./types";

export const BONUS_TIERS: BonusTier[] = [
  { adcThreshold: 36, bonusAmount: 7000 },
  { adcThreshold: 33, bonusAmount: 5000 },
  { adcThreshold: 30, bonusAmount: 4000 },
  { adcThreshold: 28, bonusAmount: 3000 },
  { adcThreshold: 26, bonusAmount: 2000 },
  { adcThreshold: 23, bonusAmount: 1350 },
  { adcThreshold: 20, bonusAmount: 750 },
];

export function calculateBonus(adc: number): { tier: BonusTier | null; amount: number } {
  for (const tier of BONUS_TIERS) {
    if (adc >= tier.adcThreshold) {
      return { tier, amount: tier.bonusAmount };
    }
  }
  return { tier: null, amount: 0 };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
