/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Customer, MilkEntry, ExpenseEntry, PricingSettings } from '../types';
import { BarChart3, TrendingUp, DollarSign, Milk, CreditCard, ChevronDown, Award } from 'lucide-react';

interface AnalyticsChartsProps {
  customers: Customer[];
  milkEntries: MilkEntry[];
  expenseEntries: ExpenseEntry[];
  settings: PricingSettings;
}

export default function AnalyticsCharts({
  customers,
  milkEntries,
  expenseEntries,
  settings,
}: AnalyticsChartsProps) {
  const [hoveredBar, setHoveredBar] = useState<{
    customerName: string;
    milkAmount: number;
    expenseAmount: number;
    netAmount: number;
    x: number;
    y: number;
    type: 'milk' | 'expense';
  } | null>(null);

  const [sortBy, setSortBy] = useState<'name' | 'milk' | 'expenses' | 'net'>('milk');
  const [filterPeriod, setFilterPeriod] = useState<'all' | '10' | '20' | '30'>('all');

  // Compute stats based on selected time window
  const filteredData = useMemo(() => {
    const now = new Date('2026-06-11'); // Static reference date (today)
    
    return milkEntries.filter((entry) => {
      if (filterPeriod === 'all') return true;
      const entryDate = new Date(entry.date);
      const diffTime = Math.abs(now.getTime() - entryDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= Number(filterPeriod);
    });
  }, [milkEntries, filterPeriod]);

  const filteredExpenses = useMemo(() => {
    const now = new Date('2026-06-11');
    return expenseEntries.filter((entry) => {
      if (filterPeriod === 'all') return true;
      const entryDate = new Date(entry.date);
      const diffTime = Math.abs(now.getTime() - entryDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= Number(filterPeriod);
    });
  }, [expenseEntries, filterPeriod]);

  // General metrics calculations
  const summaryMetrics = useMemo(() => {
    const totalMilkWeight = filteredData.reduce((acc, curr) => acc + curr.weight, 0);
    const totalMilkAmount = filteredData.reduce((acc, curr) => acc + curr.amount, 0);
    const totalCattleExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const averageFat = filteredData.length > 0 
      ? Number((filteredData.reduce((acc, curr) => acc + curr.fat, 0) / filteredData.length).toFixed(2)) 
      : 0;
    const averageSnf = filteredData.length > 0 
      ? Number((filteredData.reduce((acc, curr) => acc + curr.snf, 0) / filteredData.length).toFixed(2)) 
      : 0;

    return {
      totalMilkWeight,
      totalMilkAmount,
      totalCattleExpenses,
      netPayable: totalMilkAmount - totalCattleExpenses,
      averageFat,
      averageSnf,
    };
  }, [filteredData, filteredExpenses]);

  // Aggregate milk amounts & expenses per customer
  const chartData = useMemo(() => {
    const dataMap: Record<string, { milkAmount: number; expenseAmount: number; customer: Customer }> = {};

    customers.forEach((cust) => {
      dataMap[cust.id] = {
        milkAmount: 0,
        expenseAmount: 0,
        customer: cust,
      };
    });

    filteredData.forEach((entry) => {
      if (dataMap[entry.customerId]) {
        dataMap[entry.customerId].milkAmount += entry.amount;
      }
    });

    filteredExpenses.forEach((entry) => {
      if (dataMap[entry.customerId]) {
        dataMap[entry.customerId].expenseAmount += entry.amount;
      }
    });

    const list = Object.values(dataMap).map((item) => ({
      name: item.customer.name,
      milkAmount: Math.round(item.milkAmount),
      expenseAmount: Math.round(item.expenseAmount),
      netAmount: Math.round(item.milkAmount - item.expenseAmount),
      milkType: item.customer.milkType,
    }));

    // Sort accordingly
    return list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'expenses') return b.expenseAmount - a.expenseAmount;
      if (sortBy === 'net') return b.netAmount - a.netAmount;
      return b.milkAmount - a.milkAmount; // DEFAULT : highest milk amount
    });
  }, [customers, filteredData, filteredExpenses, sortBy]);

  // Dynamic SVG dimension calculations
  const maxYValue = useMemo(() => {
    const highestVal = Math.max(
      ...chartData.map((d) => Math.max(d.milkAmount, d.expenseAmount, 100))
    );
    // Round to next highest easy grid step (e.g. hundreds or thousands)
    const factor = highestVal > 1000 ? 500 : 100;
    return Math.ceil(highestVal / factor) * factor;
  }, [chartData]);

  // SVG parameters
  const height = 300;
  const width = 680;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;
  const graphHeight = height - paddingTop - paddingBottom;
  const graphWidth = width - paddingLeft - paddingRight;

  const barGroupWidth = graphWidth / Math.max(chartData.length, 1);
  const barGap = 6;
  const singleBarWidth = Math.max((barGroupWidth - barGap * 3) / 2, 4);

  return (
    <div className="bg-[#111114] rounded-2xl border border-slate-800 p-6 space-y-6" id="analytics-panel">
      {/* Header section with timeline choices */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-850 pb-5">
        <div>
          <h2 className="text-xl font-bold font-sans text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            Dairy Analytics & Balance Ledger
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-1">
            Compare gross milk amount earnings against customer expenses for settlements
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
          {/* Timeframe choices */}
          <div className="inline-flex rounded-lg border border-slate-800 p-0.5 bg-[#16161a] text-xs font-medium text-slate-400">
            <button
              onClick={() => setFilterPeriod('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filterPeriod === 'all'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                  : 'hover:text-white'
              }`}
              id="btn-period-all"
            >
              All Time
            </button>
            <button
              onClick={() => setFilterPeriod('10')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filterPeriod === '10'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                  : 'hover:text-white'
              }`}
              id="btn-period-10"
            >
              Last 10 Days
            </button>
            <button
              onClick={() => setFilterPeriod('20')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filterPeriod === '20'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                  : 'hover:text-white'
              }`}
              id="btn-period-20"
            >
              Last 20 Days
            </button>
            <button
              onClick={() => setFilterPeriod('30')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filterPeriod === '30'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                  : 'hover:text-white'
              }`}
              id="btn-period-30"
            >
              Last 30 Days
            </button>
          </div>

          {/* Sorting */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none bg-[#16161a] text-slate-300 text-xs font-medium pl-3 pr-8 py-2 rounded-lg border border-slate-805 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              id="chart-sort-by"
            >
              <option value="milk">Sort: Highest Milk</option>
              <option value="expenses">Sort: Highest Expenses</option>
              <option value="net">Sort: Highest Balance</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-550 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-dashboard-cards">
        {/* Milk weight */}
        <div className="bg-[#16161a] p-4 rounded-xl border border-slate-850 relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-550 uppercase tracking-wider block">Milk Weight</span>
            <span className="text-2xl font-bold font-mono text-slate-200 mt-1 block">
              {summaryMetrics.totalMilkWeight.toLocaleString()} <span className="text-sm font-sans font-normal text-slate-500">{settings.weightUnit}</span>
            </span>
          </div>
          <div className="mt-2 text-xs flex justify-between items-center text-slate-500">
            <span>Avg FAT: <strong className="text-slate-300 font-mono">{summaryMetrics.averageFat}%</strong></span>
            <span>SNF: <strong className="text-slate-300 font-mono">{summaryMetrics.averageSnf}%</strong></span>
          </div>
          <div className="absolute right-2 top-2 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
            <Milk className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Gross Milk amount */}
        <div className="bg-[#16161a] p-4 rounded-xl border border-slate-850 relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-550 uppercase tracking-wider block">Milk Value Credit</span>
            <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
              {settings.currency}{summaryMetrics.totalMilkAmount.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Average: {settings.currency}{filteredData.length ? (summaryMetrics.totalMilkAmount / filteredData.length).toFixed(1) : 0} / entry</span>
          </div>
          <div className="absolute right-2 top-2 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-[#16161a] p-4 rounded-xl border border-slate-850 relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-550 uppercase tracking-wider block">Cattle feed & other DB</span>
            <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">
              {settings.currency}{summaryMetrics.totalCattleExpenses.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>Logged expenses: <strong className="text-slate-350 font-medium">{filteredExpenses.length} entries</strong></span>
          </div>
          <div className="absolute right-2 top-2 bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/20">
            <CreditCard className="w-4 h-4 text-rose-455" />
          </div>
        </div>

        {/* Net payable outstanding */}
        <div className="bg-[#16161a] p-4 rounded-xl border border-slate-850 relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-550 uppercase tracking-wider block">Net Payable Due</span>
            <span className="text-2xl font-bold font-mono text-sky-400 mt-1 block">
              {settings.currency}{summaryMetrics.netPayable.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            {summaryMetrics.netPayable >= 0 ? (
              <span className="text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px]">Ready for Settlement</span>
            ) : (
              <span className="text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded text-[10px]">Overdraw Ledger</span>
            )}
          </div>
          <div className="absolute right-2 top-2 bg-sky-500/10 p-1.5 rounded-lg border border-sky-500/20">
            <Award className="w-4 h-4 text-sky-400" />
          </div>
        </div>
      </div>

      {/* Grouped Bar Chart Visualizer */}
      <div className="relative border border-slate-850 rounded-xl bg-[#0e0e11] p-4" id="grouped-bar-container">
        {chartData.length === 0 ? (
          <div className="h-68 flex flex-col justify-center items-center text-slate-550 text-xs">
            <BarChart3 className="w-10 h-10 text-slate-700 stroke-1 mb-2" />
            No records match the selected filters.
          </div>
        ) : (
          <>
            {/* Chart Legend */}
            <div className="flex gap-4 justify-end text-xs font-medium mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 inline-block border border-emerald-700/10"></span>
                <span className="text-slate-405">Milk Amount Credit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-rose-500 inline-block border border-rose-600/10"></span>
                <span className="text-slate-405">Expenses Debit</span>
              </div>
            </div>

            {/* Render direct interactive SVG */}
            <div className="overflow-x-auto scroller-subtle">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[620px]" id="svg-analytics-chart">
                {/* Y-Axis Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                  const yVal = Math.round(maxYValue * ratio);
                  const yPos = height - paddingBottom - ratio * graphHeight;
                  return (
                     <g key={index} opacity={0.6} className="translate-y-[0.5px]">
                      <line
                        x1={paddingLeft}
                        y1={yPos}
                        x2={width - paddingRight}
                        y2={yPos}
                        stroke="#1d2026"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                      />
                      <text
                        x={paddingLeft - 8}
                        y={yPos + 4}
                        textAnchor="end"
                        className="text-[10px] font-mono fill-slate-500 font-medium"
                      >
                        {settings.currency}
                        {yVal}
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis Horizontal baseline */}
                <line
                  x1={paddingLeft}
                  y1={height - paddingBottom}
                  x2={width - paddingRight}
                  y2={height - paddingBottom}
                  stroke="#272a33"
                  strokeWidth={1.5}
                />

                {/* Bars for each customer */}
                {chartData.map((data, xIndex) => {
                  const groupX = paddingLeft + xIndex * barGroupWidth;
                  
                  // Heights based on maximum Y value scale
                  const milkBarHeight = (data.milkAmount / maxYValue) * graphHeight;
                  const expenseBarHeight = (data.expenseAmount / maxYValue) * graphHeight;

                  // Positions (y goes downwards from 0 at top)
                  const milkY = height - paddingBottom - milkBarHeight;
                  const expenseY = height - paddingBottom - expenseBarHeight;

                  const milkBarX = groupX + barGap;
                  const expenseBarX = milkBarX + singleBarWidth + barGap / 2;

                  return (
                    <g key={xIndex}>
                      {/* Grid band hover background indicator */}
                      <rect
                        x={groupX + 2}
                        y={paddingTop - 10}
                        width={barGroupWidth - 4}
                        height={graphHeight + 15}
                        fill="transparent"
                        className="hover:fill-slate-800/10 transition-colors animate-fade-in"
                      />

                      {/* Milk Bar (Emerald Green) */}
                      <rect
                        x={milkBarX}
                        y={milkY}
                        width={singleBarWidth}
                        height={Math.max(milkBarHeight, 2)}
                        rx={3}
                        fill="url(#milkGradient)"
                        stroke="#059669"
                        strokeWidth={0.5}
                        className="transition-all duration-300 cursor-pointer hover:brightness-110"
                        onMouseEnter={(e) => {
                          setHoveredBar({
                            customerName: data.name,
                            milkAmount: data.milkAmount,
                            expenseAmount: data.expenseAmount,
                            netAmount: data.netAmount,
                            x: milkBarX + singleBarWidth / 2,
                            y: milkY,
                            type: 'milk',
                          });
                        }}
                        onMouseLeave={() => setHoveredBar(null)}
                      />

                      {/* Expense Bar (Rose Red/Amber) */}
                      <rect
                        x={expenseBarX}
                        y={expenseY}
                        width={singleBarWidth}
                        height={Math.max(expenseBarHeight, 2)}
                        rx={3}
                        fill="url(#expenseGradient)"
                        stroke="#e11d48"
                        strokeWidth={0.5}
                        className="transition-all duration-300 cursor-pointer hover:brightness-110"
                        onMouseEnter={(e) => {
                          setHoveredBar({
                            customerName: data.name,
                            milkAmount: data.milkAmount,
                            expenseAmount: data.expenseAmount,
                            netAmount: data.netAmount,
                            x: expenseBarX + singleBarWidth / 2,
                            y: expenseY,
                            type: 'expense',
                          });
                        }}
                        onMouseLeave={() => setHoveredBar(null)}
                      />

                      {/* Customer Name Label underneath */}
                      <text
                        x={groupX + barGroupWidth / 2}
                        y={height - paddingBottom + 16}
                        textAnchor="middle"
                        className="text-[9.5px] fill-slate-400 font-sans font-medium"
                      >
                        {data.name.split(' ')[0]} {/* First name to save space */}
                      </text>

                      {/* Milk Type Tag small Indicator */}
                      <text
                        x={groupX + barGroupWidth / 2}
                        y={height - paddingBottom + 27}
                        textAnchor="middle"
                        className="text-[8px] fill-slate-550 uppercase font-mono tracking-wider font-semibold"
                      >
                        {data.milkType === 'cow' ? '🐄 Cow' : data.milkType === 'buffalo' ? '🐃 Buff' : '🌿 Mix'}
                      </text>
                    </g>
                  );
                })}

                {/* SVG Definitions for rich visual gradients */}
                <defs>
                  <linearGradient id="milkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e11d48" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Custom Interactive Tooltip Portal/Box inside layout */}
            {hoveredBar && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(hoveredBar.x / width) * 100}%`,
                  bottom: `${((height - hoveredBar.y) / height) * 100 + 4}%`,
                  transform: 'translateX(-50%)',
                }}
                className="bg-[#0e0e11] border border-slate-800 text-white rounded-xl py-3 px-4 shadow-xl z-10 w-52 pointer-events-none animate-fade-in"
              >
                <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#0e0e11] border-r border-b border-slate-800"></div>
                <p className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-1.5 mb-1.5 truncate text-sans">
                  {hoveredBar.customerName}
                </p>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-400">Milk Credit:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {settings.currency}
                      {hoveredBar.milkAmount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-400">Cattle Feed:</span>
                    <span className="font-mono font-bold text-red-500">
                      {settings.currency}
                      {hoveredBar.expenseAmount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2 border-t border-slate-800 pt-1.5 mt-1 font-semibold">
                    <span className="text-slate-250">Net Payable:</span>
                    <span className={`font-mono font-bold ${hoveredBar.netAmount >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
                      {settings.currency}
                      {hoveredBar.netAmount}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Customer Ledger Balance Sheet table */}
      <div className="border border-slate-850 rounded-xl overflow-hidden bg-[#111114]" id="analytics-ledger-table-container">
        <div className="bg-[#16161a] px-4 py-3 border-b border-slate-850 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-350 uppercase tracking-wider">All Customer ledger settlements</span>
          <span className="text-[10px] bg-slate-800 text-slate-405 px-2 py-0.5 rounded-full font-mono font-bold">
            {chartData.length} active
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-300">
            <thead>
              <tr className="bg-[#111114] text-slate-400 font-semibold border-b border-slate-850 uppercase tracking-wider text-[8.5px]">
                <th className="p-3">Customer Name</th>
                <th className="p-3 text-right">Milk Amount (A)</th>
                <th className="p-3 text-right">Expenses (B)</th>
                <th className="p-3 text-right">Net Due (A - B)</th>
                <th className="p-3 text-center">Settlement Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-sans">
              {chartData.map((data, idx) => (
                <tr key={idx} className="hover:bg-slate-800/10 border-b border-[#16161a] transition-colors">
                  <td className="p-3 font-medium text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    {data.name}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-400 font-semibold">
                    {settings.currency}
                    {data.milkAmount.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-rose-500">
                    {settings.currency}
                    {data.expenseAmount.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-white">
                    {settings.currency}
                    {data.netAmount.toLocaleString()}
                  </td>
                  <td className="p-3 text-center animate-fade-in">
                    {data.netAmount > 0 ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Payable
                      </span>
                    ) : data.netAmount < 0 ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Owed
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/30">
                        Settled
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
