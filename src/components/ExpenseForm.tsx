/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Customer, ExpenseEntry, PricingSettings } from '../types';
import { Save, X, Calendar, Sparkles, PenTool, ShoppingBag } from 'lucide-react';

interface ExpenseFormProps {
  customers: Customer[];
  settings: PricingSettings;
  onSaveExpense: (expense: ExpenseEntry) => void;
  onClose: () => void;
  editExpense?: ExpenseEntry | null;
}

const FEED_PRESETS = [
  { desc: 'Kapila Cattle Feed Bag (50 Kg)', amount: 1450 },
  { desc: 'Sudarshan Mustard Cake (30 Kg)', amount: 980 },
  { desc: 'Ankur Wheat Bran Bag (40 Kg)', amount: 1100 },
  { desc: 'Sudha Dairy Ration Feed Bag', amount: 1350 },
];

const MEDICINE_PRESETS = [
  { desc: 'Calf Calcium Tonic & De-wormer', amount: 480 },
  { desc: 'Mastitis Udder Ointment Cream', amount: 320 },
  { desc: 'Multivitamin Cattle Feed Supplement', amount: 650 },
];

const OTHER_PRESETS = [
  { desc: 'Metal Box Strainer Set', amount: 650 },
  { desc: 'Cattle Cleaning Soft Brush', amount: 180 },
  { desc: 'Animal Shed Disinfectant (5L)', amount: 750 },
];

export default function ExpenseForm({
  customers,
  settings,
  onSaveExpense,
  onClose,
  editExpense = null,
}: ExpenseFormProps) {
  const activeCustomers = customers.filter(c => c.status === 'active');

  const [selectedCustId, setSelectedCustId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<'feed' | 'medicine' | 'advance' | 'other'>('feed');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editExpense) {
      setSelectedCustId(editExpense.customerId);
      setDate(editExpense.date);
      setCategory(editExpense.category);
      setDescription(editExpense.description);
      setAmount(editExpense.amount);
    } else {
      if (activeCustomers.length > 0) {
        setSelectedCustId(activeCustomers[0].id);
      }
    }
    setErrors({});
  }, [editExpense, customers]);

  // Apply a preset description and suggested amount
  const handleApplyPreset = (desc: string, amt: number) => {
    setDescription(desc);
    setAmount(amt);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!selectedCustId) newErrors.customerId = 'Please select a customer';
    if (!date) newErrors.date = 'Date is required';
    if (!description.trim()) newErrors.description = 'Please describe the expense in brief';
    if (!amount || Number(amount) <= 0) newErrors.amount = 'Please enter an expense amount > 0';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: ExpenseEntry = {
      id: editExpense ? editExpense.id : `exp_${Date.now()}`,
      customerId: selectedCustId,
      date,
      category,
      description: description.trim(),
      amount: Number(amount),
    };

    onSaveExpense(payload);
  };

  return (
    <div className="fixed inset-0 bg-[#060608]/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div 
        className="bg-[#111114] rounded-2xl border border-slate-800 w-full max-w-lg overflow-hidden animate-fade-in shadow-2xl"
        id="expense-modal-dialog"
      >
        {/* Header */}
        <div className="bg-[#16161a] border-b border-slate-850 px-6 py-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg font-sans tracking-tight flex items-center gap-2 text-white">
            <ShoppingBag className="w-5 h-5 text-sky-400" />
            {editExpense ? '✏️ Edit Customer Expense / Advance' : '🌾 Log Cattle Feed & Customer Expense'}
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white hover:bg-slate-850 p-1.5 rounded-lg transition-colors cursor-pointer"
            id="close-expense-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-300 text-sm">
          {/* Main Select Rows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Target Customer Account
              </label>
              <select
                disabled={!!editExpense}
                value={selectedCustId}
                onChange={(e) => setSelectedCustId(e.target.value)}
                className={`w-full py-2.5 px-3 rounded-lg border border-[#1f2229] bg-[#16161a] text-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer ${
                  editExpense ? 'opacity-70 bg-slate-900 cursor-not-allowed' : ''
                }`}
                id="select-expense-customer"
              >
                {activeCustomers.length === 0 ? (
                  <option value="">No Active Customers Registered</option>
                ) : (
                  activeCustomers.map((cust) => (
                    <option key={cust.id} value={cust.id} className="bg-[#111114]">
                      {cust.name} ({cust.address.split(',')[0]})
                    </option>
                  ))
                )}
              </select>
              {errors.customerId && <p className="text-xs text-rose-450 mt-1">{errors.customerId}</p>}
            </div>

            {/* Date */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-505 uppercase tracking-wider">
                Date of purchase/loan
              </label>
              <div className="relative font-sans text-xs">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#1f2229] bg-[#16161a] text-white focus:outline-none focus:ring-1 focus:ring-[#1f2229]"
                  id="expense-date"
                />
              </div>
              {errors.date && <p className="text-xs text-rose-440 mt-1">{errors.date}</p>}
            </div>
          </div>

          {/* Expense Category Tabs */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Expense Category
            </label>
            <div className="grid grid-cols-4 gap-2 mt-1 font-sans">
              {[
                { id: 'feed', text: '🌾 Feed' },
                { id: 'medicine', text: '💊 Med' },
                { id: 'advance', text: '💵 Advance' },
                { id: 'other', text: '⚙️ Other' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setCategory(tab.id as any);
                    setDescription('');
                  }}
                  className={`py-2 px-1.5 rounded-lg border text-center transition-all cursor-pointer font-bold text-[11px] ${
                    category === tab.id
                      ? 'border-sky-500 bg-sky-500/10 text-white animate-fade-in'
                      : 'border-slate-805 bg-[#16161a] hover:bg-slate-900 text-slate-400'
                  }`}
                  id={`btn-exp-cat-${tab.id}`}
                >
                  {tab.text}
                </button>
              ))}
            </div>
          </div>

          {/* Preset Buttons area to speed up user work */}
          <div className="bg-[#16161a] p-3 rounded-lg border border-slate-850 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1 font-sans">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              Suggested fast presets for {category === 'feed' ? 'Cattle Feed' : category === 'medicine' ? 'Medicine' : category === 'advance' ? 'Advance Payments' : 'Other items'}
            </span>
            <div className="flex flex-wrap gap-1.5 font-sans">
              {category === 'feed' && FEED_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p.desc, p.amount)}
                  className="px-2.5 py-1 text-[11px] bg-[#0e0e11] border border-slate-800 hover:border-sky-500 hover:bg-sky-500/10 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {p.desc.split(' ')[0]} {p.desc.includes('50') ? '(50kg)' : p.desc.includes('Cake') ? '(Oil Cake)' : ''} - {settings.currency}{p.amount}
                </button>
              ))}
              {category === 'medicine' && MEDICINE_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p.desc, p.amount)}
                  className="px-2.5 py-1 text-[11px] bg-[#0e0e11] border border-slate-800 hover:border-sky-500 hover:bg-sky-500/10 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {p.desc.split(' ')[0]} Tonic - {settings.currency}{p.amount}
                </button>
              ))}
              {category === 'other' && OTHER_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p.desc, p.amount)}
                  className="px-2.5 py-1 text-[11px] bg-[#0e0e11] border border-slate-800 hover:border-sky-500 hover:bg-sky-500/10 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {p.desc.split(' ')[0]} Set - {settings.currency}{p.amount}
                </button>
              ))}
              {category === 'advance' && [1000, 2000, 5000].map((val, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(`Advance Cash Given to Farmer`, val)}
                  className="px-2.5 py-1 text-[11px] bg-[#0e0e11] border border-slate-800 hover:border-sky-500 hover:bg-sky-500/10 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Give {settings.currency}{val.toLocaleString()} Advance
                </button>
              ))}
            </div>
          </div>

          {/* Description Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Expense Item Description / Note
            </label>
            <div className="relative font-mono">
              <PenTool className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-505" />
              <input
                type="text"
                placeholder="e.g. Kapila Pashu Aahar Feed Bag"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#1f2229] bg-[#16161a] text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-sans"
                id="input-expense-desc"
              />
            </div>
            {errors.description && <p className="text-xs text-rose-450 mt-1">{errors.description}</p>}
          </div>

          {/* Amount Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-505 uppercase tracking-wider">
              Expense Cost Amount ({settings.currency})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-500">
                {settings.currency}
              </span>
              <input
                type="number"
                min="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-[#1f2229] bg-[#16161a] text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                id="input-expense-amount"
              />
            </div>
            {errors.amount && <p className="text-xs text-rose-450 mt-1">{errors.amount}</p>}
          </div>

          {/* Action Row */}
          <div className="flex justify-end gap-3 border-t border-slate-850 pt-5 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 bg-slate-850 hover:bg-slate-800 transition-colors font-medium text-xs cursor-pointer"
              id="cancel-expense-form"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={activeCustomers.length === 0}
              className="px-5 py-2 rounded-xl text-slate-950 bg-sky-500 hover:bg-sky-400 shadow-sm transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              id="save-expense-form"
            >
              <Save className="w-4 h-4" />
              {editExpense ? 'Update Expense' : 'Log Ledger Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
