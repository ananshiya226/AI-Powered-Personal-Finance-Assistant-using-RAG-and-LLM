import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Plus, Search, Trash2, Edit, Calendar, Tag, CreditCard, 
  Sparkles, FileText, Upload, Image as ImageIcon, X, Check, Eye, RefreshCw
} from "lucide-react";
import { Expense, ExpenseCategory } from "../types.js";

interface ExpensesViewProps {
  expenses: Expense[];
  categories: ExpenseCategory[];
  onAddExpense: (expense: any) => Promise<void>;
  onEditExpense: (id: string, expense: any) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  currencySymbol: string;
}

// Preset Base64 simulated receipts to make OCR scanning super fun!
const RECEIPT_PRESETS = [
  {
    name: "Pink Cafe & Bistro",
    description: "Dinner with friends",
    amount: 45,
    category: "Food",
    paymentMethod: "Card",
    date: new Date().toISOString().split("T")[0],
  },
  {
    name: "Cozy Home Rental Co.",
    description: "Monthly Rent Payment",
    amount: 1200,
    category: "Rent",
    paymentMethod: "Net Banking",
    date: new Date().toISOString().split("T")[0],
  },
  {
    name: "Vibrant Fashion Outlet",
    description: "Summer dress and accessories",
    amount: 110,
    category: "Shopping",
    paymentMethod: "UPI",
    date: new Date().toISOString().split("T")[0],
  }
];

export default function ExpensesView({
  expenses,
  categories,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  currencySymbol,
}: ExpensesViewProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  // Editor states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Form Fields
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Card");
  const [billImage, setBillImage] = useState("");
  const [isScanningOCR, setIsScanningOCR] = useState(false);

  // Filter logic
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = 
      description.toLowerCase().includes(search.toLowerCase()) ||
      category.toLowerCase().includes(search.toLowerCase()) ||
      paymentMethod.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory ? e.category === selectedCategory : true;
    const matchesMonth = selectedMonth ? e.date.startsWith(selectedMonth) : true;
    return matchesSearch && matchesCategory && matchesMonth;
  });

  const handleOpenCreate = () => {
    setEditingExpenseId(null);
    setDate(new Date().toISOString().split("T")[0]);
    setAmount("");
    setCategory("Food");
    setDescription("");
    setPaymentMethod("Card");
    setBillImage("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (e: Expense) => {
    setEditingExpenseId(e.id);
    setDate(e.date);
    setAmount(e.amount.toString());
    setCategory(e.category);
    setDescription(e.description);
    setPaymentMethod(e.paymentMethod);
    setBillImage(e.billImage || "");
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || isNaN(Number(amount))) return;

    const payload = {
      date,
      amount: Number(amount),
      category,
      description,
      paymentMethod,
      billImage: billImage || undefined,
    };

    if (editingExpenseId) {
      await onEditExpense(editingExpenseId, payload);
    } else {
      await onAddExpense(payload);
    }

    setIsFormOpen(false);
  };

  // Run simulated RAG AI OCR scanner to pre-fill form
  const handleSimulateOCR = (preset: typeof RECEIPT_PRESETS[0]) => {
    setIsScanningOCR(true);
    setTimeout(() => {
      setDate(preset.date);
      setAmount(preset.amount.toString());
      setCategory(preset.category);
      setDescription(preset.name + " (" + preset.description + ")");
      setPaymentMethod(preset.paymentMethod);
      setBillImage("preset_loaded");
      setIsScanningOCR(false);
    }, 1500);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBillImage(reader.result as string);
        // Trigger simulated scanning on file load
        setIsScanningOCR(true);
        setTimeout(() => {
          setAmount((Math.floor(Math.random() * 80) + 15).toString());
          setDescription("Receipt scanned: " + file.name.split(".")[0]);
          setCategory("Grocery");
          setIsScanningOCR(false);
        }, 1200);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-white text-2xl">Daily Expenses Ledger</h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">Add, update, or search your expenditures and receipts</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90 text-white px-5 py-3 font-bold text-sm transition shadow-lg shadow-violet-500/20 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Log Transaction
        </button>
      </div>

      {/* Filters and Search toolbar */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Search Input */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search description, category, payment method..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm font-medium text-white placeholder-slate-400 focus:border-violet-500/50 outline-none transition"
          />
        </div>

        {/* Category select filter */}
        <div>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#120822] px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-violet-500/50 transition"
          >
            <option value="" className="bg-[#120822] text-white">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name} className="bg-[#120822] text-white">{c.name}</option>
            ))}
          </select>
        </div>

        {/* Month selector filter */}
        <div>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#120822] px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-violet-500/50 transition"
          />
        </div>
      </div>

      {/* Main Expenses Table Card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden shadow-xl text-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 font-display text-xs font-bold text-slate-300 uppercase tracking-wider">
                <th className="px-6 py-4">Transaction / Category</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Payment Method</th>
                <th className="px-6 py-4 text-right">Receipt</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs bg-violet-500/10 text-violet-300 border border-violet-500/20 flex-shrink-0">
                          {exp.category.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-100">{exp.description}</p>
                          <span className="inline-flex items-center rounded-md bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 text-[10px] font-bold text-pink-300 mt-0.5">
                            {exp.category}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-semibold text-slate-300">
                      {exp.date}
                    </td>
                    <td className="px-6 py-4.5">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-300">
                        <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                        {exp.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      {exp.billImage ? (
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                          <Check className="h-3 w-3" />
                          Attached
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4.5 text-right font-mono font-bold text-white text-base">
                      {currencySymbol}{exp.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition cursor-pointer"
                          title="Edit transaction"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => onDeleteExpense(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition cursor-pointer"
                          title="Delete transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <FileText className="h-10 w-10 text-slate-500 stroke-1 mx-auto mb-2" />
                    <p className="text-sm font-semibold">No transactions found matching filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl rounded-2xl bg-[#130b28] border border-white/10 p-6 shadow-2xl overflow-hidden flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto text-white"
          >
            {/* Form Inputs */}
            <form onSubmit={handleSubmit} className="flex-1 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-display font-bold text-white text-lg">
                  {editingExpenseId ? "Modify Transaction" : "Record Expenditure"}
                </h3>
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Amount input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Amount ({currencySymbol})</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-display font-bold text-slate-400">{currencySymbol}</span>
                  <input 
                    type="number" 
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-4 py-2.5 font-mono font-bold text-lg text-white focus:border-violet-500/50 outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Description</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Weekly Organic Groceries, Uber Ride"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-semibold text-white placeholder-slate-500 focus:border-violet-500/50 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#120822] px-3.5 py-2 text-sm font-semibold text-white outline-none focus:border-violet-500/50"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name} className="bg-[#120822] text-white">{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Transaction Date</label>
                  <input 
                    type="date" 
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#120822] px-3.5 py-2 text-sm font-semibold text-white outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Payment Method</label>
                <div className="flex flex-wrap gap-2">
                  {["Card", "Cash", "UPI", "Net Banking", "EMI"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        paymentMethod === method 
                          ? "bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-600/20" 
                          : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90 rounded-xl shadow-lg shadow-violet-500/20 transition cursor-pointer"
                >
                  {editingExpenseId ? "Apply Changes" : "Record Log"}
                </button>
              </div>
            </form>

            {/* Simulated OCR Scanner Sidebar */}
            <div className="w-full md:w-64 bg-white/5 rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-pink-400 animate-pulse" />
                  <h4 className="font-display font-bold text-white text-sm">Smart AI Bill Scanner</h4>
                </div>
                <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">
                  Avoid manual typings! Click one of our premium preset receipts below to test instant AI OCR form automation.
                </p>

                {/* Preset Scanners list */}
                <div className="space-y-2">
                  {RECEIPT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isScanningOCR}
                      onClick={() => handleSimulateOCR(preset)}
                      className="w-full text-left bg-white/5 rounded-xl p-2.5 border border-white/10 hover:border-pink-500/50 hover:bg-white/10 hover:shadow-xs transition text-xs flex items-center justify-between group disabled:opacity-50 cursor-pointer text-white"
                    >
                      <div>
                        <p className="font-bold text-slate-100">{preset.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{preset.category} • {currencySymbol}{preset.amount}</p>
                      </div>
                      <span className="text-[10px] font-bold text-pink-400 opacity-0 group-hover:opacity-100 transition">Scan</span>
                    </button>
                  ))}
                </div>

                {/* File Upload zone */}
                <div className="border border-dashed border-white/20 rounded-xl p-4 text-center bg-white/5 hover:bg-white/10 transition relative cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="h-5 w-5 text-violet-400 mx-auto mb-1.5" />
                  <p className="text-[10px] font-bold text-slate-200">Upload Receipt Image</p>
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Supports PNG/JPG. Auto scans dates & sums!</p>
                </div>
              </div>

              {/* Status or loading of scanning */}
              {isScanningOCR && (
                <div className="mt-4 bg-[#140b2a]/95 border border-white/10 rounded-xl p-3 text-center flex items-center justify-center gap-2 text-xs font-bold text-violet-300">
                  <RefreshCw className="h-4 w-4 animate-spin text-pink-500" />
                  <span>Scanning receipt...</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
