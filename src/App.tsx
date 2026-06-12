/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Customer, MilkEntry, ExpenseEntry, PricingSettings } from './types';
import { DEFAULT_SETTINGS, INITIAL_CUSTOMERS, generateInitialEntries, calculateRate } from './data';
import AnalyticsCharts from './components/AnalyticsCharts';
import CustomerForm from './components/CustomerForm';
import MilkEntryForm from './components/MilkEntryForm';
import ExpenseForm from './components/ExpenseForm';
import BillingReport from './components/BillingReport';
import SettingsPanel from './components/SettingsPanel';
import AiScanner from './components/AiScanner';
import { 
  Milk, 
  Users, 
  ShoppingBag, 
  FileText, 
  Settings, 
  PlusCircle, 
  Search, 
  Trash2, 
  Edit, 
  Phone, 
  MapPin, 
  TrendingUp, 
  Menu, 
  X, 
  Landmark, 
  Calendar, 
  ChevronRight, 
  Coins, 
  BookOpen, 
  Download, 
  Plus, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // --------------------------------------------------
  // STATE DEFINITIONS
  // --------------------------------------------------
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [milkEntries, setMilkEntries] = useState<MilkEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_SETTINGS);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'delivery' | 'expenses' | 'billing' | 'settings' | 'ai-scan'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [breedFilter, setBreedFilter] = useState<'all' | 'cow' | 'buffalo' | 'mix'>('all');
  const [selectedCustId, setSelectedCustId] = useState<string | null>(null); // For detail view

  // Modal Triggers
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showMilkModal, setShowMilkModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Editing structures
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editMilk, setEditMilk] = useState<MilkEntry | null>(null);
  const [editExpense, setEditExpense] = useState<ExpenseEntry | null>(null);

  // UI feedback States
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mobile sidebar menu drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --------------------------------------------------
  // INITIALIZATION & CACHE ENGINE
  // --------------------------------------------------
  useEffect(() => {
    // Force a programmatically complete initial database wipe/refresh to respect user's directive
    const hasPrecededWipe = localStorage.getItem('database_wiped_v2026_final_fresh');
    if (!hasPrecededWipe) {
      const calibratedSettings = {
        ...DEFAULT_SETTINGS,
        rateCalculationMethod: 'fat_snf' as const,
        fatFactor: 5.0,
        snfFactor: 2.0395,
      };
      localStorage.setItem('prem_dairy_customers', JSON.stringify([]));
      localStorage.setItem('prem_dairy_milk', JSON.stringify([]));
      localStorage.setItem('prem_dairy_expenses', JSON.stringify([]));
      localStorage.setItem('prem_dairy_settings', JSON.stringify(calibratedSettings));
      localStorage.setItem('database_wiped_v2026_final_fresh', 'true');
      
      setCustomers([]);
      setMilkEntries([]);
      setExpenseEntries([]);
      setSettings(calibratedSettings);
      
      setTimeout(() => {
        triggerToast('🗑️ Database fully wiped! Add your custom list of customers.');
      }, 500);
      return;
    }

    // 1. Customers
    let currentCustomers = INITIAL_CUSTOMERS;
    const cachedCustomers = localStorage.getItem('prem_dairy_customers');
    if (cachedCustomers) {
      currentCustomers = JSON.parse(cachedCustomers);
      setCustomers(currentCustomers);
    } else {
      setCustomers(INITIAL_CUSTOMERS);
      localStorage.setItem('prem_dairy_customers', JSON.stringify(INITIAL_CUSTOMERS));
    }

    // 2. Settings
    let currentSettings = DEFAULT_SETTINGS;
    let didCalibrate = false;
    const cachedSettings = localStorage.getItem('prem_dairy_settings');
    if (cachedSettings) {
      const parsed = JSON.parse(cachedSettings);
      const calculatedRateAtBenchmark = Number(((3.3 * (parsed.fatFactor ?? 5.0)) + (7.6 * (parsed.snfFactor ?? 2.0395))).toFixed(2));
      // If the cached factors do not compute to exactly 32.00, or are using old uncalibrated defaults, calibrate them!
      if (calculatedRateAtBenchmark !== 32 || parsed.fatFactor === 7.2) {
        parsed.fatFactor = 5.0;
        parsed.snfFactor = 2.0395;
        parsed.flatRateCow = 32;
        parsed.tsRate = 293.58;
        parsed.rateCalculationMethod = 'fat_snf'; // Standardize to fat/snf pricing formula
        currentSettings = parsed;
        setSettings(parsed);
        localStorage.setItem('prem_dairy_settings', JSON.stringify(parsed));
        didCalibrate = true;
      } else {
        currentSettings = parsed;
        setSettings(parsed);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem('prem_dairy_settings', JSON.stringify(DEFAULT_SETTINGS));
    }

    // 3. Milk & Expenses Seed
    const cachedMilk = localStorage.getItem('prem_dairy_milk');
    const cachedExpenses = localStorage.getItem('prem_dairy_expenses');
    
    if (cachedMilk && cachedExpenses) {
      let loadedMilk = JSON.parse(cachedMilk) as MilkEntry[];
      const loadedExpenses = JSON.parse(cachedExpenses) as ExpenseEntry[];
      
      // If settings recalibrated, automatically adjust the rate and amount of all stored milk inputs retrospectively!
      if (didCalibrate) {
        loadedMilk = loadedMilk.map((entry) => {
          const cust = currentCustomers.find((c) => c.id === entry.customerId);
          const rate = calculateRate(entry.fat, entry.snf, cust ? cust.milkType : 'cow', currentSettings);
          return {
            ...entry,
            rate,
            amount: Number((entry.weight * rate).toFixed(2)),
          };
        });
        localStorage.setItem('prem_dairy_milk', JSON.stringify(loadedMilk));
      }

      setMilkEntries(loadedMilk);
      setExpenseEntries(loadedExpenses);
    } else {
      const dbSeed = generateInitialEntries();
      setMilkEntries(dbSeed.milkEntries);
      setExpenseEntries(dbSeed.expenseEntries);
      localStorage.setItem('prem_dairy_milk', JSON.stringify(dbSeed.milkEntries));
      localStorage.setItem('prem_dairy_expenses', JSON.stringify(dbSeed.expenseEntries));
    }

    if (didCalibrate) {
      setTimeout(() => {
        triggerToast('🎯 System automatically calibrated to 3.3% FAT & 7.6% SNF = ₹32.00/L');
      }, 500);
    }
  }, []);

  // Sync state triggers with localStorage
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const syncCustomers = (updated: Customer[]) => {
    setCustomers(updated);
    localStorage.setItem('prem_dairy_customers', JSON.stringify(updated));
  };

  const syncMilk = (updated: MilkEntry[]) => {
    setMilkEntries(updated);
    localStorage.setItem('prem_dairy_milk', JSON.stringify(updated));
  };

  const syncExpenses = (updated: ExpenseEntry[]) => {
    setExpenseEntries(updated);
    localStorage.setItem('prem_dairy_expenses', JSON.stringify(updated));
  };

  const syncSettings = (updated: PricingSettings) => {
    setSettings(updated);
    localStorage.setItem('prem_dairy_settings', JSON.stringify(updated));

    // Recalculate rates of all existing milk entries if settings pricing factors change!
    const reCalculated = milkEntries.map((entry) => {
      const cust = customers.find((c) => c.id === entry.customerId);
      const rate = calculateRate(entry.fat, entry.snf, cust ? cust.milkType : 'cow', updated);
      return {
        ...entry,
        rate,
        amount: Number((entry.weight * rate).toFixed(2)),
      };
    });
    syncMilk(reCalculated);
    triggerToast('🔧 Pricing settings re-applied to existing logs!');
  };

  // --------------------------------------------------
  // DB BACKUP EXPORT & RESTORE IMPLEMENTATION
  // --------------------------------------------------
  const handleExportDatabase = () => {
    const dataObj = {
      customers,
      milkEntries,
      expenseEntries,
      settings,
      backupVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
    };

    const strFile = JSON.stringify(dataObj, null, 2);
    const blob = new Blob([strFile], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `prem_dairy_ledger_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast('💾 Database file exported successfully!');
  };

  const handleImportDatabase = (dataString: string): boolean => {
    try {
      const parsed = JSON.parse(dataString);
      if (
        parsed &&
        Array.isArray(parsed.customers) &&
        Array.isArray(parsed.milkEntries) &&
        Array.isArray(parsed.expenseEntries) &&
        parsed.settings
      ) {
        setCustomers(parsed.customers);
        setMilkEntries(parsed.milkEntries);
        setExpenseEntries(parsed.expenseEntries);
        setSettings(parsed.settings);

        localStorage.setItem('prem_dairy_customers', JSON.stringify(parsed.customers));
        localStorage.setItem('prem_dairy_milk', JSON.stringify(parsed.milkEntries));
        localStorage.setItem('prem_dairy_expenses', JSON.stringify(parsed.expenseEntries));
        localStorage.setItem('prem_dairy_settings', JSON.stringify(parsed.settings));

        triggerToast('🎉 Database restore completed successfully!');
        return true;
      }
    } catch (e) {
      console.error('Core restore failure: ', e);
    }
    return false;
  };

  const handleResetDatabase = () => {
    setCustomers(INITIAL_CUSTOMERS);
    setSettings(DEFAULT_SETTINGS);
    const dbSeed = generateInitialEntries();
    setMilkEntries(dbSeed.milkEntries);
    setExpenseEntries(dbSeed.expenseEntries);

    localStorage.setItem('prem_dairy_customers', JSON.stringify(INITIAL_CUSTOMERS));
    localStorage.setItem('prem_dairy_settings', JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem('prem_dairy_milk', JSON.stringify(dbSeed.milkEntries));
    localStorage.setItem('prem_dairy_expenses', JSON.stringify(dbSeed.expenseEntries));

    triggerToast('🔄 Application reset to defaults successfully.');
  };

  const handlePurgeAllData = () => {
    setCustomers([]);
    setMilkEntries([]);
    setExpenseEntries([]);
    
    const calibratedSettings = {
      ...DEFAULT_SETTINGS,
      rateCalculationMethod: 'fat_snf' as const,
      fatFactor: 5.0,
      snfFactor: 2.0395,
    };
    setSettings(calibratedSettings);

    localStorage.setItem('prem_dairy_customers', JSON.stringify([]));
    localStorage.setItem('prem_dairy_milk', JSON.stringify([]));
    localStorage.setItem('prem_dairy_expenses', JSON.stringify([]));
    localStorage.setItem('prem_dairy_settings', JSON.stringify(calibratedSettings));

    triggerToast('🗑️ System database wiped! All customers & log entries deleted.');
  };

  // --------------------------------------------------
  // MUTATIONS (CUSTOMERS, MILKLOGS, EXPENSES)
  // --------------------------------------------------
  const handleSaveCustomer = (cust: Customer) => {
    const exists = customers.some((c) => c.id === cust.id);
    let updated: Customer[];
    if (exists) {
      updated = customers.map((c) => (c.id === cust.id ? cust : c));
      triggerToast('👤 Customer profile edit updated!');
    } else {
      updated = [cust, ...customers];
      triggerToast(`🎉 Registered supplier "${cust.name}"!`);
    }
    syncCustomers(updated);
    setShowCustomerModal(false);
    setEditCustomer(null);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (window.confirm(`⚠️ Warning: Are you sure you want to delete "${name}"? This will keep their recorded history but remove their customer file.`)) {
      const updated = customers.filter((c) => c.id !== id);
      syncCustomers(updated);
      setSelectedCustId(null);
      triggerToast(`🗑️ Deleted profile of "${name}"!`);
    }
  };

  const handleSaveMilkEntry = (entry: MilkEntry) => {
    const exists = milkEntries.some((e) => e.id === entry.id);
    let updated: MilkEntry[];
    if (exists) {
      updated = milkEntries.map((e) => (e.id === entry.id ? entry : e));
      triggerToast('🥛 Milk delivery record updated!');
    } else {
      updated = [entry, ...milkEntries];
      triggerToast('🥛 Logged daily milk supply!');
    }
    syncMilk(updated);
    setShowMilkModal(false);
    setEditMilk(null);
  };

  const handleDeleteMilkEntry = (id: string) => {
    if (window.confirm('🗑️ Delete this specific milk delivery record?')) {
      const updated = milkEntries.filter((e) => e.id !== id);
      syncMilk(updated);
      triggerToast('🥛 Milk record deleted.');
    }
  };

  const handleSaveExpense = (exp: ExpenseEntry) => {
    const exists = expenseEntries.some((e) => e.id === exp.id);
    let updated: ExpenseEntry[];
    if (exists) {
      updated = expenseEntries.map((e) => (e.id === exp.id ? exp : e));
      triggerToast('🌾 Ledged expense details updated!');
    } else {
      updated = [exp, ...expenseEntries];
      triggerToast('🌾 expense entry ledger debited!');
    }
    syncExpenses(updated);
    setShowExpenseModal(false);
    setEditExpense(null);
  };

  const handleDeleteExpense = (id: string) => {
    if (window.confirm('🗑️ Delete this specific expense record?')) {
      const updated = expenseEntries.filter((e) => e.id !== id);
      syncExpenses(updated);
      triggerToast('🌾 Expense record deleted.');
    }
  };

  // --------------------------------------------------
  // LEDGER TRANSACTION & PAYMENT SETTLEMENT HANDLERS
  // --------------------------------------------------
  const handleSettleEntries = (customerId: string, milkEntryIds: string[], expenseEntryIds: string[]) => {
    const updatedMilk = milkEntries.map((e) => {
      if (milkEntryIds.includes(e.id)) {
        return { ...e, status: 'paid' as const };
      }
      return e;
    });

    const updatedExpenses = expenseEntries.map((exp) => {
      if (expenseEntryIds.includes(exp.id)) {
        return { ...exp, status: 'paid' as const };
      }
      return exp;
    });

    syncMilk(updatedMilk);
    syncExpenses(updatedExpenses);
    triggerToast('💸 Balance settled! Selected cycle marked as PAID.');
  };

  const handleUnsettleEntries = (customerId: string, milkEntryIds: string[], expenseEntryIds: string[]) => {
    const updatedMilk = milkEntries.map((e) => {
      if (milkEntryIds.includes(e.id)) {
        return { ...e, status: 'unpaid' as const };
      }
      return e;
    });

    const updatedExpenses = expenseEntries.map((exp) => {
      if (expenseEntryIds.includes(exp.id)) {
        return { ...exp, status: 'unpaid' as const };
      }
      return exp;
    });

    syncMilk(updatedMilk);
    syncExpenses(updatedExpenses);
    triggerToast('🔄 Selected billing cycle reverted back to UNPAID!');
  };

  // --------------------------------------------------
  // LEDGER CALCULATION ENGINE PER CUSTOMER
  // --------------------------------------------------
  const customerListBalances = useMemo(() => {
    const balancesMap: Record<
      string,
      { milkTotal: number; expenseTotal: number; unpaidMilkTotal: number; unpaidExpenseTotal: number }
    > = {};
    
    customers.forEach((c) => {
      balancesMap[c.id] = { milkTotal: 0, expenseTotal: 0, unpaidMilkTotal: 0, unpaidExpenseTotal: 0 };
    });

    milkEntries.forEach((entry) => {
      if (balancesMap[entry.customerId]) {
        balancesMap[entry.customerId].milkTotal += entry.amount;
        if (entry.status !== 'paid') {
          balancesMap[entry.customerId].unpaidMilkTotal += entry.amount;
        }
      }
    });

    expenseEntries.forEach((entry) => {
      if (balancesMap[entry.customerId]) {
        balancesMap[entry.customerId].expenseTotal += entry.amount;
        if (entry.status !== 'paid') {
          balancesMap[entry.customerId].unpaidExpenseTotal += entry.amount;
        }
      }
    });

    return balancesMap;
  }, [customers, milkEntries, expenseEntries]);

  // Aggregate stats in header
  const headerQuickStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const activeSuppliers = customers.filter(c => c.status === 'active').length;
    
    // Total gross milk credit dues remaining (outstanding unpaid balance)
    let totalDuesPending = 0;
    (Object.values(customerListBalances) as Array<{ unpaidMilkTotal: number; unpaidExpenseTotal: number }>).forEach((item) => {
      totalDuesPending += (item.unpaidMilkTotal - item.unpaidExpenseTotal);
    });

    // Todays collected volume
    const todaysMorningM = milkEntries
      .filter(e => e.date === today && e.shift === 'morning')
      .reduce((acc, curr) => acc + curr.weight, 0);

    const todaysEveningE = milkEntries
      .filter(e => e.date === today && e.shift === 'evening')
      .reduce((acc, curr) => acc + curr.weight, 0);

    return {
      activeSuppliers,
      todaysMorningM,
      todaysEveningE,
      totalDuesPending,
    };
  }, [customers, milkEntries, customerListBalances]);

  // Filtered customers list grid
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const matchesSearch = cust.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            cust.phone.includes(searchQuery) ||
                            cust.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBreed = breedFilter === 'all' ? true : cust.milkType === breedFilter;
      return matchesSearch && matchesBreed;
    });
  }, [customers, searchQuery, breedFilter]);

  // Specific Customer's details load
  const selectedCustomerDetails = useMemo(() => {
    if (!selectedCustId) return null;
    const cust = customers.find((c) => c.id === selectedCustId);
    if (!cust) return null;

    const logs = milkEntries.filter((e) => e.customerId === selectedCustId)
                            .sort((a, b) => b.date.localeCompare(a.date));
    const exps = expenseEntries.filter((e) => e.customerId === selectedCustId)
                                .sort((a, b) => b.date.localeCompare(a.date));

    // Ledger summation
    const totals = customerListBalances[selectedCustId] || { milkTotal: 0, expenseTotal: 0 };
    const firstDelivery = logs.length > 0 ? logs[logs.length - 1].date : 'Never';
    const totalDeliveries = logs.length;
    
    // Average ratings
    const avgFat = logs.length > 0 ? logs.reduce((acc, curr) => acc + curr.fat, 0) / logs.length : 0;
    const avgSnf = logs.length > 0 ? logs.reduce((acc, curr) => acc + curr.snf, 0) / logs.length : 0;
    const avgWeight = logs.length > 0 ? logs.reduce((acc, curr) => acc + curr.weight, 0) / logs.length : 0;

    return {
      customer: cust,
      logs,
      expenses: exps,
      milkTotal: totals.milkTotal,
      expenseTotal: totals.expenseTotal,
      netPayable: totals.milkTotal - totals.expenseTotal,
      firstDelivery,
      totalDeliveries,
      avgFat: Number(avgFat.toFixed(2)),
      avgSnf: Number(avgSnf.toFixed(2)),
      avgWeight: Number(avgWeight.toFixed(1)),
    };
  }, [selectedCustId, customers, milkEntries, expenseEntries, customerListBalances]);

  // --------------------------------------------------
  // VIEW RENDER
   return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-350 flex flex-col font-sans selection:bg-sky-500/20 selection:text-white antialiased" id="app-root">
      
      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-[#16161a] border border-slate-800 text-white text-xs font-semibold py-2.5 px-5 rounded-full shadow-2xl flex items-center gap-2"
          >
            <span className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></span>
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Flex layout shell */}
      <div className="flex flex-1 relative">
        
        {/* SIDEBAR: NAVIGATION PANEL (Desktop View) */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#0e0e11] text-slate-300 border-r border-slate-800 shrink-0 sticky top-0 h-screen justify-between z-10 select-none">
          
          <div className="space-y-6">
            {/* Logo Brand banner */}
            <div className="p-6 pb-2 flex items-center gap-3">
              <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shadow-lg shadow-sky-500/20 text-white font-extrabold text-base select-none">
                🥛
              </div>
              <div>
                <h1 className="font-sans font-black tracking-tighter text-white leading-5 text-lg">
                  PREM <span className="text-sky-400">DAIRY</span>
                </h1>
                <p className="text-[9px] text-sky-500 uppercase tracking-widest font-mono font-black mt-0.5">
                  Agri ERP Suite
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="px-3 space-y-1">
              {[
                { id: 'dashboard', text: '📊 Dashboard Ledger', desc: 'Summary & customer list' },
                { id: 'delivery', text: '🥛 Milk Deliveries', desc: 'Register fat/snf weight logs' },
                { id: 'expenses', text: '🌾 Cattle feed debit', desc: 'Supplies expense logbook' },
                { id: 'billing', text: '📜 Settlement Billing', desc: '10, 20, 30 days cycle' },
                { id: 'ai-scan', text: '📷 AI Scan Slip', desc: 'Automatic FAT/SNF scanner' },
                { id: 'settings', text: '⚙️ Settings / Backup', desc: 'Setup pricing equations' },
              ].map((navTab) => (
                <button
                  key={navTab.id}
                  onClick={() => {
                    setActiveTab(navTab.id as any);
                    setSelectedCustId(null);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-3 ${
                    activeTab === navTab.id && !selectedCustId
                      ? 'bg-sky-500/10 text-white font-bold border-l-4 border-sky-500'
                      : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
                  }`}
                  id={`nav-link-${navTab.id}`}
                >
                  <div className="flex flex-col text-left">
                    <span className="text-[12.5px] font-sans tracking-tight">{navTab.text}</span>
                    <span className="text-[9.5px] text-slate-500 font-normal leading-3">{navTab.desc}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Sidebar bottom signature card */}
          <div className="p-4 m-3 bg-[#111114] rounded-xl border border-slate-800 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                VITE ERP ENGINE
              </span>
              <span>v1.2.0</span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-tight">
              Calculates monthly & choice periodic invoice calculations smoothly.
            </p>
          </div>
        </aside>

        {/* MOBILE SIDEBAR DRAWERE PORTAL */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Back backdrop shade */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-[2px]"
              />

              {/* Drawer Content */}
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 20 }}
                className="fixed left-0 top-0 bottom-0 w-72 bg-[#0e0e11] border-r border-slate-800 text-slate-300 z-50 p-6 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🥛</span>
                      <h1 className="font-sans font-black tracking-tighter text-white leading-5 text-lg">PREM <span className="text-sky-400">DAIRY</span></h1>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-slate-800">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <nav className="space-y-1">
                    {[
                      { id: 'dashboard', text: '📊 Dashboard Ledger' },
                      { id: 'delivery', text: '🥛 Milk Deliveries' },
                      { id: 'expenses', text: '🌾 Cattle feed debit' },
                      { id: 'billing', text: '📜 Settlement Billing' },
                      { id: 'ai-scan', text: '📷 AI Scan Slip' },
                      { id: 'settings', text: '⚙️ Settings / Backup' },
                    ].map((navTab) => (
                      <button
                        key={navTab.id}
                        onClick={() => {
                          setActiveTab(navTab.id as any);
                          setSelectedCustId(null);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center justify-between ${
                          activeTab === navTab.id && !selectedCustId
                            ? 'bg-sky-500/10 text-sky-400 font-bold border-l-4 border-sky-500'
                            : 'hover:bg-slate-800 hover:text-white text-slate-400'
                        }`}
                      >
                        <span>{navTab.text}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-650" />
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-3 bg-[#111114] border border-slate-800 rounded-lg text-[10px] text-slate-500">
                  <p>Prem Dairy Local Web Application for Milkmen & Cattle Farmers.</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* WORKSPACE CONTENT SHELL */}
        <main className="flex-1 min-w-0 flex flex-col max-h-screen overflow-y-auto scroller-subtle">
          
          {/* TOP BAR / APP HEADER */}
          <header className="bg-[#111114] border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-xs h-16 shrink-0">
            
            {/* Sidebar toggle buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
                id="btn-toggle-mobile-sidebar"
              >
                <Menu className="w-5.5 h-5.5" />
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-xl lg:hidden">🥛</span>
                <span className="font-bold text-white text-sm md:text-base tracking-tight font-sans">
                  {selectedCustId ? `Supplier Detail Statement` : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Workspace`}
                </span>
              </div>
            </div>

            {/* Dairy actions header buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowMilkModal(true)}
                className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg font-bold text-xs shadow-sm shadow-sky-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
                id="btn-header-log-milk"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Milk</span>
              </button>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 hover:text-white text-slate-300 border border-slate-750 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                id="btn-header-log-expense"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </button>
            </div>
          </header>

          {/* APP BODY CONTROLLER */}
          <div className="p-6 space-y-6">
            
            {/* IF NO SUFFICIENT SCREEN DETECTED IN DESCRIPTIVE CONTEXTS (Banner Warning) */}
            {customers.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-xs font-medium text-yellow-800 flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
                <span>
                  No customers found. To get started, please register your first customer using the <strong>➕ Add Profile</strong> button!
                </span>
              </div>
            )}

            {/* TAB VIEW router */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedCustId ? `details_${selectedCustId}` : activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* CHOICE A: CUSTOMER PROFILE DETAILS SCREEN */}
                {selectedCustId && selectedCustomerDetails ? (
                  <div className="space-y-6" id="customer-profile-details">
                    
                    {/* Return Navigation row button */}
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setSelectedCustId(null)}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold rounded-lg text-slate-350 flex items-center gap-2 cursor-pointer transition-colors"
                        id="btn-back-to-list"
                      >
                        ← Back to Customer Dashboard
                      </button>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditCustomer(selectedCustomerDetails.customer);
                            setShowCustomerModal(true);
                          }}
                          className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded-lg text-xs font-semibold cursor-pointer text-slate-350 flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5 text-slate-400" />
                          Update Profile
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(selectedCustomerDetails.customer.id, selectedCustomerDetails.customer.name)}
                          className="px-3 py-1.5 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 border border-rose-900/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Customer
                        </button>
                      </div>
                    </div>

                    {/* Customer Info Card header */}
                    <div className="bg-gradient-to-r from-[#111114] to-[#16161a] text-white rounded-2xl p-6 shadow-sm border border-slate-800 relative overflow-hidden grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Left Block info details */}
                      <div className="space-y-3.5">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl bg-white/10 p-2.5 rounded-xl block border border-white/15">
                            {selectedCustomerDetails.customer.milkType === 'cow' ? '🐄' : selectedCustomerDetails.customer.milkType === 'buffalo' ? '🐃' : '🌿'}
                          </span>
                          <div>
                            <h2 className="text-xl font-bold font-sans tracking-tight">{selectedCustomerDetails.customer.name}</h2>
                            <span className="text-[10px] bg-sky-500/10 text-sky-400 font-bold px-2 py-0.5 rounded uppercase tracking-wider mt-0.5 inline-block border border-sky-500/20">
                              {selectedCustomerDetails.customer.milkType === 'cow' ? 'Cow milk breeder' : selectedCustomerDetails.customer.milkType === 'buffalo' ? 'Buffalo Milk Breeder' : 'Mix breed breeder'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-300">
                          <p className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>Contact: +91 {selectedCustomerDetails.customer.phone}</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span className="truncate max-w-xs font-sans">Address: {selectedCustomerDetails.customer.address}</span>
                          </p>
                        </div>
                      </div>

                      {/* Middle block average ratings */}
                      <div className="bg-white/5 rounded-xl border border-slate-800 p-4 space-y-2.5 text-xs">
                        <span className="font-bold text-sky-400 uppercase tracking-wider text-[9.5px]">Avg Supplier yield (All time)</span>
                        
                        <div className="grid grid-cols-3 gap-2 text-center text-slate-300 font-mono">
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-semibold font-sans">Weight</span>
                            <span className="font-mono text-base font-bold tracking-tight">
                              {selectedCustomerDetails.avgWeight}
                              <span className="text-[10px] font-sans font-normal text-slate-400"> {settings.weightUnit}</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-semibold font-sans">FAT</span>
                            <span className="font-mono text-base font-bold tracking-tight">
                              {selectedCustomerDetails.avgFat ? `${selectedCustomerDetails.avgFat}%` : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-semibold font-sans">SNF</span>
                            <span className="font-mono text-base font-bold tracking-tight">
                              {selectedCustomerDetails.avgSnf ? `${selectedCustomerDetails.avgSnf}%` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Outstanding Balance summary */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl text-slate-305 p-4 shrink-0 flex flex-col justify-between shadow-lg">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Outstanding Account Due</span>
                          <span className="text-2xl font-mono font-black text-sky-400 mt-1 block">
                            {settings.currency}
                            {selectedCustomerDetails.netPayable.toLocaleString()}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800 flex justify-between">
                          <span>Credits: <strong className="text-emerald-400">{settings.currency}{selectedCustomerDetails.milkTotal.toLocaleString()}</strong></span>
                          <span>Debits: <strong className="text-rose-455">{settings.currency}{selectedCustomerDetails.expenseTotal.toLocaleString()}</strong></span>
                        </div>
                      </div>

                    </div>

                    {/* Split list tables past history logs */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs text-slate-305">
                      
                      {/* MILK SHIPMENT LOGS */}
                      <div className="bg-[#16161a] rounded-2xl border border-slate-800 p-5 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                          <span className="text-sm font-bold text-white">🥛 Milk Delivery Logs ({selectedCustomerDetails.logs.length})</span>
                          <button
                            onClick={() => {
                              setSelectedCustId(selectedCustomerDetails.customer.id);
                              setShowMilkModal(true);
                            }}
                            className="text-sky-450 hover:text-sky-305 border border-sky-500/20 hover:bg-sky-500/10 px-2 py-1 rounded text-[11px] font-bold cursor-pointer"
                          >
                            + Add Milk
                          </button>
                        </div>

                        <div className="overflow-y-auto max-h-96 pr-1 scroller-subtle">
                          {selectedCustomerDetails.logs.length === 0 ? (
                            <div className="p-10 text-center text-slate-500 text-xs">
                              No milk deliveries have been saved for this customer yet.
                            </div>
                          ) : (
                            <table className="w-full text-left font-sans">
                              <thead>
                                <tr className="text-slate-500 border-b border-slate-800 uppercase tracking-wider text-[9px] font-semibold">
                                  <th className="pb-2">Date / Shift</th>
                                  <th className="pb-2 text-right">FAT %</th>
                                  <th className="pb-2 text-right">SNF %</th>
                                  <th className="pb-2 text-right">Weight</th>
                                  <th className="pb-2 text-right">Amount</th>
                                  <th className="pb-2 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-900 font-mono text-[11px]">
                                {selectedCustomerDetails.logs.map((log) => (
                                  <tr key={log.id} className="hover:bg-slate-850/30">
                                    <td className="py-2.5 font-sans font-medium text-slate-300">
                                      {log.date}{' '}
                                      <span className="text-[10px] text-slate-500 uppercase">
                                        {log.shift === 'morning' ? '☀️' : '🌙'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 text-right text-slate-400">{log.fat ? `${log.fat}%` : '-'}</td>
                                    <td className="py-2.5 text-right text-slate-400">{log.snf ? `${log.snf}%` : '-'}</td>
                                    <td className="py-2.5 text-right font-semibold text-slate-200">
                                      {log.weight.toFixed(1)} {settings.weightUnit}
                                    </td>
                                    <td className="py-2.5 text-right font-bold text-emerald-400">
                                      {settings.currency}
                                      {log.amount.toLocaleString()}
                                    </td>
                                    <td className="py-2.5 text-right space-x-1.5 font-sans">
                                      <button
                                        onClick={() => {
                                          setEditMilk(log);
                                          setShowMilkModal(true);
                                        }}
                                        className="text-sky-400 hover:text-sky-300 inline-block py-0.5 px-1 rounded hover:bg-slate-800/60 cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteMilkEntry(log.id)}
                                        className="text-[#ff5252] hover:text-red-400 inline-block py-0.5 px-1 rounded hover:bg-rose-950/20 cursor-pointer"
                                      >
                                        Del
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>

                      {/* OTHER EXPENSES LOGS */}
                      <div className="bg-[#16161a] rounded-2xl border border-slate-800 p-5 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                          <span className="text-sm font-bold text-white">🌾 Feed bags & advance ledgers ({selectedCustomerDetails.expenses.length})</span>
                          <button
                            onClick={() => {
                              setSelectedCustId(selectedCustomerDetails.customer.id);
                              setShowExpenseModal(true);
                            }}
                            className="text-rose-400 hover:text-rose-300 border border-slate-705 px-2 py-1 rounded text-[11px] font-bold cursor-pointer"
                          >
                            + Log Expense
                          </button>
                        </div>

                        <div className="overflow-y-auto max-h-96 pr-1 scroller-subtle">
                          {selectedCustomerDetails.expenses.length === 0 ? (
                            <div className="p-10 text-center text-slate-500 text-xs">
                              No store purchases, cattle feed, or cash loans have been logged for this customer.
                            </div>
                          ) : (
                            <table className="w-full text-left font-sans text-xs">
                              <thead>
                                <tr className="text-slate-500 border-b border-slate-800 uppercase tracking-wider text-[9px] font-semibold">
                                  <th className="pb-2">Date</th>
                                  <th className="pb-2">Category</th>
                                  <th className="pb-2">Description Detail</th>
                                  <th className="pb-2 text-right">Debit Amt</th>
                                  <th className="pb-2 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-900 font-mono text-[11px]">
                                {selectedCustomerDetails.expenses.map((exp) => (
                                  <tr key={exp.id} className="hover:bg-slate-850/30">
                                    <td className="py-2.5 font-sans font-medium text-slate-350">{exp.date}</td>
                                    <td className="py-2.5 font-sans capitalize text-slate-450">
                                      {exp.category === 'feed' ? '🌾 feed' : exp.category === 'medicine' ? '💊 medicine' : exp.category === 'advance' ? '💵 advance' : '⚙️ other'}
                                    </td>
                                    <td className="py-2.5 font-sans text-slate-300 truncate max-w-[140px]">{exp.description}</td>
                                    <td className="py-2.5 text-right font-bold text-rose-400">
                                      {settings.currency}
                                      {exp.amount.toLocaleString()}
                                    </td>
                                    <td className="py-2.5 text-right space-x-1.5 font-sans">
                                      <button
                                        onClick={() => {
                                          setEditExpense(exp);
                                          setShowExpenseModal(true);
                                        }}
                                        className="text-sky-400 hover:text-sky-300 inline-block py-0.5 px-1 rounded hover:bg-slate-800/60 cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteExpense(exp.id)}
                                        className="text-[#ff5252] hover:text-red-400 inline-block py-0.5 px-1 rounded hover:bg-rose-950/20 cursor-pointer"
                                      >
                                        Del
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <>
                    {/* CHOICE B: DASHBOARD LEDGER TAB SCREEN */}
                    {activeTab === 'dashboard' && (
                      <div className="space-y-6" id="view-dashboard">
                        
                        {/* Summary Numbers blocks row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="view-dashboard-header-stats">
                          
                          {/* Card 1: Active Accounts */}
                          <div className="bg-[#111114] p-4 rounded-xl border border-slate-800 flex items-center gap-4 shadow-sm">
                            <div className="w-10 h-10 bg-sky-500/10 rounded-lg flex items-center justify-center border border-sky-500/20">
                              <Users className="w-5 h-5 text-sky-400" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-medium">Suppliers Accounts</span>
                              <span className="text-xl font-bold font-mono text-white tracking-tight block mt-0.5">
                                {headerQuickStats.activeSuppliers} <span className="text-xs font-sans text-slate-400 font-normal">Active</span>
                              </span>
                            </div>
                          </div>

                          {/* Card 2: Today morning L */}
                          <div className="bg-[#111114] p-4 rounded-xl border border-slate-800 flex items-center gap-4 shadow-sm">
                            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20">
                              <PlusCircle className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-medium">Today Morning Shift</span>
                              <span className="text-xl font-bold font-mono text-white tracking-tight block mt-0.5">
                                {headerQuickStats.todaysMorningM.toFixed(1)} <span className="text-xs font-sans text-slate-400 font-normal">{settings.weightUnit}</span>
                              </span>
                            </div>
                          </div>

                          {/* Card 3: Today Evening L */}
                          <div className="bg-[#111114] p-4 rounded-xl border border-slate-800 flex items-center gap-4 shadow-sm">
                            <div className="w-10 h-10 bg-[#3b82f6]/10 rounded-lg flex items-center justify-center border-[#3b82f6]/20">
                              <Clock className="w-5 h-5 text-sky-450" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-medium">Today Evening Shift</span>
                              <span className="text-xl font-bold font-mono text-white tracking-tight block mt-0.5">
                                {headerQuickStats.todaysEveningE.toFixed(1)} <span className="text-xs font-sans text-slate-400 font-normal">{settings.weightUnit}</span>
                              </span>
                            </div>
                          </div>

                          {/* Card 4: Total ledger payable */}
                          <div className="bg-[#111114] p-4 rounded-xl border border-slate-800 flex items-center gap-4 shadow-sm">
                            <div className="w-10 h-10 bg-rose-500/10 rounded-lg flex items-center justify-center border border-rose-500/20">
                              <Landmark className="w-5 h-5 text-rose-400" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-medium">Net Ledger Payable</span>
                              <span className="text-xl font-bold font-mono text-sky-400 tracking-tight block mt-0.5">
                                {settings.currency}
                                {headerQuickStats.totalDuesPending.toLocaleString()}
                              </span>
                            </div>
                          </div>

                        </div>

                        {/* Interactive Chart & Balances comparisons */}
                        <AnalyticsCharts 
                          customers={customers} 
                          milkEntries={milkEntries} 
                          expenseEntries={expenseEntries} 
                          settings={settings} 
                        />

                        {/* Main Customer List Ledger Workspace card */}
                        <div className="bg-[#111114] rounded-2xl shadow-sm border border-slate-800 p-6 space-y-5" id="customer-registry-section">
                          
                          {/* Search, Filter header panel */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <h3 className="text-sm font-bold text-white tracking-tight font-sans">
                                👥 Customers Ledger & Supplier Accounts Registry
                              </h3>
                              <p className="text-xs text-slate-500 font-sans mt-0.5">
                                Search supplier names, toggle cattle types, or audit current due balances
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                setEditCustomer(null);
                                setShowCustomerModal(true);
                              }}
                              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1 self-stretch sm:self-auto justify-center"
                              id="btn-register-new-customer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Register Customer</span>
                            </button>
                          </div>

                          {/* Inputs toolbar selection row */}
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                              <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by farmer name, mobile number, or village address..."
                                className="w-full bg-[#16161a] border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                id="input-search-customers"
                              />
                            </div>

                            {/* Breed tabs choices */}
                            <div className="inline-flex rounded-xl border border-slate-850 p-0.5 bg-[#16161a] text-xs text-slate-400 self-stretch sm:self-auto">
                              {[
                                { id: 'all', text: 'All Breeds' },
                                { id: 'cow', text: '🐄 Cow' },
                                { id: 'buffalo', text: '🐃 Buffalo' },
                                { id: 'mix', text: '🌿 Mix' },
                              ].map((tab) => (
                                <button
                                  key={tab.id}
                                  onClick={() => setBreedFilter(tab.id as any)}
                                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                    breedFilter === tab.id
                                      ? 'bg-slate-800 text-white shadow-xs font-semibold'
                                      : 'hover:text-slate-200 text-slate-500'
                                  }`}
                                >
                                  {tab.text}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Grid lists rendered */}
                          {filteredCustomers.length === 0 ? (
                            <div className="p-16 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
                              <Users className="w-10 h-10 text-slate-600 stroke-1 mx-auto mb-2" />
                              No registered customers match your active name or breed filter query.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" id="customers-cards-grid">
                              {filteredCustomers.map((cust) => {
                                const stats = customerListBalances[cust.id] || { milkTotal: 0, expenseTotal: 0, unpaidMilkTotal: 0, unpaidExpenseTotal: 0 };
                                const netPayable = stats.unpaidMilkTotal - stats.unpaidExpenseTotal;

                                return (
                                  <div
                                    key={cust.id}
                                    className="bg-[#16161a] hover:bg-slate-900 p-5 rounded-2xl border border-slate-805 hover:border-sky-500/30 transition-all shadow-sm shrink-0 flex flex-col justify-between group cursor-pointer"
                                    onClick={() => setSelectedCustId(cust.id)}
                                  >
                                    <div className="space-y-3.5">
                                      {/* Card header */}
                                      <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2.5">
                                          <span className="text-2xl bg-[#0e0e11] p-1.5 rounded-xl block border border-slate-850">
                                            {cust.milkType === 'cow' ? '🐄' : cust.milkType === 'buffalo' ? '🐃' : '🌿'}
                                          </span>
                                          <div>
                                            <h4 className="font-bold text-white tracking-tight text-xs group-hover:text-sky-450 transition-colors">
                                              {cust.name}
                                            </h4>
                                            <span className="text-[9px] text-slate-500 font-semibold tracking-wider font-mono">
                                              ID: {cust.id.toUpperCase()}
                                            </span>
                                          </div>
                                        </div>

                                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase leading-none ${
                                          cust.status === 'active'
                                            ? 'bg-emerald-500/10 text-emerald-405 border border-emerald-500/20'
                                            : 'bg-rose-500/10 text-rose-405 border border-rose-500/20'
                                        }`}>
                                          {cust.status === 'active' ? 'Active' : 'Stopped'}
                                        </span>
                                      </div>

                                      {/* Quick details */}
                                      <div className="space-y-1 text-[11px] text-slate-400">
                                        <p className="flex items-center gap-1.5 font-mono">
                                          <Phone className="w-3.5 h-3.5 text-slate-600" />
                                          <span>+91 {cust.phone}</span>
                                        </p>
                                        <p className="flex items-center gap-1.5 truncate">
                                          <MapPin className="w-3.5 h-3.5 text-slate-600" />
                                          <span className="truncate">{cust.address}</span>
                                        </p>
                                      </div>
                                    </div>

                                    {/* Calculated Balance row inside card */}
                                    <div className="border-t border-slate-850 pt-3.5 mt-4 flex justify-between items-center bg-[#111114] p-2.5 -m-5 mt-4 rounded-b-2xl">
                                      <div>
                                        <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider block">Net Ledger Due</span>
                                        <span className="text-xs font-bold font-mono text-sky-450 mt-0.5 block">
                                          {settings.currency}
                                          {netPayable.toLocaleString()}
                                        </span>
                                      </div>

                                      <div className="flex gap-1 font-sans">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditCustomer(cust);
                                            setShowCustomerModal(true);
                                          }}
                                          className="p-1 px-2.5 bg-slate-800 text-slate-350 border border-slate-750 rounded-lg text-[10px] hover:text-white hover:bg-slate-700 cursor-pointer font-semibold transition-colors"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedCustId(cust.id);
                                          }}
                                          className="p-1 px-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg text-[10px] cursor-pointer font-bold transition-all flex items-center gap-1"
                                        >
                                          Statement →
                                        </button>
                                      </div>
                                    </div>

                                  </div>
                                );
                              })}
                            </div>
                          )}

                        </div>
                      </div>
                    )}

                    {/* CHOICE C: MILK DELIVERIES HISTORICAL LOG VIEW */}
                    {activeTab === 'delivery' && (
                      <div className="bg-[#111114] rounded-2xl border border-slate-800 p-6 space-y-6" id="delivery-workspace-tab">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-5">
                          <div>
                            <h2 className="text-lg font-black font-sans text-white tracking-tight flex items-center gap-2">
                              🥛 Daily Milk Collection Ledger Book
                            </h2>
                            <p className="text-xs text-slate-500 font-sans mt-0.5">
                              Add daily records, measure FAT/SNF readings, and cross-reference values
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              setEditMilk(null);
                              setShowMilkModal(true);
                            }}
                            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                            id="btn-log-milk-delivery-tab"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Log Milk Delivery</span>
                          </button>
                        </div>

                        {/* Logs list table rendering */}
                        <div className="overflow-x-auto border border-slate-800 rounded-xl">
                          {milkEntries.length === 0 ? (
                            <div className="p-16 text-center text-slate-500 text-xs">
                              No milk records have been saved into the dairy logs yet.
                            </div>
                          ) : (
                            <table className="w-full text-left text-xs border-collapse font-sans">
                              <thead>
                                <tr className="bg-[#16161a] text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[8.5px]">
                                  <th className="p-3">Collection Date</th>
                                  <th className="p-3">Shift</th>
                                  <th className="p-3">Supplier Name</th>
                                  <th className="p-3 text-right">FAT %</th>
                                  <th className="p-3 text-right">SNF %</th>
                                  <th className="p-3 text-right">Weight</th>
                                  <th className="p-3 text-right">Calculated Rate</th>
                                  <th className="p-3 text-right">Gross Credit Amount</th>
                                  <th className="p-3 text-center">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-900 font-mono">
                                {milkEntries.slice(0, 100).map((log) => {
                                  const cust = customers.find((c) => c.id === log.customerId);
                                  return (
                                    <tr key={log.id} className="hover:bg-slate-800/10 text-[11px] border-b border-slate-900/60 text-slate-350">
                                      <td className="p-3 text-slate-300 font-sans font-medium">{log.date}</td>
                                      <td className="p-3 font-sans">
                                        <div className="flex items-center gap-1.5">
                                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                            log.shift === 'morning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25'
                                          }`}>
                                            {log.shift === 'morning' ? '☀️ Morn' : '🌙 Eve'}
                                          </span>
                                          {log.status === 'paid' ? (
                                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8.5px] font-black border border-emerald-500/20 tracking-wider">PAID</span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 rounded bg-amber-500/5 text-amber-500/50 text-[8.5px] font-bold border border-amber-505/10 tracking-wider">DUE</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-3 font-sans font-bold text-white">
                                        {cust ? cust.name : 'Unknown Customer'}
                                      </td>
                                      <td className="p-3 text-right text-slate-400">{log.fat ? `${log.fat}%` : '-'}</td>
                                      <td className="p-3 text-right text-slate-400">{log.snf ? `${log.snf}%` : '-'}</td>
                                      <td className="p-3 text-right text-slate-200 font-semibold">
                                        {log.weight.toFixed(1)} {settings.weightUnit}
                                      </td>
                                      <td className="p-3 text-right text-slate-405 font-mono">
                                        {settings.currency}
                                        {log.rate.toFixed(2)}
                                      </td>
                                      <td className="p-3 text-right text-emerald-400 font-bold text-xs">
                                        {settings.currency}
                                        {log.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="p-3 text-center space-x-2 font-sans font-semibold">
                                        <button
                                          onClick={() => {
                                            setEditMilk(log);
                                            setShowMilkModal(true);
                                          }}
                                          className="text-sky-400 hover:text-sky-305 hover:underline cursor-pointer"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteMilkEntry(log.id)}
                                          className="text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>

                      </div>
                    )}

                    {/* CHOICE D: LEDGER EXPENSES WORKSPACE TAB VIEW */}
                    {activeTab === 'expenses' && (
                      <div className="bg-[#111114] rounded-2xl border border-slate-800 p-6 space-y-6" id="expenses-workspace-tab">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-5">
                          <div>
                            <h2 className="text-lg font-black font-sans text-white tracking-tight flex items-center gap-2">
                              🌾 Cattle Feed store & Advances Debit Book
                            </h2>
                            <p className="text-xs text-slate-500 font-sans mt-0.5">
                              Record wheat bran, mustard cake feed purchases, calcium tonics, or cash advance loans
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              setEditExpense(null);
                              setShowExpenseModal(true);
                            }}
                            className="px-4 py-2 bg-rose-500 hover:bg-rose-450   text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                            id="btn-log-expense-tab"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add store Log / Advance</span>
                          </button>
                        </div>

                        {/* Table logs */}
                        <div className="overflow-x-auto border border-slate-800 rounded-xl">
                          {expenseEntries.length === 0 ? (
                            <div className="p-16 text-center text-slate-500 text-xs">
                              No store feed logs or advances have been debited into the books.
                            </div>
                          ) : (
                            <table className="w-full text-left text-xs border-collapse font-sans">
                              <thead>
                                <tr className="bg-[#16161a] text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[8.5px]">
                                  <th className="p-3">Purchase Date</th>
                                  <th className="p-3">Category</th>
                                  <th className="p-3">Customer Account</th>
                                  <th className="p-3">Item Note details</th>
                                  <th className="p-3 text-right">Debit Cost Amount</th>
                                  <th className="p-3 text-center">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-900 font-mono">
                                {expenseEntries.map((exp) => {
                                  const cust = customers.find((c) => c.id === exp.customerId);
                                  return (
                                    <tr key={exp.id} className="hover:bg-slate-800/10 text-[11px] border-b border-slate-900/60 text-slate-350">
                                      <td className="p-3 text-slate-300 font-sans font-medium">{exp.date}</td>
                                      <td className="p-3 font-sans">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold leading-none ${
                                            exp.category === 'feed' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                            exp.category === 'medicine' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                            exp.category === 'advance' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                            'bg-slate-800 text-slate-400'
                                          }`}>
                                            {exp.category === 'feed' ? '🌾 Feed bag' : exp.category === 'medicine' ? '💊 Medicine' : exp.category === 'advance' ? '💵 Advance' : '⚙️ Other'}
                                          </span>
                                          {exp.status === 'paid' ? (
                                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8.5px] font-black border border-emerald-500/20 tracking-wider">PAID</span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 rounded bg-amber-500/5 text-amber-500/50 text-[8.5px] font-bold border border-amber-505/10 tracking-wider">DUE</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-3 font-sans font-bold text-white">
                                        {cust ? cust.name : 'Unknown Account'}
                                      </td>
                                      <td className="p-3 font-sans font-medium text-slate-400 max-w-xs truncate">{exp.description}</td>
                                      <td className="p-3 text-right text-rose-455 font-bold text-xs">
                                        {settings.currency}
                                        {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="p-3 text-center space-x-2 font-sans font-semibold">
                                        <button
                                          onClick={() => {
                                            setEditExpense(exp);
                                            setShowExpenseModal(true);
                                          }}
                                          className="text-sky-400 hover:text-sky-300 hover:underline cursor-pointer"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteExpense(exp.id)}
                                          className="text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>

                      </div>
                    )}

                    {/* CHOICE E: SETTLEMENT BILLING AND INVOICES VIEW PORT */}
                    {activeTab === 'billing' && (
                      <BillingReport
                        customers={customers}
                        milkEntries={milkEntries}
                        expenseEntries={expenseEntries}
                        settings={settings}
                        onSettleEntries={handleSettleEntries}
                        onUnsettleEntries={handleUnsettleEntries}
                      />
                    )}

                    {/* CHOICE F: CONFIG SETTINGS AND BACKUPS DETAILS */}
                    {activeTab === 'settings' && (
                      <SettingsPanel
                        settings={settings}
                        onSaveSettings={syncSettings}
                        onResetDatabase={handleResetDatabase}
                        onPurgeAllData={handlePurgeAllData}
                        onImportDatabase={handleImportDatabase}
                        onExportDatabase={handleExportDatabase}
                      />
                    )}

                    {/* CHOICE G: AI RECEIPT SLIP SCANNER */}
                    {activeTab === 'ai-scan' && (
                      <AiScanner
                        customers={customers}
                        settings={settings}
                        onSaveMilkEntry={handleSaveMilkEntry}
                        triggerToast={triggerToast}
                        onNavigateToTab={(tab) => setActiveTab(tab)}
                      />
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

          </div>
        </main>
      </div>

      {// --------------------------------------------------
       // POPUP DIALOGS - CONDITION INJECTORS
       // --------------------------------------------------
      }
      {showCustomerModal && (
        <CustomerForm
          editCustomer={editCustomer}
          onSaveCustomer={handleSaveCustomer}
          onClose={() => {
            setShowCustomerModal(false);
            setEditCustomer(null);
          }}
        />
      )}

      {showMilkModal && (
        <MilkEntryForm
          customers={customers}
          settings={settings}
          onSaveEntry={handleSaveMilkEntry}
          onClose={() => {
            setShowMilkModal(false);
            setEditMilk(null);
          }}
          editEntry={editMilk}
        />
      )}

      {showExpenseModal && (
        <ExpenseForm
          customers={customers}
          settings={settings}
          onSaveExpense={handleSaveExpense}
          onClose={() => {
            setShowExpenseModal(false);
            setEditExpense(null);
          }}
          editExpense={editExpense}
        />
      )}

    </div>
  );
}
