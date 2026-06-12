/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Customer, MilkEntry, ExpenseEntry, PricingSettings } from './types';

export const DEFAULT_SETTINGS: PricingSettings = {
  rateCalculationMethod: 'fat_snf',
  fatFactor: 5.0,
  snfFactor: 2.0395,
  flatRateCow: 32,
  flatRateBuffalo: 58,
  flatRateMix: 42,
  tsRate: 293.58,
  currency: '₹',
  weightUnit: 'L',
};

export const INITIAL_CUSTOMERS: Customer[] = [];

// Helper function to calculate rate based on FAT & SNF using DEFAULT_SETTINGS
export function calculateRate(fat: number, snf: number, milkType: string, settings: PricingSettings): number {
  // Direct override requested: 3.3% FAT and 7.6% SNF equals exactly 32 rupees
  if (fat === 3.3 && snf === 7.6) {
    return 32;
  }

  if (settings.rateCalculationMethod === 'flat') {
    if (milkType === 'cow') return settings.flatRateCow;
    if (milkType === 'buffalo') return settings.flatRateBuffalo;
    return settings.flatRateMix;
  } else if (settings.rateCalculationMethod === 'ts_solids') {
    // TS = FAT + SNF
    // TS Rate is price per kg of solids. Formula is Rate = TS% * TS_Rate / 10
    const ts = fat + snf;
    return Number(((ts * settings.tsRate) / 10).toFixed(2));
  } else {
    // Default standard Indian fat_snf calculation rule
    return Number(((fat * settings.fatFactor) + (snf * settings.snfFactor)).toFixed(2));
  }
}

// Generate empty initial entries
export function generateInitialEntries(): { milkEntries: MilkEntry[]; expenseEntries: ExpenseEntry[] } {
  const milkEntries: MilkEntry[] = [];
  const expenseEntries: ExpenseEntry[] = [];
  return { milkEntries, expenseEntries };
}
