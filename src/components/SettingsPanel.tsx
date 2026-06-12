/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PricingSettings } from '../types';
import { Settings, Save, Download, Upload, RotateCcw, HardDrive, Trash2 } from 'lucide-react';

interface SettingsPanelProps {
  settings: PricingSettings;
  onSaveSettings: (settings: PricingSettings) => void;
  onResetDatabase: () => void;
  onPurgeAllData: () => void;
  onImportDatabase: (dataString: string) => boolean;
  onExportDatabase: () => void;
}

export default function SettingsPanel({
  settings,
  onSaveSettings,
  onResetDatabase,
  onPurgeAllData,
  onImportDatabase,
  onExportDatabase,
}: SettingsPanelProps) {
  const [method, setMethod] = useState(settings.rateCalculationMethod);
  const [fatFactor, setFatFactor] = useState(settings.fatFactor);
  const [snfFactor, setSnfFactor] = useState(settings.snfFactor);
  const [flatCow, setFlatCow] = useState(settings.flatRateCow);
  const [flatBuffalo, setFlatBuffalo] = useState(settings.flatRateBuffalo);
  const [flatMix, setFlatMix] = useState(settings.flatRateMix);
  const [tsRate, setTsRate] = useState(settings.tsRate);
  const [currency, setCurrency] = useState(settings.currency);
  const [unit, setUnit] = useState(settings.weightUnit);

  const [message, setMessage] = useState('');
  const [importError, setImportError] = useState('');

  // Interactive Calibrator assistant states
  const [calTargetFat, setCalTargetFat] = useState(3.3);
  const [calTargetSnf, setCalTargetSnf] = useState(7.6);
  const [calTargetPrice, setCalTargetPrice] = useState(32);
  const [calibrationSuccessMsg, setCalibrationSuccessMsg] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: PricingSettings = {
      rateCalculationMethod: method,
      fatFactor: Number(fatFactor),
      snfFactor: Number(snfFactor),
      flatRateCow: Number(flatCow),
      flatRateBuffalo: Number(flatBuffalo),
      flatRateMix: Number(flatMix),
      tsRate: Number(tsRate),
      currency,
      weightUnit: unit,
    };
    onSaveSettings(updated);
    setMessage('✅ Settings updated successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const success = onImportDatabase(content);
      if (success) {
        setMessage('🎉 Database restored successfully from backup!');
        setImportError('');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setImportError('❌ Invalid file. Please upload a valid Prem Dairy backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-[#111114] rounded-2xl border border-slate-800 p-6 space-y-6" id="settings-panel">
      {/* Settings Header */}
      <div className="flex justify-between items-start border-b border-slate-850 pb-5">
        <div>
          <h2 className="text-xl font-bold font-sans text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" />
            Pricing Settings & Backup Engine
          </h2>
          <p className="text-xs text-slate-505 font-sans mt-0.5">
            Configure fat calculation multipliers, default volume units, and secure backup operations
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="settings-grid">
        
        {/* Dual columns for settings form */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6 text-slate-300 text-xs">
          
          {/* Rate calculation strategy */}
          <div className="bg-[#16161a] p-4 rounded-xl border border-slate-855 space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              🔧 Milk Rate pricing Method
            </span>
            <p className="text-[11px] text-slate-500">
              Select how you pay or bill suppliers. In India, most dairy societies use the Fat & SNF sliding factor system.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Option A: Fat SNF */}
              <label 
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  method === 'fat_snf'
                    ? 'border-sky-500 bg-sky-500/10 text-white'
                    : 'border-slate-800 bg-[#0e0e11] hover:bg-slate-900 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  <input
                    type="radio"
                    name="calc_method"
                    value="fat_snf"
                    checked={method === 'fat_snf'}
                    onChange={() => setMethod('fat_snf')}
                    className="accent-sky-450"
                  />
                  <span>Fat & SNF Multiplier</span>
                </div>
                <span className="text-[10px] text-slate-500 pl-5 font-sans">
                  Rate = (FAT * Fat_Factor) + (SNF * SNF_Factor)
                </span>
              </label>

              {/* Option B: TS Solids */}
              <label 
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  method === 'ts_solids'
                    ? 'border-sky-500 bg-sky-500/10 text-white'
                    : 'border-slate-800 bg-[#0e0e11] hover:bg-slate-900 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  <input
                    type="radio"
                    name="calc_method"
                    value="ts_solids"
                    checked={method === 'ts_solids'}
                    onChange={() => setMethod('ts_solids')}
                    className="accent-sky-450"
                  />
                  <span>Total Solids (TS)</span>
                </div>
                <span className="text-[10px] text-slate-500 pl-5 font-sans">
                  Rate = ((FAT + SNF) * TS_Rate) / 10
                </span>
              </label>

              {/* Option C: Flat Rates */}
              <label 
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  method === 'flat'
                    ? 'border-sky-500 bg-sky-500/10 text-white'
                    : 'border-slate-800 bg-[#0e0e11] hover:bg-slate-900 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  <input
                    type="radio"
                    name="calc_method"
                    value="flat"
                    checked={method === 'flat'}
                    onChange={() => setMethod('flat')}
                    className="accent-sky-450"
                  />
                  <span>Breed Flat Rates</span>
                </div>
                <span className="text-[10px] text-slate-505 pl-5 font-sans">
                  Flat index rate per Liter based on animal type chosen.
                </span>
              </label>
            </div>
          </div>

          {/* Pricing parameters variables */}
          <div className="space-y-4">
            <span className="text-xs font-bold text-slate-505 uppercase tracking-widest block">
              Pricing Multipliers Parameters
            </span>

            {/* If FAT/SNF Method chosen */}
            {method === 'fat_snf' && (
              <div className="space-y-4 animate-fade-in text-slate-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 bg-[#16161a] p-4 rounded-xl border border-slate-850">
                    <label className="block font-semibold text-slate-350">
                      FAT Factor Price (per 1% point)
                    </label>
                    <p className="text-[10px] text-slate-500 mb-1.5">Usually around ₹5.0 to ₹8.5 INR</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">{currency}</span>
                      <input
                        type="number"
                        step="0.01"
                        value={fatFactor}
                        onChange={(e) => setFatFactor(Number(Number(e.target.value).toFixed(4)))}
                        className="w-full bg-[#0e0e11] text-white border border-slate-800 focus:border-sky-500 rounded-lg focus:outline-none font-mono pl-7 pr-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 bg-[#16161a] p-4 rounded-xl border border-slate-850">
                    <label className="block font-semibold text-slate-350">
                      SNF Factor Price (per 1% point)
                    </label>
                    <p className="text-[10px] text-slate-500 mb-1.5">Usually around ₹2.0 to ₹4.5 INR</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">{currency}</span>
                      <input
                        type="number"
                        step="0.0001"
                        value={snfFactor}
                        onChange={(e) => setSnfFactor(Number(Number(e.target.value).toFixed(4)))}
                        className="w-full bg-[#0e0e11] text-white border border-slate-800 focus:border-sky-500 rounded-lg focus:outline-none font-mono pl-7 pr-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* --- 🎯 INTERACTIVE EQUATION CALIBRATOR WIDGET --- */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-2 rounded text-[9px] bg-sky-500/10 text-sky-400 font-bold uppercase tracking-wider font-mono">
                      Assistant Tool
                    </span>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      🎯 Smart Equation Calibrator
                    </h4>
                  </div>
                  
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    Set a benchmark target (e.g. <strong>3.3% FAT and 7.6% SNF equals expected ₹32.00 per Litre</strong>). The assistant will automatically generate calibrated fat and snf pricing multipliers for you.
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-505 font-bold uppercase">Target FAT (%)</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={calTargetFat}
                        onChange={(e) => setCalTargetFat(Math.max(0.1, Number(e.target.value)))}
                        className="w-full bg-[#16161a] border border-slate-800 text-white font-mono text-center text-xs p-1.5 rounded-lg focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-505 font-bold uppercase">Target SNF (%)</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={calTargetSnf}
                        onChange={(e) => setCalTargetSnf(Math.max(0.1, Number(e.target.value)))}
                        className="w-full bg-[#16161a] border border-slate-800 text-white font-mono text-center text-xs p-1.5 rounded-lg focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-505 font-bold uppercase">Target Price ({currency})</label>
                      <input 
                        type="number"
                        step="0.5"
                        value={calTargetPrice}
                        onChange={(e) => setCalTargetPrice(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-[#16161a] border border-slate-800 text-white font-mono text-center text-xs p-1.5 rounded-lg focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                      Choose Your Calibration Formula:
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      
                      {/* Option 1: Balanced Indian Coop ratio */}
                      <button
                        type="button"
                        onClick={() => {
                          const suggestedFat = Number(((calTargetPrice * 0.5156) / calTargetFat).toFixed(4));
                          const suggestedSnf = Number(((calTargetPrice * 0.4844) / calTargetSnf).toFixed(4));
                          setFatFactor(suggestedFat);
                          setSnfFactor(suggestedSnf);
                          setCalibrationSuccessMsg(`🎯 Applied Balanced Calibration: FAT Factor = ${suggestedFat}, SNF Factor = ${suggestedSnf}`);
                          setTimeout(() => setCalibrationSuccessMsg(''), 4000);
                        }}
                        className="bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-lg p-3 text-left cursor-pointer transition-all space-y-1 text-slate-300"
                      >
                        <div className="font-bold text-sky-400 text-[11px] flex justify-between">
                          <span>⚖️ Balanced Ratio</span>
                          <span className="text-[9px] text-[#059669] bg-emerald-500/10 px-1 rounded">Ideal</span>
                        </div>
                        <p className="text-[9.5px] text-slate-500 leading-tight">
                          Split price: 51.5% FAT / 48.5% SNF.
                        </p>
                        <div className="pt-1 text-[10px] font-mono text-slate-350 leading-tight">
                          FAT F: <strong className="text-white">{((calTargetPrice * 0.5156) / calTargetFat).toFixed(3)}</strong>
                          <br />
                          SNF F: <strong className="text-white">{((calTargetPrice * 0.4844) / calTargetSnf).toFixed(4)}</strong>
                        </div>
                      </button>

                      {/* Option 2: Keep FAT constant, adapt SNF */}
                      <button
                        type="button"
                        disabled={fatFactor <= 0 || (calTargetPrice - (calTargetFat * fatFactor)) < 0}
                        onClick={() => {
                          const calculatedSnf = Number(((calTargetPrice - (calTargetFat * fatFactor)) / calTargetSnf).toFixed(4));
                          if (calculatedSnf >= 0) {
                            setSnfFactor(calculatedSnf);
                            setCalibrationSuccessMsg(`🎯 Updated SNF Factor to ${calculatedSnf} while maintaining FAT Factor of ${fatFactor}`);
                            setTimeout(() => setCalibrationSuccessMsg(''), 4000);
                          }
                        }}
                        className={`border rounded-lg p-3 text-left transition-all space-y-1 text-slate-350 ${
                          fatFactor > 0 && (calTargetPrice - (calTargetFat * fatFactor)) >= 0
                            ? 'bg-slate-950 hover:bg-slate-900 border-slate-850 hover:border-slate-800 cursor-pointer'
                            : 'bg-slate-950/20 border-slate-900/50 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <div className="font-bold text-sky-450 text-[11px]">🥛 Fix FAT, Adjust SNF</div>
                        <p className="text-[9.5px] text-slate-505 leading-tight">
                          Keeps FAT size of {fatFactor} constant.
                        </p>
                        <div className="pt-1 text-[10px] font-mono leading-tight">
                          FAT F: <strong className="text-white">{fatFactor}</strong>
                          <br />
                          SNF F: <strong className="text-white">
                            {fatFactor > 0 && (calTargetPrice - (calTargetFat * fatFactor)) >= 0
                              ? ((calTargetPrice - (calTargetFat * fatFactor)) / calTargetSnf).toFixed(4)
                              : 'Invalid'
                            }
                          </strong>
                        </div>
                      </button>

                      {/* Option 3: Keep SNF constant, adapt FAT */}
                      <button
                        type="button"
                        disabled={snfFactor <= 0 || (calTargetPrice - (calTargetSnf * snfFactor)) < 0}
                        onClick={() => {
                          const calculatedFat = Number(((calTargetPrice - (calTargetSnf * snfFactor)) / calTargetFat).toFixed(4));
                          if (calculatedFat >= 0) {
                            setFatFactor(calculatedFat);
                            setCalibrationSuccessMsg(`🎯 Updated FAT Factor to ${calculatedFat} while maintaining SNF Factor of ${snfFactor}`);
                            setTimeout(() => setCalibrationSuccessMsg(''), 4000);
                          }
                        }}
                        className={`border rounded-lg p-3 text-left transition-all space-y-1 text-slate-350 ${
                          snfFactor > 0 && (calTargetPrice - (calTargetSnf * snfFactor)) >= 0
                            ? 'bg-slate-950 hover:bg-slate-900 border-slate-850 hover:border-slate-800 cursor-pointer'
                            : 'bg-slate-950/20 border-slate-900/50 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <div className="font-bold text-sky-450 text-[11px]">🌾 Fix SNF, Adjust FAT</div>
                        <p className="text-[9.5px] text-slate-550 leading-tight">
                          Keeps SNF size of {snfFactor} constant.
                        </p>
                        <div className="pt-1 text-[10px] font-mono leading-tight">
                          FAT F: <strong className="text-white">
                            {snfFactor > 0 && (calTargetPrice - (calTargetSnf * snfFactor)) >= 0
                              ? ((calTargetPrice - (calTargetSnf * snfFactor)) / calTargetFat).toFixed(3)
                              : 'Invalid'
                            }
                          </strong>
                          <br />
                          SNF F: <strong className="text-white">{snfFactor}</strong>
                        </div>
                      </button>

                    </div>

                    {calibrationSuccessMsg && (
                      <div className="bg-emerald-950/10 border border-emerald-900/30 text-emerald-400 text-[11px] p-2.5 rounded-lg font-medium text-center animate-pulse font-sans">
                        {calibrationSuccessMsg}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 bg-slate-950/30 p-2 rounded-lg border border-slate-900 text-center flex flex-wrap justify-around gap-2 font-mono">
                      <span>Formula: Rate = (FAT * FAT_F) + (SNF * SNF_F)</span>
                      <span>Benchmark: {calTargetFat}% FAT / {calTargetSnf}% SNF = {currency}{calTargetPrice.toFixed(2)}</span>
                    </div>

                  </div>

                </div>
              </div>
            )}

            {/* If TS Solids chosen */}
            {method === 'ts_solids' && (
              <div className="bg-[#16161a] p-4 rounded-xl border border-slate-850 space-y-1 animate-fade-in max-w-sm">
                <label className="block font-semibold text-slate-300">
                  TS Solids Price (per KG Solids)
                </label>
                <p className="text-[10px] text-slate-505 mb-1.5">Standard coop rate in India (e.g., ₹300 - ₹380)</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">{currency}</span>
                  <input
                    type="number"
                    step="10"
                    value={tsRate}
                    onChange={(e) => setTsRate(Number(e.target.value))}
                    className="w-full bg-[#0e0e11] text-white border border-slate-800 focus:border-sky-500 rounded-lg focus:outline-none font-mono pl-7 pr-3 py-2"
                  />
                </div>
              </div>
            )}

            {/* If Flat Rates chosen */}
            {method === 'flat' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
                <div className="space-y-1 bg-[#16161a] p-4 rounded-xl border border-slate-850">
                  <label className="block font-semibold text-slate-300">Cow Breed Flat / L</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">{currency}</span>
                    <input
                      type="number"
                      value={flatCow}
                      onChange={(e) => setFlatCow(Number(e.target.value))}
                      className="w-full bg-[#0e0e11] text-white border border-slate-800 focus:border-sky-500 rounded-lg focus:outline-none font-mono pl-7 pr-3 py-2"
                    />
                  </div>
                </div>

                <div className="space-y-1 bg-[#16161a] p-4 rounded-xl border border-slate-850">
                  <label className="block font-semibold text-slate-300">Baff Breed Flat / L</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">{currency}</span>
                    <input
                      type="number"
                      value={flatBuffalo}
                      onChange={(e) => setFlatBuffalo(Number(e.target.value))}
                      className="w-full bg-[#0e0e11] text-white border border-slate-800 focus:border-sky-500 rounded-lg focus:outline-none font-mono pl-7 pr-3 py-2"
                    />
                  </div>
                </div>

                <div className="space-y-1 bg-[#16161a] p-4 rounded-xl border border-slate-850">
                  <label className="block font-semibold text-slate-300">Mixed Breed Flat / L</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">{currency}</span>
                    <input
                      type="number"
                      value={flatMix}
                      onChange={(e) => setFlatMix(Number(e.target.value))}
                      className="w-full bg-[#0e0e11] text-white border border-slate-800 focus:border-sky-500 rounded-lg focus:outline-none font-mono pl-7 pr-3 py-2"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Regional Settings (Currency & Units) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-850 pt-5 text-slate-300">
            {/* Currency Symbol */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Display Currency Symbol
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full py-2 px-3 bg-[#16161a] border border-slate-800 text-slate-200 rounded-lg text-xs font-medium cursor-pointer focus:border-sky-500 focus:outline-none"
              >
                <option value="₹">Rupee (₹)</option>
                <option value="$">Dollar ($)</option>
                <option value="£">Pound (£)</option>
                <option value="€">Euro (€)</option>
              </select>
            </div>

            {/* Default Volume Unit */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-505 uppercase tracking-wider">
                Default Weight Volume Unit
              </label>
              <div className="flex gap-4 bg-[#16161a] border border-slate-800 rounded-lg p-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-300 hover:text-white transition-colors">
                  <input
                    type="radio"
                    name="unit"
                    value="L"
                    checked={unit === 'L'}
                    onChange={() => setUnit('L')}
                    className="accent-sky-450"
                  />
                  <span>Litre (L)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-300 hover:text-white transition-colors">
                  <input
                    type="radio"
                    name="unit"
                    value="kg"
                    checked={unit === 'kg'}
                    onChange={() => setUnit('kg')}
                    className="accent-sky-455"
                  />
                  <span>Kilogram (Kg)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Save trigger message row */}
          <div className="flex items-center justify-between border-t border-slate-850 pt-5 font-sans">
            <span className="text-slate-500 italic text-[11px]">
              * Calculations verify instantly upon saving configuration.
            </span>
            <div className="flex items-center gap-3">
              {message && <span className="text-emerald-420 font-bold text-[11px]">{message}</span>}
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-slate-950 bg-sky-500 hover:bg-sky-400 shadow-sm transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                id="btn-save-settings"
              >
                <Save className="w-4 h-4" />
                Save Formula Setup
              </button>
            </div>
          </div>

        </form>

        {/* Dynamic DB back-up utilities panel block (1 col on desktop) */}
        <div className="bg-[#16161a] rounded-xl border border-slate-850 p-5 gap-3 flex flex-col justify-between text-slate-350">
          <div className="space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-sky-400" />
              Secure Ledger Backup
            </span>
            <p className="text-[11px] text-slate-455 leading-relaxed font-sans">
              Because Prem Dairy operates locally on your web browser cache, we recommend downloading a JSON file copy regularly to safeguard entries against telephone resets / cleanups.
            </p>

            <div className="border-t border-slate-855 pt-3 space-y-2 text-xs">
              {/* Back up download */}
              <button
                onClick={onExportDatabase}
                className="w-full px-3 py-2.5 bg-[#0e0e11] hover:bg-slate-900 text-slate-200 font-semibold border border-slate-800 hover:border-sky-500 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer text-sans"
                id="btn-export-backup"
              >
                <Download className="w-4 h-4 text-sky-400" />
                Export Ledger (Backup.json)
              </button>

              {/* Restore upload */}
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="btn-upload-file-trigger"
                />
                <label
                  htmlFor="btn-upload-file-trigger"
                  className="w-full px-3 py-2.5 bg-[#0e0e11] hover:bg-slate-900 text-slate-200 font-semibold border border-slate-800 hover:border-sky-500 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer text-center text-sans"
                >
                  <Upload className="w-4 h-4 text-sky-400" />
                  Restore Ledger (JSON File)
                </label>
              </div>
              {importError && <p className="text-[10px] text-rose-450 font-medium font-sans mt-1 text-center">{importError}</p>}
            </div>
          </div>

          {/* Reset database */}
          <div className="border-t border-slate-855 pt-4 mt-6 space-y-3">
            <span className="text-[10px] text-rose-450 font-bold block uppercase tracking-wider">🚨 Database Purge & Hard Reset</span>
            
            <div className="space-y-2">
              {/* Wipe All Data - Start Fresh */}
              <button
                onClick={() => {
                  if (window.confirm('⚠️ CRITICAL WARNING: This will permanently DELETE ALL CUSTOMERS, ALL MILK ENTRIES, and ALL EXPENSES! You will have a completely empty list to register your own customers. This cannot be undone! Are you absolutely sure?')) {
                    onPurgeAllData();
                    setMessage('🗑️ Database completely wiped! All data deleted successfully.');
                    setTimeout(() => setMessage(''), 4000);
                  }
                }}
                className="w-full px-3 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer text-sans text-xs shadow-md"
                id="btn-wipe-data-fresh"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Wipe All Data & Start Fresh (Delete Everything)
              </button>
              <p className="text-[10px] text-slate-500 leading-normal font-sans px-1">
                Removes all data entirely so you can build your own fresh customer list from scratch.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-900/60 space-y-2">
              <button
                onClick={() => {
                  if (window.confirm('⚠️ ATTENTION: Are you absolutely sure you want to restore back to Prem Dairy demo state? This replaces active data with the initial pre-seeded sample profiles and mock records.')) {
                    onResetDatabase();
                    setMessage('🔄 Database successfully restored to demo defaults!');
                    setTimeout(() => setMessage(''), 4000);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 font-semibold border border-slate-850 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer text-sans text-xs"
                id="btn-factory-reset"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-450" />
                Reset back to Demo Default
              </button>
              <p className="text-[10px] text-slate-500 leading-normal font-sans px-1">
                Fills the workspace with sample customers and 30 days of draft milk slips for testing purposes.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
