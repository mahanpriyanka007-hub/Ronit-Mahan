/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Customer, MilkEntry, PricingSettings } from '../types';
import { calculateRate } from '../data';
import { Save, X, Calendar, Sun, Moon, Weight, Compass, Percent, Calculator, ListPlus } from 'lucide-react';

interface MilkEntryFormProps {
  customers: Customer[];
  settings: PricingSettings;
  onSaveEntry: (entry: MilkEntry) => void;
  onClose: () => void;
  editEntry?: MilkEntry | null;
}

export default function MilkEntryForm({
  customers,
  settings,
  onSaveEntry,
  onClose,
  editEntry = null,
}: MilkEntryFormProps) {
  const activeCustomers = customers.filter(c => c.status === 'active');
  
  // States
  const [selectedCustId, setSelectedCustId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<'morning' | 'evening'>('morning');
  const [weight, setWeight] = useState<number | ''>('');
  const [fat, setFat] = useState<number | ''>('');
  const [snf, setSNF] = useState<number | ''>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch the selected customer to decide default milk type & display guidance
  const currentCustomer = customers.find((c) => c.id === selectedCustId);

  // Automatically adjust default standard FAT & SNF values when customer changes
  // to help the milkman type faster (can overwrite)
  useEffect(() => {
    if (currentCustomer && !editEntry) {
      if (currentCustomer.milkType === 'cow') {
        setFat(4.0);
        setSNF(8.5);
      } else if (currentCustomer.milkType === 'buffalo') {
        setFat(7.0);
        setSNF(9.0);
      } else {
        setFat(5.0);
        setSNF(8.7);
      }
    }
  }, [selectedCustId, currentCustomer, editEntry]);

  // Load edit values
  useEffect(() => {
    if (editEntry) {
      setSelectedCustId(editEntry.customerId);
      setDate(editEntry.date);
      setShift(editEntry.shift);
      setWeight(editEntry.weight);
      setFat(editEntry.fat);
      setSNF(editEntry.snf);
    } else {
      if (activeCustomers.length > 0) {
        setSelectedCustId(activeCustomers[0].id);
      }
    }
    setErrors({});
  }, [editEntry, customers]);

  // Dynamic live previews
  const liveRate = typeof fat === 'number' && typeof snf === 'number' && currentCustomer
    ? calculateRate(fat, snf, currentCustomer.milkType, settings)
    : 0;

  const liveAmount = typeof weight === 'number' && liveRate > 0
    ? Number((weight * liveRate).toFixed(2))
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!selectedCustId) newErrors.customerId = 'Please select a customer';
    if (!date) newErrors.date = 'Date is required';
    if (!weight || Number(weight) <= 0) newErrors.weight = 'Please enter a valid weight > 0';

    if (settings.rateCalculationMethod !== 'flat') {
      if (!fat || Number(fat) < 1 || Number(fat) > 15) {
        newErrors.fat = 'FAT must be between 1.0% and 15.0%';
      }
      if (!snf || Number(snf) < 4 || Number(snf) > 15) {
        newErrors.snf = 'SNF must be between 4.0% and 15.0%';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: MilkEntry = {
      id: editEntry ? editEntry.id : `milk_${Date.now()}`,
      customerId: selectedCustId,
      date,
      shift,
      weight: Number(weight),
      fat: settings.rateCalculationMethod === 'flat' ? 0 : Number(fat),
      snf: settings.rateCalculationMethod === 'flat' ? 0 : Number(snf),
      rate: liveRate,
      amount: liveAmount,
    };

    onSaveEntry(payload);
  };

  return (
    <div className="fixed inset-0 bg-[#060608]/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div 
        className="bg-[#111114] rounded-2xl border border-slate-800 w-full max-w-lg overflow-hidden animate-fade-in shadow-2xl"
        id="milk-modal-dialog"
      >
        {/* Header */}
        <div className="bg-[#16161a] border-b border-slate-850 px-6 py-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg font-sans tracking-tight flex items-center gap-2 text-white">
            <ListPlus className="w-5 h-5 text-sky-400" />
            {editEntry ? '✏️ Edit Milk Delivery Entry' : '🥛 Daily Milk Delivery Entry'}
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white hover:bg-slate-850 p-1.5 rounded-lg transition-colors cursor-pointer"
            id="close-milk-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info panel */}
        <div className="bg-sky-500/5 border-b border-slate-850/60 p-4 px-6 flex justify-between items-center text-xs font-sans">
          <div className="text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500 block">Calculation Logic</span>
            <span className="font-medium mt-0.5 text-slate-300 block">
              {settings.rateCalculationMethod === 'flat' ? (
                <span>Flat Rate (Cow: {settings.currency}{settings.flatRateCow}, Buffalo: {settings.currency}{settings.flatRateBuffalo}/L)</span>
              ) : settings.rateCalculationMethod === 'ts_solids' ? (
                <span>Total Solids TS Method: TS * {settings.currency}{settings.tsRate} / 10</span>
              ) : (
                <span>Fat & SNF Equation: (FAT * {settings.fatFactor}) + (SNF * {settings.snfFactor})</span>
              )}
            </span>
          </div>
          <div className="text-right">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500 block">Default Unit</span>
            <span className="font-mono text-sky-405 font-bold mt-0.5 block">{settings.weightUnit === 'L' ? 'Litre (L)' : 'Kilogram (Kg)'}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-300 text-sm">
          {/* Main Grid split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Customer Dropdown Selection */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Select Customer
              </label>
              <select
                disabled={!!editEntry}
                value={selectedCustId}
                onChange={(e) => setSelectedCustId(e.target.value)}
                className={`w-full py-2.5 px-3 rounded-lg border border-[#1f2229] bg-[#16161a] text-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer ${
                  editEntry ? 'opacity-70 bg-slate-900 cursor-not-allowed' : ''
                }`}
                id="select-entry-customer"
              >
                {activeCustomers.length === 0 ? (
                  <option value="">No Active Customers Registered</option>
                ) : (
                  activeCustomers.map((cust) => (
                    <option key={cust.id} value={cust.id} className="bg-[#111114] text-white">
                      {cust.name} ({cust.milkType === 'cow' ? '🐄 Cow' : cust.milkType === 'buffalo' ? '🐃 Buff' : '🌿 Mix'})
                    </option>
                  ))
                )}
              </select>
              {errors.customerId && <p className="text-xs text-rose-400 mt-1">{errors.customerId}</p>}
            </div>

            {/* Date Field */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-505 uppercase tracking-wider">
                Collection Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#1f2229] bg-[#16161a] text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  id="entry-collection-date"
                />
              </div>
              {errors.date && <p className="text-xs text-rose-400 mt-1">{errors.date}</p>}
            </div>

            {/* Shift Choice */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Collection Shift
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setShift('morning')}
                  className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer font-semibold text-xs flex justify-center items-center gap-1.5 ${
                    shift === 'morning'
                      ? 'border-sky-500 bg-sky-500/10 text-white'
                      : 'border-slate-805 bg-[#16161a] hover:bg-slate-900 text-slate-400'
                  }`}
                  id="btn-shift-morning"
                >
                  <Sun className="w-4 h-4 text-amber-505" />
                  <span>Morning Shift</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShift('evening')}
                  className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer font-semibold text-xs flex justify-center items-center gap-1.5 ${
                    shift === 'evening'
                      ? 'border-sky-500 bg-sky-500/10 text-white'
                      : 'border-slate-805 bg-[#16161a] hover:bg-slate-900 text-slate-400'
                  }`}
                  id="btn-shift-evening"
                >
                  <Moon className="w-4 h-4 text-sky-400" />
                  <span>Evening Shift</span>
                </button>
              </div>
            </div>

            {/* Milk Weight (Quantity) */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-505 uppercase tracking-wider">
                Total Weight Quantity ({settings.weightUnit})
              </label>
              <div className="relative">
                <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="1000"
                  placeholder="e.g. 12.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#1f2229] bg-[#16161a] text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  id="input-entry-weight"
                />
              </div>
              {errors.weight && <p className="text-xs text-rose-400 mt-1">{errors.weight}</p>}
            </div>
          </div>

          {/* FAT and SNF block (hidden if flat rate method chosen) */}
          {settings.rateCalculationMethod !== 'flat' && (
            <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-3">
              {/* FAT */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-505 uppercase tracking-wider flex justify-between">
                  <span>FAT Percentage (%)</span>
                  {currentCustomer && (
                    <span className="text-[10px] text-slate-500 lowercase italic">
                      standard: {currentCustomer.milkType === 'cow' ? '3.5 - 4.5' : '6.5 - 8.0'}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-505" />
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="15.0"
                    placeholder="e.g. 4.2"
                    value={fat}
                    onChange={(e) => setFat(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#1f2229] bg-[#16161a] text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                    id="input-entry-fat"
                  />
                </div>
                {errors.fat && <p className="text-xs text-rose-400 mt-1">{errors.fat}</p>}
              </div>

              {/* SNF */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-505 uppercase tracking-wider flex justify-between">
                  <span>SNF Percentage (%)</span>
                  {currentCustomer && (
                    <span className="text-[10px] text-slate-500 lowercase italic">
                      standard: {currentCustomer.milkType === 'cow' ? '8.0 - 8.6' : '8.8 - 9.3'}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Compass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-505" />
                  <input
                    type="number"
                    step="0.1"
                    min="4.0"
                    max="15.0"
                    placeholder="e.g. 8.5"
                    value={snf}
                    onChange={(e) => setSNF(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#1f2229] bg-[#16161a] text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                    id="input-entry-snf"
                  />
                </div>
                {errors.snf && <p className="text-xs text-rose-400 mt-1">{errors.snf}</p>}
              </div>
            </div>
          )}

          {/* Dynamic Automatic Calculations Area */}
          <div className="bg-[#16161a] rounded-xl p-4 border border-slate-850 mt-2 space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 font-sans">
              <Calculator className="w-3.5 h-3.5 text-sky-400" />
              Live Calculations Output
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0e0e11] p-3 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-500 block font-semibold uppercase font-sans">Calculated Rate</span>
                <span className="text-lg font-bold font-mono text-slate-205 mt-1 block">
                  {settings.currency}
                  {liveRate.toFixed(2)}
                  <span className="text-xs font-sans font-normal text-slate-500"> / {settings.weightUnit}</span>
                </span>
                {settings.rateCalculationMethod !== 'flat' && typeof fat === 'number' && typeof snf === 'number' && (
                  <div className="space-y-1">
                    <span className="text-[9px] text-[#059669] block font-medium mt-1 font-mono">
                      TS Solids: {(fat + snf).toFixed(1)}%
                    </span>
                    {fat === 3.3 && snf === 7.6 && (
                      <span className="text-[10px] text-sky-400 font-bold block mt-1.5 font-mono">
                        🎯 Target Match: 3.3% FAT & 7.6% SNF = {settings.currency}32.00/L
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-sky-500/5 p-3 rounded-lg border border-sky-400/10">
                <span className="text-[10px] text-sky-400/80 block font-semibold uppercase font-sans">Total Due Amount</span>
                <span className="text-lg font-bold font-mono text-sky-400 mt-1 block">
                  {settings.currency}
                  {liveAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-slate-500 block font-medium mt-1 font-sans">
                  Qty: {weight || 0} {settings.weightUnit}
                </span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 border-t border-slate-850 pt-5 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 bg-slate-850 hover:bg-slate-800 transition-colors font-medium text-xs cursor-pointer"
              id="cancel-milk-form"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={activeCustomers.length === 0}
              className="px-5 py-2 rounded-xl text-slate-950 bg-sky-505 hover:bg-sky-400 shadow-sm transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              id="save-milk-form"
            >
              <Save className="w-4 h-4" />
              {editEntry ? 'Update Entry' : 'Log Delivery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
