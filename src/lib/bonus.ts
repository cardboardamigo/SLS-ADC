import { BonusTier } from "./types";
import { BONUS_TIERS } from "./config";

export { BONUS_TIERS };

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
