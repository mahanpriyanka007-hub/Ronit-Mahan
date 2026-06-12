/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  milkType: 'cow' | 'buffalo' | 'mix';
  joiningDate: string;
  status: 'active' | 'inactive';
}

export interface MilkEntry {
  id: string;
  customerId: string;
  date: string; // YYYY-MM-DD
  shift: 'morning' | 'evening';
  weight: number; // in liters/kg
  fat: number; // FAT %
  snf: number; // SNF %
  rate: number; // Price per Liter/Kg
  amount: number; // weight * rate
  status?: 'unpaid' | 'paid';
}

export interface ExpenseEntry {
  id: string;
  customerId: string;
  date: string; // YYYY-MM-DD
  category: 'feed' | 'medicine' | 'advance' | 'other';
  description: string;
  amount: number;
  status?: 'unpaid' | 'paid';
}

export interface PricingSettings {
  rateCalculationMethod: 'fat_snf' | 'flat' | 'ts_solids';
  fatFactor: number; // INR per FAT point (e.g. 7.5)
  snfFactor: number; // INR per SNF point (e.g. 4.2)
  flatRateCow: number; // flat rate for cow milk (e.g. 42)
  flatRateBuffalo: number; // flat rate for buffalo milk (e.g. 55)
  flatRateMix: number; // flat rate for mixed milk (e.g. 48)
  tsRate: number; // Rate per KG of Total Solids (e.g. 350)
  currency: string; // "₹" or local symbol
  weightUnit: 'L' | 'kg'; // Liters or Kilograms
}

export type BillingPeriod = '10' | '20' | '30';

export interface CustomerSettlementSummary {
  customerId: string;
  customerName: string;
  milkType: string;
  totalWeight: number;
  avgFat: number;
  avgSnf: number;
  milkAmount: number;
  expenseAmount: number;
  dueAmount: number; // milkAmount - expenseAmount
}
