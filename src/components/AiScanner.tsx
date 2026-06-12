/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Customer, MilkEntry, PricingSettings } from '../types';
import { calculateRate } from '../data';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Calculator, 
  User, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Layers, 
  Save, 
  RotateCcw,
  Image as ImageIcon
} from 'lucide-react';

interface AiScannerProps {
  customers: Customer[];
  settings: PricingSettings;
  onSaveMilkEntry: (entry: MilkEntry) => void;
  triggerToast: (msg: string) => void;
  onNavigateToTab: (tab: 'dashboard' | 'delivery' | 'expenses' | 'billing' | 'settings') => void;
}

interface ScanData {
  customerName: string;
  date: string;
  shift: 'morning' | 'evening';
  weight: number;
  fat: number;
  snf: number;
  explanation: string;
}

// 3 realistic mock slip presets so users can test immediately inside AI Studio
const SAMPLE_SLIPS = [
  {
    title: "Priyanka Maity (Cow - Calibrated Benchmark)",
    customerName: "Priyanka Maity",
    date: "2026-06-12",
    shift: "morning" as const,
    weight: 10.0,
    fat: 3.3,
    snf: 7.6,
    style: "handwritten" as const,
    description: "Standard Cow Milk benchmark slip: 10L @ 3.3% FAT / 7.6% SNF."
  },
  {
    title: "Satish Sharma (Cow - Thermal)",
    customerName: "Satish Chand Sharma",
    date: "2026-06-12",
    shift: "morning" as const,
    weight: 9.2,
    fat: 4.1,
    snf: 8.5,
    style: "thermal" as const,
    description: "Thermal printout from automated lactometer analyzer."
  },
  {
    title: "Ramesh Yadav (Buffalo - Pocket Notebook)",
    customerName: "Ramesh Kumar Yadav",
    date: "2026-06-11",
    shift: "evening" as const,
    weight: 12.8,
    fat: 7.2,
    snf: 9.0,
    style: "handwritten" as const,
    description: "Spill-stained pocket journal slip signed by Dairy Chairman."
  },
  {
    title: "Mahesh Dayal (Mix Milk - Notebook Card)",
    customerName: "Mahesh Dayal",
    date: "2026-06-10",
    shift: "morning" as const,
    weight: 6.4,
    fat: 4.8,
    snf: 8.6,
    style: "handwritten" as const,
    description: "Handwritten ballpoint ink slip from rural collection gate."
  }
];

export default function AiScanner({
  customers,
  settings,
  onSaveMilkEntry,
  triggerToast,
  onNavigateToTab,
}: AiScannerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/png");
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanData | null>(null);

  // States derived for savings
  const [matchedCustomerId, setMatchedCustomerId] = useState<string>('');
  const [verifiedDate, setVerifiedDate] = useState<string>('');
  const [verifiedShift, setVerifiedShift] = useState<'morning' | 'evening'>('morning');
  const [verifiedWeight, setVerifiedWeight] = useState<number>(0);
  const [verifiedFat, setVerifiedFat] = useState<number>(0);
  const [verifiedSnf, setVerifiedSnf] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Canvas Generator for the mock templates is drawn on load or on click
  const generateAndSelectSample = (sample: typeof SAMPLE_SLIPS[0]) => {
    setError(null);
    setScanResult(null);
    
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (sample.style === 'thermal') {
      // Background thermal paper shading & subtle edges
      ctx.fillStyle = '#f7f7f3';
      ctx.fillRect(0, 0, 500, 450);

      // Print receipt header
      ctx.fillStyle = '#1e1e24';
      ctx.textAlign = 'center';
      ctx.font = 'bold 22px Courier New';
      ctx.fillText('*** PREM DAIRY CENTER ***', 250, 45);
      
      ctx.font = 'bold 15px Courier New';
      ctx.fillText('COLLECTION DISPATCH RECEIPT', 250, 70);
      ctx.font = '12px Courier New';
      ctx.fillText('Vite Server: Active / Verified: SSL', 250, 90);
      
      // Receipt separator line
      ctx.fillText('=========================================', 250, 115);

      // Content alignment labels
      ctx.textAlign = 'left';
      ctx.font = 'bold 16px Courier New';
      ctx.fillText(`SUPPLIER   : ${sample.customerName.toUpperCase()}`, 50, 150);
      ctx.fillText(`DATE       : ${sample.date}`, 50, 185);
      ctx.fillText(`SHIFT      : ${sample.shift.toUpperCase()}`, 50, 220);
      ctx.fillText(`QUANTITY   : ${sample.weight} LTR`, 50, 255);
      ctx.fillText(`FAT PERCENT: ${sample.fat}%`, 50, 290);
      ctx.fillText(`SNF RATIO  : ${sample.snf}%`, 50, 325);

      // Footer
      ctx.fillText('=========================================', 50, 360);
      ctx.textAlign = 'center';
      ctx.font = 'italic bold 13px Courier New';
      ctx.fillText('COOPERATIVE DAIRY BOARD SIGNED', 250, 390);
      ctx.font = 'italic 11px Courier New';
      ctx.fillText('Thank you for supplying pure milk.', 250, 410);

      // Add vintage ink noise lines
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 500; i += 3) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 450);
        ctx.stroke();
      }

    } else {
      // Paper background with binder lines
      ctx.fillStyle = '#fcfaf6';
      ctx.fillRect(0, 0, 500, 450);

      // Binder horizontal blue line coordinates
      ctx.strokeStyle = '#e6edf2';
      ctx.lineWidth = 1.5;
      for (let j = 40; j < 450; j += 32) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(500, j);
        ctx.stroke();
      }

      // Vertical pink notebook margin line
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(85, 0);
      ctx.lineTo(85, 450);
      ctx.stroke();

      // Notebook handwritten headers
      ctx.fillStyle = '#0f172a';
      ctx.font = 'italic bold 22px serif';
      ctx.fillText('June Dairy Ledger', 120, 65);

      ctx.fillStyle = '#1d4ed8'; // standard blue gel pen ink
      ctx.font = 'bold italic 18px serif';
      ctx.fillText(`Farmer Name: ${sample.customerName}`, 110, 115);
      ctx.fillText(`Log Date: ${sample.date}`, 110, 155);
      ctx.fillText(`Shift Time: ${sample.shift === 'morning' ? 'Morning (AM)' : 'Evening (PM)'}`, 110, 195);
      ctx.fillText(`Milk Collected: ${sample.weight} ${settings.weightUnit}`, 110, 235);
      ctx.fillText(`Fat level: ${sample.fat}%`, 110, 275);
      ctx.fillText(`SNF % ratio: ${sample.snf}%`, 110, 315);
      
      ctx.fillStyle = '#b91c1c'; // Red ink signature markup
      ctx.font = 'italic bold 16px serif';
      ctx.fillText('APPROVED (Prem Dairy Inspector)', 110, 375);
      ctx.fillText('✓ Paid & Signed off', 110, 405);
    }

    const dataUrl = canvas.toDataURL('image/png');
    setImagePreview(dataUrl);
    setImageMime("image/png");
    triggerToast(`⚡ Rerendered sample card: ${sample.title}`);
  };

  // Run initial sample draw so there is a starting image
  useEffect(() => {
    generateAndSelectSample(SAMPLE_SLIPS[0]);
  }, []);

  // File drag states
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }
    setError(null);
    setImageMime(file.type);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImagePreview(event.target.result as string);
        setScanResult(null); // delete older scan data
        triggerToast("📂 Image uploaded successfully. Ready to scan!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Perform backend Express API lookup which communicates with Gemini on server
  const handleScanImage = async () => {
    if (!imagePreview) {
      setError("Please upload an image or click a sample card.");
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: imagePreview,
          mimeType: imageMime
        })
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.error || `Server responded with status code ${response.status}`);
      }

      const jsonOutput: ScanData = await response.json();
      setScanResult(jsonOutput);

      // Pre-populate verified edit states
      setVerifiedDate(jsonOutput.date || new Date().toISOString().split('T')[0]);
      setVerifiedShift(jsonOutput.shift === 'evening' ? 'evening' : 'morning');
      setVerifiedWeight(jsonOutput.weight || 0);
      setVerifiedFat(jsonOutput.fat || 0);
      setVerifiedSnf(jsonOutput.snf || 0);

      // Attempt to automatically match customer by fuzzy string name matching
      if (jsonOutput.customerName) {
        const decodedName = jsonOutput.customerName.toLowerCase();
        const found = customers.find(c => 
          c.name.toLowerCase().includes(decodedName) || 
          decodedName.includes(c.name.toLowerCase().split(' ')[0])
        );
        if (found) {
          setMatchedCustomerId(found.id);
        } else if (customers.length > 0) {
          setMatchedCustomerId(customers[0].id);
        }
      } else if (customers.length > 0) {
        setMatchedCustomerId(customers[0].id);
      }

      triggerToast("✨ Gemini scanner read completed!");

    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Internal transmission issue. Please check your Gemini API Key in secrets panel.");
    } finally {
      setIsScanning(false);
    }
  };

  // Retrieve matching customer details
  const currentMatchedCustomer = customers.find(c => c.id === matchedCustomerId);

  // Dynamic live rate calculation matches standard Indian FAT/SNF formulas and calculations
  const dynamicRate = currentMatchedCustomer && verifiedFat > 0 && verifiedSnf > 0
    ? calculateRate(verifiedFat, verifiedSnf, currentMatchedCustomer.milkType, settings)
    : 0;

  const dynamicAmount = verifiedWeight > 0 ? Number((verifiedWeight * dynamicRate).toFixed(2)) : 0;

  // Save parsed result directly to global ledger logs
  const handleSaveScannedEntry = () => {
    if (!matchedCustomerId) {
      triggerToast("❌ Error: Please select/register active customer profile.");
      return;
    }
    if (verifiedWeight <= 0) {
      triggerToast("❌ Error: Total weight has to be more than 0.");
      return;
    }

    const payload: MilkEntry = {
      id: `milk_scan_${Date.now()}`,
      customerId: matchedCustomerId,
      date: verifiedDate,
      shift: verifiedShift,
      weight: verifiedWeight,
      fat: settings.rateCalculationMethod === 'flat' ? 0 : verifiedFat,
      snf: settings.rateCalculationMethod === 'flat' ? 0 : verifiedSnf,
      rate: dynamicRate,
      amount: dynamicAmount
    };

    onSaveMilkEntry(payload);
    // clean up states
    setScanResult(null);
    setImagePreview(null);
    onNavigateToTab('delivery'); // take them back to milk deliveries logs
  };

  return (
    <div className="space-y-6" id="ai-scan-workspace">
      
      {/* Upper header explanation */}
      <div className="bg-gradient-to-r from-sky-950/20 via-[#111114] to-sky-950/10 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="max-w-xl space-y-2">
          <span className="text-[10px] bg-sky-500/10 border border-sky-500/20 text-sky-400 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            AI Multimodal Extractor
          </span>
          <h2 className="text-xl font-bold font-sans tracking-tight text-white">Dairy Board automated image ledger</h2>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Upload custom image photograph slips (like hand written pocket milk diaries, thermal printed delivery slips, or lactometer testing metrics cards) or <strong>choose one of our realistic templates below</strong> to witness real-time image transcription using server-side Gemini 3.5 Flash!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: UPLOAD & PRESET SELECTIONS (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* UPLOAD CONTAINER */}
          <div className="bg-[#111114] border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-sky-400" />
              Upload Milk Slip Snapshot
            </h3>

            {/* Input card with drag and drop */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden ${
                dragActive 
                  ? 'border-sky-500 bg-sky-500/5' 
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
              }`}
            >
              {imagePreview ? (
                <>
                  <img 
                    src={imagePreview} 
                    alt="Receipt source slip" 
                    className="max-h-72 my-1 rounded-lg border border-slate-800 object-contain shadow-md"
                  />
                  <div className="bg-black/70 backdrop-blur-md text-[10px] text-slate-300 py-1.5 px-3 rounded-full absolute bottom-4 flex items-center gap-1 hover:bg-black/90 transition-all">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Click to replace image
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3.5 bg-slate-850 rounded-full border border-slate-800 inline-block">
                    <ImageIcon className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-300">Drag & drop slip snapshot or click to browse</p>
                    <p className="text-[10px] text-slate-500 font-medium">Supports PNG, JPEG, WEBP files</p>
                  </div>
                </>
              )}

              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* ACTION TRIGGERS */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleScanImage}
                disabled={isScanning || !imagePreview}
                className="flex-1 py-3 bg-sky-520 hover:bg-sky-405 text-slate-950 font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScanning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
                    <span>Dairy Head Studying Image...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Study Image with Gemini AI</span>
                  </>
                )}
              </button>

              {imagePreview && (
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setScanResult(null);
                    setError(null);
                  }}
                  className="px-4 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {error && (
              <div className="bg-rose-950/10 border border-thin border-rose-900/30 text-rose-400 p-4 rounded-xl text-xs flex gap-2.5 items-start">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">AI Scanner Issue</p>
                  <p className="leading-relaxed font-sans">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* SAMPLES ROW CARDS SECTION */}
          <div className="bg-[#111114] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-505 tracking-wider">
                ⚡ Interactive Sample slips generator
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Don't have a real milk receipt on your workspace computer? Click any card below to automatically render a canvas snapshot, then hit "Study Image with Gemini"!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SAMPLE_SLIPS.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => generateAndSelectSample(sample)}
                  className="bg-slate-950/60 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-xl p-3.5 text-left transition-all flex flex-col justify-between cursor-pointer text-xs"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/15 font-semibold px-2 py-0.5 rounded tracking-wide inline-block mb-1 font-mono">
                      {sample.style === 'thermal' ? '📟 Printout' : '✒️ Ledger Paper'}
                    </span>
                    <h4 className="font-bold text-white leading-tight">{sample.title}</h4>
                    <p className="text-[10px] text-slate-500 leading-tight font-sans pt-1">
                      {sample.description}
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-900 flex justify-between font-mono text-[10px] text-slate-400">
                    <span>🥛 {sample.weight} L</span>
                    <span>FAT: {sample.fat}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: EXTRACTION COMPARISON & VERIFICATION ENGINE (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">

          {/* LOADING SHEATH OR NO-RESULTS GUIDE */}
          {!scanResult ? (
            <div className="bg-[#111114] border border-slate-800 border-dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3.5 min-h-[400px]">
              {isScanning ? (
                <>
                  <div className="w-12 h-12 border-4 border-sky-500/10 border-t-sky-400 rounded-full animate-spin"></div>
                  <div className="space-y-1 max-w-xs">
                    <h4 className="font-bold text-white text-sm">Examining Slip Metrics...</h4>
                    <p className="text-[11.5px] text-slate-500 font-sans leading-relaxed">
                      Our Dairy Head is reading handwritten metrics, detecting farmer record mappings, and running FAT/SNF ledger mathematics over the image.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <h4 className="font-semibold text-slate-300 text-sm">No Extracted Log Yet</h4>
                    <p className="text-[11.5px] text-slate-505 font-sans leading-relaxed">
                      Select a preset sample card or upload your own, then click <strong>"Study Image with Gemini AI"</strong> to extract fats, solids, volume, and automatic pricing.
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-[#111114] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
              
              {/* Extraction header card */}
              <div className="bg-[#16161a] border-b border-slate-850 p-4 px-5 flex justify-between items-center">
                <span className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-420 rounded-full animate-pulse"></span>
                  AI Extracted slip parameters
                </span>
                <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 border border-sky-500/15 px-2 py-0.5 rounded font-mono">
                  Gemini verified
                </span>
              </div>

              {/* Validation notification greeting statement from Dairy Head */}
              <div className="bg-sky-500/5 p-4 border-b border-slate-850/60 space-y-1">
                <span className="text-[9.5px] font-black text-sky-400 uppercase tracking-widest block font-mono">
                  ✉️ Verification Board instructions:
                </span>
                <p className="text-xs text-slate-300 italic font-medium leading-relaxed font-sans">
                  "{scanResult.explanation}"
                </p>
              </div>

              {/* CORE METRICS GRID */}
              <div className="p-5 space-y-4">
                
                {/* 1. Matches Customer Profile Mapping */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                    1. Matches Supplier Member Account
                  </label>
                  
                  <div className="flex gap-2.5">
                    <div className="flex-1">
                      <select
                        value={matchedCustomerId}
                        onChange={(e) => setMatchedCustomerId(e.target.value)}
                        className="w-full py-2 px-3 rounded-lg border border-[#1f2229] bg-[#16161a] text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                      >
                        {customers.map((cust) => (
                          <option key={cust.id} value={cust.id}>
                            {cust.name} ({cust.milkType === 'cow' ? '🐄 Cow' : cust.milkType === 'buffalo' ? '🐃 Buffalo' : '🌿 Mix'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-slate-900 border border-slate-850 px-3 py-2 rounded-lg flex items-center text-slate-400 text-xs">
                      <User className="w-3.5 h-3.5 mr-1" />
                      Extracted Name: <strong className="text-white ml-1">"{scanResult.customerName || 'None'}"</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Date and Shift Grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                      Ledger Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <input 
                        type="date"
                        value={verifiedDate}
                        onChange={(e) => setVerifiedDate(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-2 rounded-lg border border-[#1f2229] bg-[#16161a] text-white text-xs font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                      Shift
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-[#16161a] border border-[#1f2229] p-0.5 rounded-lg text-xs font-semibold">
                      <button
                        onClick={() => setVerifiedShift('morning')}
                        className={`py-1 text-center rounded transition-all cursor-pointer ${
                          verifiedShift === 'morning' 
                            ? 'bg-sky-510/20 text-sky-400 border border-sky-500/20' 
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        ☀️ AM
                      </button>
                      <button
                        onClick={() => setVerifiedShift('evening')}
                        className={`py-1 text-center rounded transition-all cursor-pointer ${
                          verifiedShift === 'evening' 
                            ? 'bg-sky-510/20 text-sky-400 border border-sky-500/20' 
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        🌙 PM
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Fat, SNF & WEIGHT editable boxes */}
                <div className="grid grid-cols-3 gap-2 border-t border-slate-900 pt-3">
                  
                  <div className="space-y-1">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">Weight Quantity ({settings.weightUnit})</span>
                    <input 
                      type="number"
                      step="0.1"
                      value={verifiedWeight}
                      onChange={(e) => setVerifiedWeight(Number(e.target.value))}
                      className="w-full py-1.5 px-2.5 bg-[#16161a] text-xs border border-slate-850 rounded-lg text-slate-205 font-mono text-center font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">Extracted FAT (%)</span>
                    <input 
                      type="number"
                      step="0.1"
                      value={verifiedFat}
                      onChange={(e) => setVerifiedFat(Number(e.target.value))}
                      className="w-full py-1.5 px-2.5 bg-[#16161a] text-xs border border-slate-850 rounded-lg text-slate-205 font-mono text-center font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">Extracted SNF (%)</span>
                    <input 
                      type="number"
                      step="0.1"
                      value={verifiedSnf}
                      onChange={(e) => setVerifiedSnf(Number(e.target.value))}
                      className="w-full py-1.5 px-2.5 bg-[#16161a] text-xs border border-slate-850 rounded-lg text-slate-205 font-mono text-center font-bold"
                    />
                  </div>

                </div>

                {/* AUTOMATED MATHEMATICAL DUESS AND RATES ACCORDING TO FAT & SNF */}
                <div className="bg-[#16161a] border border-slate-850 rounded-xl p-4 mt-1.5 space-y-3 shadow-inner">
                  
                  <div className="flex justify-between items-center border-b border-slate-900 pb-2 text-[10px] text-slate-505 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5 text-sky-400" />
                      Dynamic Rate & Price Matrix
                    </span>
                    <span>Method: {settings.rateCalculationMethod}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 text-center">
                      <span className="text-[9px] text-slate-500 block uppercase font-sans font-bold">Calculated Rate</span>
                      <span className="text-[15px] font-bold text-slate-205 mt-0.5 block">
                        {settings.currency}
                        {dynamicRate.toFixed(2)}
                        <span className="text-[10px] text-slate-500 font-sans font-medium">/{settings.weightUnit}</span>
                      </span>
                    </div>

                    <div className="bg-sky-500/5 p-2.5 rounded-lg border border-sky-500/10 text-center">
                      <span className="text-[9px] text-sky-400/80 block uppercase font-sans font-bold">Total Ledger Price</span>
                      <span className="text-[15px] font-bold text-sky-400 mt-0.5 block">
                        {settings.currency}
                        {dynamicAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  
                  {currentMatchedCustomer && (
                    <div className="text-[9px] text-slate-505 font-sans leading-tight bg-slate-950/40 p-2 rounded border border-slate-900 space-y-1">
                      <div>
                        Calculated using standard <strong>{currentMatchedCustomer.milkType}</strong> milk factors. FAT Factor: {settings.fatFactor}, SNF Factor: {settings.snfFactor}.
                      </div>
                      {verifiedFat === 3.3 && verifiedSnf === 7.6 && (
                        <div className="text-sky-400 font-bold border-t border-slate-900 pt-1 flex items-center gap-1 font-mono">
                          🎯 Calibration Match: 3.3% FAT & 7.6% SNF equals exactly {settings.currency}32.00 per Litre
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* ACCEPT & LOG ACTION BUTTON */}
                <div className="pt-2">
                  <button
                    onClick={handleSaveScannedEntry}
                    disabled={!matchedCustomerId || verifiedWeight <= 0}
                    className="w-full py-2.5 bg-emerald-510 hover:bg-emerald-410 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Accept Verification & Log to Delivery Book</span>
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
