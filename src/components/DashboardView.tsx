import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Wallet, DollarSign, ArrowUpRight, ArrowDownRight, Percent, 
  AlertTriangle, RefreshCw, Sparkles, Play, ChevronRight, ArrowRight
} from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from "recharts";
import { Expense, UserProfile, NotificationLog, AIRecommendation } from "../types.js";

interface DashboardViewProps {
  profile: UserProfile | null;
  expenses: Expense[];
  notifications: NotificationLog[];
  recommendations: AIRecommendation[];
  onTriggerScheduler: () => Promise<void>;
  schedulerLogs: string[];
  isSchedulerRunning: boolean;
  onNavigateToTab: (tab: string) => void;
  currencySymbol: string;
}

export default function DashboardView({
  profile,
  expenses,
  notifications,
  recommendations,
  onTriggerScheduler,
  schedulerLogs,
  isSchedulerRunning,
  onNavigateToTab,
  currencySymbol,
}: DashboardViewProps) {
  const [showLogs, setShowLogs] = useState(false);

  const totalSalary = profile?.monthlySalary || 0;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBalance = totalSalary - totalExpenses;
  const savingsPercentage = totalSalary > 0 ? Math.max(0, (remainingBalance / totalSalary) * 100) : 0;
  const budgetUtilization = totalSalary > 0 ? (totalExpenses / totalSalary) * 100 : 0;

  // Group by category for PieChart
  const categoryMap: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });

  const categoryColors: Record<string, string> = {
    Food: "#EC4899", // pink-500
    Grocery: "#F43F5E", // rose-500
    Rent: "#D946EF", // fuchsia-500
    Fuel: "#A855F7", // purple-500
    Electricity: "#8B5CF6", // violet-500
    Water: "#6366F1", // indigo-500
    Internet: "#3B82F6", // blue-500
    Entertainment: "#06B6D4", // cyan-500
    Shopping: "#14B8A6", // teal-500
    Medical: "#10B981", // emerald-500
    Education: "#F59E0B", // amber-500
    Travel: "#EF4444", // red-500
    EMI: "#6B7280", // gray-500
    Investment: "#10B981", // emerald-500
    Miscellaneous: "#9CA3AF", // gray-400
  };

  const pieData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
    color: categoryColors[name] || "#C084FC",
  })).sort((a, b) => b.value - a.value);

  const recentTransactions = expenses.slice(0, 5);
  const activeAlerts = notifications.filter((n) => n.type === "alert" && !n.read);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 p-8 text-white overflow-hidden shadow-xl shadow-violet-950/20">
        <div className="relative z-10 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium backdrop-blur-md border border-white/10"
          >
            <Sparkles className="h-3.5 w-3.5 text-pink-300 animate-pulse" />
            AI-Powered Wealth Engine
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 font-display text-3xl font-extrabold tracking-tight md:text-4xl"
          >
            Welcome Back, {profile?.name || "Wealth Tracker"}!
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-2 text-purple-100 text-sm md:text-base font-medium"
          >
            Your dynamic personal finance cockpit. Monitor daily logs, build secure savings, and chat with your expert RAG financial advisor.
          </motion.p>
        </div>

        {/* Decorative Circles */}
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute right-1/4 -top-12 h-36 w-36 rounded-full bg-pink-500/10 blur-xl" />
      </div>

      {/* Budget Warning Alert (If remaining <= 20%) */}
      {budgetUtilization >= 80 && (
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-start gap-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200 shadow-sm backdrop-blur-md"
        >
          <div className="rounded-full bg-rose-500/20 p-2.5 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="h-6 w-6 animate-bounce" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="font-display font-bold text-rose-100">⚠️ Strict Budget Alert: {remainingBalance <= 0 ? "Salary Exhausted" : "Low Balance Warning"}</h3>
            <p className="text-sm text-rose-300 font-medium">
              Only {savingsPercentage.toFixed(1)}% of your monthly salary remains.
              {activeAlerts.length > 0 ? ` ${activeAlerts[0].message}` : " Your spending is running significantly higher than standard ratios. Please head to the AI Advisor or Savings tabs to review immediate cutting options."}
            </p>
            <div className="pt-2 flex gap-3">
              <button 
                onClick={() => onNavigateToTab("advisor")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition cursor-pointer"
              >
                Ask AI Advisor
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => onNavigateToTab("reports")}
                className="text-xs font-bold text-rose-300 hover:text-rose-100 hover:underline cursor-pointer"
              >
                View Category Breakdown
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Salary */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-xl text-white">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">Monthly Salary</span>
            <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-2 text-violet-400">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="font-mono font-bold text-2xl tracking-tight text-white">
              {currencySymbol}{totalSalary.toLocaleString()}
            </span>
            <p className="mt-1 text-xs font-medium text-slate-400">
              Credit Date: Day {profile?.salaryCreditDate || 1} of month
            </p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-xl text-white">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">Total Spent</span>
            <div className="rounded-lg bg-pink-500/10 border border-pink-500/20 p-2 text-pink-400">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="font-mono font-bold text-2xl tracking-tight text-pink-400">
              {currencySymbol}{totalExpenses.toLocaleString()}
            </span>
            <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div 
                className="h-full bg-pink-500 transition-all duration-500" 
                style={{ width: `${Math.min(100, budgetUtilization)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs font-semibold text-slate-400">
              Budget Used: {budgetUtilization.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Remaining Balance */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-xl text-white">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">Remaining Balance</span>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-emerald-400">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className={`font-mono font-bold text-2xl tracking-tight ${remainingBalance < 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {currencySymbol}{remainingBalance.toLocaleString()}
            </span>
            <p className="mt-1 text-xs font-medium text-slate-400">
              Status: {remainingBalance < 0 ? "Overdraft Limit" : remainingBalance <= totalSalary * 0.2 ? "Budget Alert" : "Healthy Zone"}
            </p>
          </div>
        </div>

        {/* Savings Percentage */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-xl text-white">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">Savings Percentage</span>
            <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2 text-indigo-400">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="font-mono font-bold text-2xl tracking-tight text-indigo-400">
              {savingsPercentage.toFixed(1)}%
            </span>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Target savings rate: 20%+
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Charts + Recent */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Expense distribution Pie Chart */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl lg:col-span-2 text-white">
          <h3 className="font-display font-bold text-white text-lg">Expense Distribution by Category</h3>
          <p className="text-xs text-slate-400 font-semibold mt-1">Calculated in real-time from active daily transaction logs</p>
          
          <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-6">
            {pieData.length > 0 ? (
              <>
                <div className="h-56 w-full max-w-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
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
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-3.5">
                  {pieData.slice(0, 8).map((cat) => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-200">{cat.name}</p>
                        <p className="font-mono text-xs font-semibold text-slate-400">
                          {currencySymbol}{cat.value} ({((cat.value / totalExpenses) * 100).toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  ))}
                  {pieData.length > 8 && (
                    <button 
                      onClick={() => onNavigateToTab("reports")}
                      className="text-xs font-bold text-pink-400 hover:text-pink-300 hover:underline flex items-center col-span-2 cursor-pointer"
                    >
                      +{pieData.length - 8} more categories. View full breakdown
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-56 w-full flex-col items-center justify-center text-center text-slate-400">
                <Wallet className="h-10 w-10 text-slate-500 stroke-1 mb-2" />
                <p className="text-sm font-semibold">No expenses recorded yet.</p>
                <button 
                  onClick={() => onNavigateToTab("expenses")}
                  className="mt-2 text-xs font-bold text-pink-400 hover:text-pink-300 hover:underline cursor-pointer"
                >
                  Log first transaction
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl flex flex-col justify-between text-white">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-display font-bold text-white text-lg">Recent Ledger</h3>
              <button 
                onClick={() => onNavigateToTab("expenses")}
                className="text-xs font-bold text-pink-400 hover:text-pink-300 hover:underline cursor-pointer"
              >
                Log New
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((e) => (
                  <div key={e.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 text-white"
                        style={{ backgroundColor: categoryColors[e.category] || "#C084FC" }}
                      >
                        {e.category.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-200">{e.description}</p>
                        <p className="text-xs font-medium text-slate-400">{e.date} • {e.paymentMethod}</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-sm text-white">
                      -{currencySymbol}{e.amount}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                  No logged transactions.
                </div>
              )}
            </div>
          </div>

          {recentTransactions.length > 0 && (
            <button 
              onClick={() => onNavigateToTab("expenses")}
              className="mt-6 flex items-center justify-center gap-1 w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-xs font-bold text-slate-300 transition cursor-pointer"
            >
              View Full Transaction History
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* RAG Suggestions Preview Banner */}
      {recommendations.length > 0 && (
        <div className="rounded-2xl bg-violet-950/20 border border-violet-500/20 backdrop-blur-md p-6 text-white">
          <div className="flex flex-col md:flex-row gap-5 items-start justify-between">
            <div className="space-y-1.5 w-full">
              <div className="flex items-center gap-1.5">
                <div className="bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full p-1.5">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h4 className="font-display font-bold text-white text-base">Personalized AI Savings Recommendations</h4>
              </div>
              <p className="text-xs text-violet-300 font-semibold">Based on your spending patterns we detected potential savings of {currencySymbol}{recommendations.reduce((sum, r) => sum + (r.potentialSavings || 0), 0)}!</p>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendations.slice(0, 3).map((rec, i) => (
                  <div key={rec.id || i} className="bg-white/5 border border-white/10 rounded-xl p-4 shadow-xs flex flex-col justify-between">
                    <div>
                      <h5 className="font-bold text-white text-sm">{rec.title}</h5>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">{rec.text}</p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="font-bold text-pink-400 font-mono">+{currencySymbol}{rec.potentialSavings} saved</span>
                      <span className="font-semibold text-violet-300">Action: {rec.actionItem}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Scheduler Simulation Controls */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h3 className="font-display font-bold text-white text-lg">Daily Scheduler Simulator</h3>
            <p className="text-xs text-slate-400 font-semibold mt-1">The scheduler updates statistics, recalculates remaining salaries, and generates AI advice</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowLogs(!showLogs)}
              className="px-4 py-2 text-xs font-bold text-slate-300 rounded-xl border border-white/10 hover:bg-white/10 transition cursor-pointer"
            >
              {showLogs ? "Hide Console" : "View Console Output"}
            </button>
            <button 
              onClick={onTriggerScheduler}
              disabled={isSchedulerRunning}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90 text-white px-4 py-2 text-xs font-bold transition shadow-lg shadow-violet-500/20 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSchedulerRunning ? "animate-spin" : ""}`} />
              {isSchedulerRunning ? "Running Calculations..." : "Trigger Scheduler"}
            </button>
          </div>
        </div>

        {/* Logs terminal console */}
        {(showLogs || isSchedulerRunning) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="mt-4 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 p-4 font-mono text-[11px] text-pink-400 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-slate-500 text-xs font-bold">
              <span>LEDGER CRON JOB SIMULATOR STATUS</span>
              <span className="text-emerald-400 animate-pulse">● SIMULATION CONNECTED</span>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {schedulerLogs.length > 0 ? (
                schedulerLogs.map((log, i) => (
                  <div key={i} className="leading-relaxed">
                    <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> {log}
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic">No schedules triggered yet in this session. Click "Trigger Scheduler" above to run immediate calculations.</div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
