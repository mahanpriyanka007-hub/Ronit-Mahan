/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Customer, MilkEntry, ExpenseEntry, PricingSettings, BillingPeriod } from '../types';
import { FileText, Printer, Clipboard, Calendar, Users, Milk, Landmark, AlertCircle } from 'lucide-react';

interface BillingReportProps {
  customers: Customer[];
  milkEntries: MilkEntry[];
  expenseEntries: ExpenseEntry[];
  settings: PricingSettings;
  onSettleEntries?: (customerId: string, milkEntryIds: string[], expenseEntryIds: string[]) => void;
  onUnsettleEntries?: (customerId: string, milkEntryIds: string[], expenseEntryIds: string[]) => void;
}

// Generate cycle date filters based on selected month, year, and choice (10/20/30 days)
export default function BillingReport({
  customers,
  milkEntries,
  expenseEntries,
  settings,
  onSettleEntries,
  onUnsettleEntries,
}: BillingReportProps) {
  const [selectedCustId, setSelectedCustId] = useState('');
  const [cyclePeriod, setCyclePeriod] = useState<BillingPeriod>('10');
  const [selectedMonth, setSelectedMonth] = useState('05'); // May
  const [selectedYear, setSelectedYear] = useState('2026');
  const [subCycle, setSubCycle] = useState<'1' | '2' | '3'>('1'); // Cycle 1, 2, or 3
  const [copied, setCopied] = useState(false);

  // Initialize selected customer
  useState(() => {
    if (customers.length > 0) {
      setSelectedCustId(customers[0].id);
    }
  });

  // Calculate concrete start/end range dates for chosen billing cycle options
  const dateRange = useMemo(() => {
    const yearNum = Number(selectedYear);
    const monthNum = Number(selectedMonth);

    // Get last day of active month
    const lastDayOfMonth = new Date(yearNum, monthNum, 0).getDate();

    let startDay = 1;
    let endDay = 10;

    if (cyclePeriod === '10') {
      if (subCycle === '1') {
        startDay = 1;
        endDay = 10;
      } else if (subCycle === '2') {
        startDay = 11;
        endDay = 20;
      } else {
        startDay = 21;
        endDay = lastDayOfMonth;
      }
    } else if (cyclePeriod === '20') {
      if (subCycle === '1') {
        startDay = 1;
        endDay = 20;
      } else {
        startDay = 21;
        endDay = lastDayOfMonth;
      }
    } else {
      // 30 Days (all month)
      startDay = 1;
      endDay = lastDayOfMonth;
    }

    const pad = (num: number) => num.toString().padStart(2, '0');
    
    return {
      start: `${selectedYear}-${pad(monthNum)}-${pad(startDay)}`,
      end: `${selectedYear}-${pad(monthNum)}-${pad(endDay)}`,
      displayText: `${pad(startDay)}/${pad(monthNum)}/${selectedYear} to ${pad(endDay)}/${pad(monthNum)}/${selectedYear}`,
    };
  }, [cyclePeriod, selectedMonth, selectedYear, subCycle]);

  // Retrieve active customer details
  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustId);
  }, [customers, selectedCustId]);

  // Filter entry matches within this concrete range
  const filteredMilkEntries = useMemo(() => {
    if (!selectedCustId) return [];
    return milkEntries
      .filter((entry) => {
        return (
          entry.customerId === selectedCustId &&
          entry.date >= dateRange.start &&
          entry.date <= dateRange.end
        );
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.shift.localeCompare(b.shift));
  }, [milkEntries, selectedCustId, dateRange]);

  const filteredExpenseEntries = useMemo(() => {
    if (!selectedCustId) return [];
    return expenseEntries
      .filter((entry) => {
        return (
          entry.customerId === selectedCustId &&
          entry.date >= dateRange.start &&
          entry.date <= dateRange.end
        );
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [expenseEntries, selectedCustId, dateRange]);

  // Calculate statistics for the selected customer & period
  const invoiceCalculations = useMemo(() => {
    const totalWeight = filteredMilkEntries.reduce((acc, curr) => acc + curr.weight, 0);
    const grossMilkAmount = filteredMilkEntries.reduce((acc, curr) => acc + curr.amount, 0);
    const totalDeductedExpenses = filteredExpenseEntries.reduce((acc, curr) => acc + curr.amount, 0);
    const netPayable = grossMilkAmount - totalDeductedExpenses;

    const avgFat = filteredMilkEntries.length > 0
      ? Number((filteredMilkEntries.reduce((acc, curr) => acc + curr.fat, 0) / filteredMilkEntries.length).toFixed(1))
      : 0;

    const avgSnf = filteredMilkEntries.length > 0
      ? Number((filteredMilkEntries.reduce((acc, curr) => acc + curr.snf, 0) / filteredMilkEntries.length).toFixed(1))
      : 0;

    const paidMilkCount = filteredMilkEntries.filter(e => e.status === 'paid').length;
    const paidExpenseCount = filteredExpenseEntries.filter(e => e.status === 'paid').length;
    const isPaidAndSettled = (filteredMilkEntries.length > 0 || filteredExpenseEntries.length > 0) &&
      (paidMilkCount === filteredMilkEntries.length) &&
      (paidExpenseCount === filteredExpenseEntries.length);

    return {
      totalWeight,
      grossMilkAmount,
      totalDeductedExpenses,
      netPayable,
      avgFat,
      avgSnf,
      isPaidAndSettled,
    };
  }, [filteredMilkEntries, filteredExpenseEntries]);

  // Generate WhatsApp summary paste-able text
  const shareText = useMemo(() => {
    if (!activeCustomer) return '';
    const emojiType = activeCustomer.milkType === 'cow' ? '🐄 Cow' : activeCustomer.milkType === 'buffalo' ? '🐃 Buffalo' : '🌿 Mixed';
    return `*PREM DAIRY - BILL RECEIPT* 🥛\n--------------------------\n*Customer Name:* ${activeCustomer.name}\n*Breed Category:* ${emojiType}\n*Period of Bill:* ${dateRange.displayText}\n--------------------------\n🥛 *Milk Collected:* ${invoiceCalculations.totalWeight.toFixed(1)} ${settings.weightUnit}\n⭐ *Avg FAT/SNF:* ${invoiceCalculations.avgFat}% / ${invoiceCalculations.avgSnf}%\n💵 *Milk Value Cr.:* ${settings.currency}${invoiceCalculations.grossMilkAmount.toLocaleString()}\n🌾 *Cattle Exp Dr.:* ${settings.currency}${invoiceCalculations.totalDeductedExpenses.toLocaleString()}\n--------------------------\n💰 *NET PAYABLE DUE:* ${settings.currency}${invoiceCalculations.netPayable.toLocaleString()}\n--------------------------\n_Thank you for choosing Prem Dairy!_`;
  }, [activeCustomer, dateRange, invoiceCalculations, settings]);

  const handleCopyReceipt = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-[#111114] rounded-2xl border border-slate-800 p-6 space-y-6" id="billing-panel">
      {/* Filtering Options header */}
      <div className="border-b border-slate-850 pb-5">
        <h2 className="text-xl font-bold font-sans text-white tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5 text-sky-400" />
          Periodic Settlement & Invoice Billing
        </h2>
        <p className="text-xs text-slate-400 font-sans mt-0.5">
          Select customer accounts and periodic cycles (10, 20, or 30 days) to calculate totals
        </p>

        {/* Configuration grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-5 bg-[#16161a] p-4 rounded-xl border border-slate-850 text-xs">
          
          {/* 1. Customer Select */}
          <div className="space-y-1.5 font-sans">
            <span className="font-semibold text-slate-500 uppercase tracking-wider block">1. Customer account</span>
            <select
              value={selectedCustId}
              onChange={(e) => setSelectedCustId(e.target.value)}
              className="w-full bg-[#111114] text-slate-200 font-semibold px-3 py-2 rounded-lg border border-[#1f2229] focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              id="billing-customer-select"
            >
              <option value="" className="bg-[#111114]">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#111114]">
                  {c.name} ({c.milkType === 'cow' ? 'Cow' : c.milkType === 'buffalo' ? 'Buff' : 'Mix'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Cycle Choice (10/20/30) */}
          <div className="space-y-1.5 font-sans">
            <span className="font-semibold text-slate-505 uppercase tracking-wider block">2. Billing Span Choice</span>
            <select
              value={cyclePeriod}
              onChange={(e) => {
                setCyclePeriod(e.target.value as BillingPeriod);
                setSubCycle('1');
              }}
              className="w-full bg-[#111114] text-slate-200 font-semibold px-3 py-2 rounded-lg border border-[#1f2229] focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              id="billing-cycle-select"
            >
              <option value="10" className="bg-[#111114]">10-Day Cycle Intervals</option>
              <option value="20" className="bg-[#111114]">20-Day Cycle Intervals</option>
              <option value="30" className="bg-[#111114]">30-Day Monthly Cycle</option>
            </select>
          </div>

          {/* 3. Sub-Cycle division */}
          <div className="space-y-1.5 font-sans">
            <span className="font-semibold text-slate-500 uppercase tracking-wider block">3. Specific Cycle Range</span>
            {cyclePeriod === '10' ? (
              <select
                value={subCycle}
                onChange={(e) => setSubCycle(e.target.value as any)}
                className="w-full bg-[#111114] text-slate-200 font-semibold px-3 py-2 rounded-lg border border-[#1f2229] focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                id="billing-sub-cycle-select"
              >
                <option value="1" className="bg-[#111114]">Cycle 1 (Day 1 - 10)</option>
                <option value="2" className="bg-[#111114]">Cycle 2 (Day 11 - 20)</option>
                <option value="3" className="bg-[#111114]">Cycle 3 (Day 21 - End)</option>
              </select>
            ) : cyclePeriod === '20' ? (
              <select
                value={subCycle}
                onChange={(e) => setSubCycle(e.target.value as any)}
                className="w-full bg-[#111114] text-slate-200 font-semibold px-3 py-2 rounded-lg border border-[#1f2229] focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                id="billing-sub-cycle-select-20"
              >
                <option value="1" className="bg-[#111114]">Cycle 1 (Day 1 - 20)</option>
                <option value="2" className="bg-[#111114]">Cycle 2 (Day 21 - End)</option>
              </select>
            ) : (
              <div className="bg-[#0e0e11] p-2 text-slate-500 text-center rounded-lg font-medium border border-slate-850">
                Full Month Selected
              </div>
            )}
          </div>

          {/* 4. Month Selector */}
          <div className="space-y-1.5 font-sans">
            <span className="font-semibold text-slate-505 uppercase tracking-wider block">4. Select Month & Year</span>
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-[#111114] text-slate-205 font-bold px-1.5 py-2 rounded-lg border border-[#1f2229] focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="01" className="bg-[#111114]">Jan</option>
                <option value="02" className="bg-[#111114]">Feb</option>
                <option value="03" className="bg-[#111114]">Mar</option>
                <option value="04" className="bg-[#111114]">Apr</option>
                <option value="05" className="bg-[#111114]">May</option>
                <option value="06" className="bg-[#111114]">Jun</option>
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-[#111114] text-slate-205 font-bold px-1.5 py-2 rounded-lg border border-[#1f2229] focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="2026" className="bg-[#111114]">2026</option>
                <option value="2025" className="bg-[#111114]">2025</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Main Billing Output */}
      {!selectedCustId ? (
        <div className="h-64 border border-dashed border-slate-800 bg-[#0e0e11] rounded-xl flex flex-col justify-center items-center text-slate-500 text-xs">
          <Users className="w-10 h-10 text-slate-700 stroke-1 mb-2 animate-pulse" />
          Choose a customer account at the top to load invoices.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="invoice-layout-sections">
          
          {/* LEFT: Live Billing Summary stats (1 col on desktop) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold font-sans text-slate-500 uppercase tracking-wider">
              Settlement Performance
            </h3>

            {/* Metrics cards stack */}
            <div className="space-y-3">
              {/* Deliveries counted */}
              <div className="bg-[#16161a] border border-slate-850 rounded-xl p-4 flex justify-between items-center text-xs font-sans">
                <div>
                  <span className="text-slate-500 block font-semibold">Recorded Deliveries</span>
                  <span className="text-lg font-bold text-slate-200 font-sans block mt-0.5">
                    {filteredMilkEntries.length} collection logs
                  </span>
                </div>
                <span className="bg-sky-500/5 text-sky-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-500/10">
                  {filteredMilkEntries.length > 0 ? 'Active Supply' : 'No Supply'}
                </span>
              </div>

              {/* Liters total */}
              <div className="bg-[#16161a] border border-slate-850 rounded-xl p-4 text-xs space-y-2">
                <div className="flex justify-between items-center font-sans">
                  <span className="text-slate-500 font-semibold">Liters / Weight Summary</span>
                  <Milk className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-xl font-bold font-mono text-slate-200">
                  {invoiceCalculations.totalWeight.toFixed(1)} <span className="text-xs font-sans text-slate-500 font-normal">{settings.weightUnit}</span>
                </div>
                {filteredMilkEntries.length > 0 && (
                  <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-850 flex justify-between font-mono">
                    <span>Avg FAT: <strong className="text-slate-300">{invoiceCalculations.avgFat}%</strong></span>
                    <span>Avg SNF: <strong className="text-slate-300">{invoiceCalculations.avgSnf}%</strong></span>
                  </div>
                )}
              </div>

              {/* Balances subtraction visual bento */}
              <div className="bg-[#0e0e11] border border-slate-800 rounded-xl p-4 text-xs space-y-3.5">
                <div className="flex justify-between items-center text-slate-500 font-sans">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Net Balance calculation</span>
                  <Landmark className="w-4 h-4 text-sky-400" />
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Milk Credit (+):</span>
                    <span className="font-mono text-sky-400 font-bold">
                      {settings.currency}
                      {invoiceCalculations.grossMilkAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cattle Exp (-):</span>
                    <span className="font-mono text-rose-450 font-semibold">
                      -{settings.currency}
                      {invoiceCalculations.totalDeductedExpenses.toLocaleString()}
                    </span>
                  </div>

                  <div className="border-t border-slate-850 pt-2.5 mt-2.5 flex justify-between items-center">
                    <span className="text-slate-300 font-semibold text-xs font-sans">Net Payment Due:</span>
                    <span className="text-lg font-bold font-mono text-white">
                      {settings.currency}
                      {invoiceCalculations.netPayable.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions for share receipt */}
            <div className="bg-[#16161a] p-4 border border-slate-850 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-slate-300 block font-sans">Dairy sharing utilities</span>
              <p className="text-[11px] text-slate-450 font-sans">
                You can copy a clean formatted WhatsApp receipt summary or send print instructions to write to the office slips.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 font-sans">
                <button
                  onClick={handleCopyReceipt}
                  className="px-3 py-2 bg-sky-505 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  id="btn-copy-receipt"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  {copied ? 'Copied ✅' : 'WhatsApp Copy'}
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3 py-2 bg-[#111114] hover:bg-[#1c1c22] text-slate-300 border border-slate-800 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  id="btn-print-invoice"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-400" />
                  Print Slip
                </button>
              </div>
            </div>

            {/* PAYMENT SETTLEMENT CONTROL DECK */}
            {(filteredMilkEntries.length > 0 || filteredExpenseEntries.length > 0) && (
              <div className="bg-[#16161a] p-4 border border-emerald-950 rounded-xl space-y-2.5 text-xs animate-fade-in relative overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="p-0.5 px-2 rounded text-[8px] bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider font-mono">
                    System Ledger
                  </span>
                  <span className="font-bold text-slate-200 block font-sans">Cash Settlement Desk</span>
                </div>
                
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Mark selected entries as <strong>PAID</strong>. This immediately updates net ledger dues throughout the application to 0.
                </p>

                {invoiceCalculations.isPaidAndSettled ? (
                  <div className="space-y-2 pt-1">
                    <div className="bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-[10.5px] p-2.5 rounded-lg font-bold text-center flex items-center justify-center gap-1.5 font-sans">
                      <span>✓ Invoice Fully Paid & Closed</span>
                    </div>
                    {onUnsettleEntries && (
                      <button
                        onClick={() => {
                          const mIds = filteredMilkEntries.map(e => e.id);
                          const eIds = filteredExpenseEntries.map(e => e.id);
                          if (window.confirm("Undo settlement and revert this billing period's entries to unpaid?")) {
                            onUnsettleEntries(selectedCustId, mIds, eIds);
                          }
                        }}
                        className="w-full px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-405 hover:text-slate-300 border border-slate-800 rounded-lg text-[10px] font-semibold transition-all cursor-pointer text-center"
                      >
                        Revert Settlement to Unpaid
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        const mIds = filteredMilkEntries.map(e => e.id);
                        const eIds = filteredExpenseEntries.map(e => e.id);
                        if (window.confirm(`Mark bill of ${settings.currency}${invoiceCalculations.netPayable.toLocaleString()} for ${activeCustomer?.name} as settled? This flags all matching dairy receipts and expense demerits as PAID.`)) {
                          if (onSettleEntries) {
                            onSettleEntries(selectedCustId, mIds, eIds);
                          }
                        }
                      }}
                      className="w-full px-3 py-2.5 bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-black rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <span>💸 Mark as Settled & Paid ({settings.currency}{invoiceCalculations.netPayable.toLocaleString()})</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Invoice sheet visual design (2 cols on desktop) */}
          <div className="lg:col-span-2 border border-slate-800 rounded-2xl p-6 bg-[#16161a] relative overflow-hidden flex flex-col justify-between" id="visual-invoice-slip">
            
            {/* Milk Glass background watermark decorative */}
            <div className="absolute right-[-10%] top-[-10%] opacity-5 hover:opacity-10 transition-opacity pointer-events-none select-none">
              <span className="text-[180px]">🥛</span>
            </div>

            {/* Paid Stamp Watermark */}
            {invoiceCalculations.isPaidAndSettled && (
              <div className="absolute right-[8%] top-[30%] -rotate-[12deg] border-4 border-emerald-500/30 text-emerald-500/55 rounded-xl px-4 py-2 font-black tracking-widest text-xl select-none uppercase font-mono pointer-events-none animate-pulse z-10 bg-slate-950/80 shadow-2xl">
                ✓ PAID & SETTLED
              </div>
            )}

            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-850 pb-5">
                <div>
                  <h4 className="text-lg font-black font-sans text-sky-400 tracking-tight uppercase">
                    🥛 PREM DAIRY
                  </h4>
                  <p className="text-[10px] text-slate-550 font-mono tracking-wider space-x-1 uppercase mt-1">
                    Vite-Powered AgriTech Dairy ERP
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                    Phone: +91 99880 11223 | Bihar, India
                  </p>
                </div>
                <div className="text-right font-sans">
                  <span className="bg-sky-505 bg-sky-500/10 text-sky-400 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider font-sans block mb-1 border border-sky-500/10">
                    Settlement Invoice
                  </span>
                  <span className="text-slate-500 text-[10px] font-mono block">
                    ID: PD-{selectedCustId.replace('cust_', '')}-{selectedMonth}{selectedYear.substring(2)}
                  </span>
                  <span className="text-slate-505 text-[9px] block">
                    Created: {new Date().toISOString().split('T')[0]}
                  </span>
                </div>
              </div>

              {/* Customer Account & Cycle details */}
              <div className="grid grid-cols-2 gap-4 bg-[#111114] border border-slate-850 p-4 rounded-xl text-xs font-sans">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Billing Customer</span>
                  <span className="text-sm font-bold text-slate-200 tracking-tight block mt-1">{activeCustomer?.name}</span>
                  <span className="text-slate-400 mt-0.5 block font-mono">Mob: +91 {activeCustomer?.phone}</span>
                  <span className="text-slate-500 mt-0.5 block">{activeCustomer?.address}</span>
                </div>
                <div className="text-right flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Billing Cycle Span</span>
                    <span className="text-sky-400 font-semibold block mt-1">
                      {cyclePeriod === '10' ? '10-Days Interval Cycle' : cyclePeriod === '20' ? '20-Days Interval Cycle' : '30-Days Full Monthly Cycle'}
                    </span>
                    <span className="text-slate-300 font-mono block mt-1.5 text-[10px] bg-[#16161a] border border-slate-800 px-2 py-0.5 rounded-full inline-block">
                      {dateRange.displayText}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mt-2">Breed Category</span>
                    <span className="text-slate-300 capitalize mt-0.5 block font-medium">
                      {activeCustomer?.milkType === 'cow' ? '🐄 Cow Breed' : activeCustomer?.milkType === 'buffalo' ? '🐃 Buffalo Breed' : '🌿 Mixed Feed Milk'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main table list of Deliveries */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                  Milk Supply Receipts list ({filteredMilkEntries.length})
                </span>

                <div className="max-h-60 overflow-y-auto border border-slate-850 rounded-lg bg-[#111114] scroller-subtle">
                  {filteredMilkEntries.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs flex justify-center items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-605" />
                      No milk delivery entries found during this specific cycle.
                    </div>
                  ) : (
                    <table className="w-full text-left text-[11px] border-collapse font-sans">
                      <thead>
                        <tr className="bg-[#0e0e11] text-slate-400 font-semibold border-b border-slate-850 uppercase tracking-wider text-[8.5px]">
                          <th className="p-2">Date / Shift</th>
                          <th className="p-2 text-right">FAT %</th>
                          <th className="p-2 text-right">SNF %</th>
                          <th className="p-2 text-right">Weight</th>
                          <th className="p-2 text-right">Rate</th>
                          <th className="p-2 text-right">Credit Amt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {filteredMilkEntries.map((log) => (
                           <tr key={log.id} className="hover:bg-slate-900/40 font-mono">
                            <td className="p-2 font-sans font-medium text-slate-200">
                              {log.date.substring(8)}/{log.date.substring(5, 7)}{' '}
                              <span className="text-[9px] text-slate-500 uppercase font-bold mr-1">
                                {log.shift === 'morning' ? '☀️ M' : '🌙 E'}
                              </span>
                              {log.status === 'paid' ? (
                                <span className="text-[9.5px] text-emerald-400 font-extrabold" title="Paid/Settled">✓ Paid</span>
                              ) : (
                                <span className="text-[9px] text-slate-600 font-bold" title="Unpaid pending">* Due</span>
                              )}
                            </td>
                            <td className="p-2 text-right text-slate-400">{log.fat ? `${log.fat}%` : '-'}</td>
                            <td className="p-2 text-right text-slate-400">{log.snf ? `${log.snf}%` : '-'}</td>
                            <td className="p-2 text-right text-slate-200">
                              {log.weight.toFixed(1)} {settings.weightUnit}
                            </td>
                            <td className="p-2 text-right text-slate-405">
                              {settings.currency}
                              {log.rate.toFixed(2)}
                            </td>
                            <td className="p-2 text-right text-sky-455 font-bold">
                              {settings.currency}
                              {log.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Main table list of Expenses */}
              <div className="space-y-2 pt-2 border-t border-slate-850">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                  Other Cattle Feed & Expense Deductions ({filteredExpenseEntries.length})
                </span>

                <div className="max-h-40 overflow-y-auto border border-slate-850 rounded-lg bg-[#111114] scroller-subtle">
                  {filteredExpenseEntries.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs flex justify-center items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-600" />
                      No wheat bran, pashu aahar, or loans found during this cycle.
                    </div>
                  ) : (
                    <table className="w-full text-left text-[11px] border-collapse font-sans">
                      <thead>
                        <tr className="bg-[#0e0e11] text-slate-400 font-semibold border-b border-slate-850 uppercase tracking-wider text-[8.5px]">
                          <th className="p-2">Date</th>
                          <th className="p-2">Category</th>
                          <th className="p-2">Description Item Detail</th>
                          <th className="p-2 text-right">Debit Amt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {filteredExpenseEntries.map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-900/40 font-mono">
                            <td className="p-2 font-sans text-slate-400">
                              {exp.date.substring(8)}/{exp.date.substring(5, 7)}{' '}
                              {exp.status === 'paid' && (
                                <span className="text-[9.5px] text-emerald-400 font-extrabold" title="Paid/Settled">✓ Paid</span>
                              )}
                            </td>
                            <td className="p-2 font-sans font-semibold text-slate-350 capitalize">
                              {exp.category === 'feed' ? '🌾 Feed' : exp.category === 'medicine' ? '💊 Med' : exp.category === 'advance' ? '💵 Advance' : '⚙️ Other'}
                            </td>
                            <td className="p-2 font-sans text-[#cbd5e1] truncate max-w-[180px]">{exp.description}</td>
                            <td className="p-2 text-right text-rose-400 font-semibold font-mono">
                              {settings.currency}
                              {exp.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Print Sign fields & summaries below */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-5 mt-6 text-[10px] font-sans">
              <div>
                <span className="text-slate-500 italic font-medium">Declaration Note:</span>
                <p className="text-slate-400 leading-tight mt-1">
                  Rate calculated automatically using Amul formula standard factors where applicable. All deliveries are subject to verification.
                </p>
              </div>
              <div className="text-right space-y-1">
                <span className="text-slate-500 uppercase tracking-widest block font-bold text-[8px] mb-8">
                  Prem Dairy Signature
                </span>
                <div className="border-b border-slate-700 w-28 ml-auto"></div>
                <span className="text-slate-400 block font-sans">Authorized Operator Slip</span>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
