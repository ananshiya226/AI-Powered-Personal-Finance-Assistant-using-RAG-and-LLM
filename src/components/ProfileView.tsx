import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  User, Mail, Wallet, Calendar, Sparkles, Key, Check, 
  HelpCircle, CreditCard, Award, ShieldCheck, RefreshCw
} from "lucide-react";
import { UserProfile } from "../types.js";

interface ProfileViewProps {
  profile: UserProfile | null;
  onUpdateProfile: (name: string, salary: number, date: number, currency: string) => Promise<void>;
  userEmail: string;
}

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "INR", symbol: "₹" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" },
  { code: "CAD", symbol: "C$" },
  { code: "AUD", symbol: "A$" },
];

export default function ProfileView({
  profile,
  onUpdateProfile,
  userEmail,
}: ProfileViewProps) {
  const [name, setName] = useState(profile?.name || "");
  const [salary, setSalary] = useState(profile?.monthlySalary ? profile.monthlySalary.toString() : "");
  const [creditDate, setCreditDate] = useState(profile?.salaryCreditDate ? profile.salaryCreditDate.toString() : "1");
  const [currency, setCurrency] = useState(profile?.preferredCurrency || "USD");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !salary || isNaN(Number(salary)) || isNaN(Number(creditDate))) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await onUpdateProfile(
        name,
        Number(salary),
        Number(creditDate),
        currency
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left Column Profile Summary card */}
      <div className="md:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center space-y-4 text-white">
        <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-violet-600 to-pink-500 p-1 flex items-center justify-center text-white font-display text-3xl font-extrabold shadow-lg shadow-violet-950/40">
          <div className="bg-[#130b28] rounded-full h-full w-full flex items-center justify-center text-violet-400">
            {name ? name.substring(0, 2).toUpperCase() : "U"}
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="font-display font-bold text-white text-lg">{name || "Wealth Tracker"}</h3>
          <p className="text-xs text-slate-400 font-semibold">{userEmail}</p>
        </div>

        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 uppercase tracking-wider">
          <ShieldCheck className="h-3.5 w-3.5" />
          Active Account
        </span>

        {/* Info card block */}
        <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2.5 text-xs font-semibold text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Current Salary:</span>
            <span className="font-mono font-bold text-violet-300">{profile?.preferredCurrency || "USD"} {profile?.monthlySalary.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Salary Date:</span>
            <span className="font-bold text-violet-300">Day {profile?.salaryCreditDate || 1}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Currency:</span>
            <span className="font-bold text-violet-300">{profile?.preferredCurrency || "USD"}</span>
          </div>
        </div>
      </div>

      {/* Right Column Profile Editor Form */}
      <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl text-white">
        <div className="border-b border-white/10 pb-4 mb-5 flex items-center gap-2">
          <User className="h-5 w-5 text-violet-400" />
          <div>
            <h3 className="font-display font-bold text-white text-base">Account Configuration</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Customize your registration details and dashboard currency symbols</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" /> Full Name
              </label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50"
              />
            </div>

            {/* Email (Disabled) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-slate-500" /> Email Address
              </label>
              <input 
                type="email" 
                disabled
                value={userEmail}
                className="w-full rounded-xl border border-white/5 bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-slate-500 outline-none cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monthly Salary */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5 text-slate-400" /> Monthly Salary Sum
              </label>
              <input 
                type="number" 
                required
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm font-bold text-white outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50"
              />
            </div>

            {/* Salary Credit Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" /> Salary Credit Date (Day 1 - 31)
              </label>
              <input 
                type="number" 
                required
                min="1"
                max="31"
                value={creditDate}
                onChange={(e) => setCreditDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm font-bold text-white outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50"
              />
            </div>
          </div>

          {/* Preferred Currency selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5 text-slate-400" /> Preferred Currency Accent
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
              {CURRENCIES.map((curr) => (
                <button
                  key={curr.code}
                  type="button"
                  onClick={() => setCurrency(curr.code)}
                  className={`py-3.5 px-1 rounded-xl text-xs font-extrabold border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                    currency === curr.code 
                      ? "bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-600/20" 
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <span className="font-mono text-base">{curr.symbol}</span>
                  <span className="text-[10px] tracking-wider uppercase">{curr.code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Update Action Button */}
          <div className="pt-4 flex items-center justify-end border-t border-white/10 gap-3">
            {saveSuccess && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 animate-fade-in">
                <Check className="h-4 w-4" />
                Profile updated successfully!
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90 text-white px-5 py-3 font-bold text-xs transition shadow-lg shadow-violet-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              {isSaving ? "Saving Config..." : "Save Account Configuration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
