import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { 
  Download, Printer, FileText, Calendar, Wallet, TrendingUp, 
  ArrowUpRight, Award, Trophy, Bookmark, List, ChevronRight
} from "lucide-react";
import { MonthlyReport, UserProfile } from "../types.js";
import { api } from "../api.js";

interface ReportsViewProps {
  reports: MonthlyReport[];
  profile: UserProfile | null;
  currencySymbol: string;
}

export default function ReportsView({
  reports,
  profile,
  currencySymbol,
}: ReportsViewProps) {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [activeReport, setActiveReport] = useState<MonthlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Default to current month on load
  useEffect(() => {
    if (reports.length > 0 && !selectedMonth) {
      const sorted = [...reports].sort((a, b) => b.month.localeCompare(a.month));
      setSelectedMonth(sorted[0].month);
    }
  }, [reports]);

  // Fetch report when month changes
  useEffect(() => {
    if (selectedMonth) {
      setIsLoading(true);
      api.getReportForMonth(selectedMonth)
        .then((rep) => {
          setActiveReport(rep);
        })
        .catch((err) => {
          console.error("Failed to load report:", err);
          setActiveReport(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [selectedMonth]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:bg-white print:p-8">
      {/* Selector and Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="font-display font-bold text-white text-2xl">Financial Statement Reports</h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">Export, review, or analyze monthly statistics</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Month Dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#120822] px-3.5 py-2.5 text-xs font-bold text-white outline-none focus:border-violet-500/50 cursor-pointer"
          >
            {reports.length > 0 ? (
              reports.map((r) => (
                <option key={r.month} value={r.month} className="bg-[#120822] text-white">{r.month}</option>
              ))
            ) : (
              <option value="" className="bg-[#120822] text-white">No Reports Saved</option>
            )}
          </select>

          <button
            onClick={handlePrint}
            disabled={!activeReport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-bold text-slate-300 transition disabled:opacity-50 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-sm font-semibold text-slate-400">
          <TrendingUp className="h-6 w-6 text-violet-400 animate-bounce mr-2" />
          Analyzing financial metrics and rendering charts...
        </div>
      ) : activeReport ? (
        <div className="space-y-6">
          {/* Report Top Summary Header */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl relative overflow-hidden text-white">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-3xl bg-violet-500/10 flex items-center justify-center text-violet-300">
              <FileText className="h-8 w-8" />
            </div>

            <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-full">
              STATEMENT PERIOD: {activeReport.month}
            </span>
            <h3 className="font-display font-bold text-white text-xl mt-3">Monthly Financial Summary</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Generated securely on {new Date(activeReport.generatedAt).toLocaleDateString()}</p>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-2 gap-4 mt-6 md:grid-cols-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-xs font-semibold text-slate-400">Total Salary Credit</p>
                <p className="font-mono font-bold text-lg text-white mt-1">{currencySymbol}{activeReport.totalSalary.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">Total Expenditures</p>
                <p className="font-mono font-bold text-lg text-pink-400 mt-1">{currencySymbol}{activeReport.totalExpenses.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">Net Surplus / Savings</p>
                <p className="font-mono font-bold text-lg text-emerald-400 mt-1">{currencySymbol}{activeReport.remainingAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">Savings Percentage</p>
                <p className="font-mono font-bold text-lg text-violet-300 mt-1">{activeReport.savingsPercentage.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Daily trend LineChart */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl text-white">
              <h4 className="font-display font-bold text-white text-base mb-4">Daily Spending Trend</h4>
              <div className="h-64 w-full">
                {activeReport.dailySpendingTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activeReport.dailySpendingTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9ca3af" 
                        fontSize={10} 
                        tickFormatter={(str) => str.split("-")[2] || str}
                      />
                      <YAxis stroke="#9ca3af" fontSize={10} />
                      <Tooltip 
                        formatter={(value) => `${currencySymbol}${value}`}
                        contentStyle={{ 
                          borderRadius: 12, 
                          border: "1px solid rgba(255,255,255,0.1)", 
                          background: "rgba(20, 10, 40, 0.95)", 
                          boxShadow: "0 4px 12px rgba(0,0,0,0.5)", 
                          fontFamily: "Inter",
                          color: "#fff"
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#ec4899" 
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#ec4899" }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-bold text-slate-500">No daily logs recorded.</div>
                )}
              </div>
            </div>

            {/* Weekly barchart */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl text-white">
              <h4 className="font-display font-bold text-white text-base mb-4">Weekly Spending Analysis</h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeReport.weeklyComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="week" stroke="#9ca3af" fontSize={10} />
                    <YAxis stroke="#9ca3af" fontSize={10} />
                    <Tooltip 
                      formatter={(value) => `${currencySymbol}${value}`}
                      contentStyle={{ 
                        borderRadius: 12, 
                        border: "1px solid rgba(255,255,255,0.1)", 
                        background: "rgba(20, 10, 40, 0.95)", 
                        boxShadow: "0 4px 12px rgba(0,0,0,0.5)", 
                        fontFamily: "Inter",
                        color: "#fff"
                      }}
                    />
                    <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Categories and Top 10 list */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Breakdown progress bars */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl lg:col-span-1 text-white">
              <h4 className="font-display font-bold text-white text-base mb-4">Category Breakdown</h4>
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {activeReport.expenseBreakdown.length > 0 ? (
                  activeReport.expenseBreakdown.map((item) => (
                    <div key={item.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200">{item.category}</span>
                        <span className="font-mono font-semibold text-slate-400">
                          {currencySymbol}{item.amount.toLocaleString()} ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-pink-500 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-xs font-semibold text-slate-500">No categories logged.</div>
                )}
              </div>
            </div>

            {/* Top 10 items table */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl lg:col-span-2 text-white">
              <h4 className="font-display font-bold text-white text-base mb-4">Top expensive logs</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 pb-3 text-xs font-bold text-slate-300 uppercase tracking-wider">
                      <th className="py-2">Description</th>
                      <th className="py-2">Category</th>
                      <th className="py-2">Date</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-semibold text-slate-200">
                    {activeReport.top10Expenses.length > 0 ? (
                      activeReport.top10Expenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-white/5 transition">
                          <td className="py-3 font-bold text-slate-100">{exp.description}</td>
                          <td className="py-3">
                            <span className="bg-pink-500/10 border border-pink-500/20 text-pink-300 px-2 py-0.5 rounded-md font-bold text-[10px]">
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-3 font-medium text-slate-400">{exp.date}</td>
                          <td className="py-3 text-right font-mono font-bold text-white">
                            {currencySymbol}{exp.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-slate-500">No logs found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-12 text-center text-slate-400 shadow-xl">
          <FileText className="h-12 w-12 text-slate-500 stroke-1 mx-auto mb-2" />
          <h3 className="font-display font-bold text-white text-lg">No reports compiled yet</h3>
          <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto mt-1">
            We require at least 2 expense entries in the current calendar month before calculating a detailed statement report. Click scheduler to build immediately!
          </p>
        </div>
      )}
    </div>
  );
}
