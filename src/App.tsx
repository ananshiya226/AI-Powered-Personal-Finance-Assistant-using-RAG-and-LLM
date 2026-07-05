import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Wallet, CreditCard, Brain, FileBarChart, BookOpen, 
  User, Bell, LogOut, ArrowRight, Check, AlertCircle, RefreshCw, X
} from "lucide-react";
import { api, clearAuthToken, getAuthToken } from "./api.js";
import { Expense, UserProfile, NotificationLog, AIRecommendation, RAGDocument, MonthlyReport } from "./types.js";

// Sub Components
import DashboardView from "./components/DashboardView.js";
import ExpensesView from "./components/ExpensesView.js";
import AdvisorView from "./components/AdvisorView.js";
import ReportsView from "./components/ReportsView.js";
import ProfileView from "./components/ProfileView.js";

export default function App() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string } | null>(null);

  // Auth Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("3000");
  const [salaryCreditDate, setSalaryCreditDate] = useState("1");
  const [preferredCurrency, setPreferredCurrency] = useState("USD");
  const [authError, setAuthError] = useState("");

  // Loaded database state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [ragDocuments, setRagDocuments] = useState<RAGDocument[]>([]);
  const [reports, setReports] = useState<MonthlyReport[]>([]);

  // Navigation state
  const [activeTab, setActiveTab] = useState("dashboard");

  // Notification dropdown
  const [showNotifications, setShowNotifications] = useState(false);

  // Scheduler triggering states
  const [isSchedulerRunning, setIsSchedulerRunning] = useState(false);
  const [schedulerLogs, setSchedulerLogs] = useState<string[]>([]);

  // Category list
  const [categories, setCategories] = useState<any[]>([]);

  // Initial load checking
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      loadUserData();
    }
    // Load static category presets on boot
    api.getCategories().then((cats) => setCategories(cats)).catch(console.error);
  }, []);

  const loadUserData = async () => {
    try {
      const me = await api.me();
      setCurrentUser({
        id: me.id,
        email: me.email,
        name: me.profile?.name || "User",
      });
      setIsAuthenticated(true);
      
      // Load all corresponding tables
      const [profileData, expensesData, notificationsData, recommendationsData, ragDocsData, reportsData] = await Promise.all([
        api.getProfile(),
        api.getExpenses(),
        api.getNotifications(),
        api.getRecommendations(),
        api.getRAGDocuments(),
        api.getReports(),
      ]);

      setProfile(profileData);
      setExpenses(expensesData);
      setNotifications(notificationsData);
      setRecommendations(recommendationsData);
      setRagDocuments(ragDocsData);
      setReports(reportsData);
    } catch (err) {
      console.error("Session load failed, signing out:", err);
      handleLogout();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await api.login(email, password);
      setCurrentUser(res.user);
      setIsAuthenticated(true);
      await loadUserData();
    } catch (err: any) {
      setAuthError(err.message || "Invalid credentials.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await api.signup(
        email,
        password,
        name,
        Number(monthlySalary),
        Number(salaryCreditDate),
        preferredCurrency
      );
      setCurrentUser(res.user);
      setIsAuthenticated(true);
      await loadUserData();
    } catch (err: any) {
      setAuthError(err.message || "Signup failed.");
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setProfile(null);
    setExpenses([]);
    setNotifications([]);
    setRecommendations([]);
    setReports([]);
    setActiveTab("dashboard");
  };

  const handleAddExpense = async (payload: any) => {
    try {
      await api.addExpense(payload);
      // Reload relevant states
      const [newExpenses, newNotifs, newRecs, newReports] = await Promise.all([
        api.getExpenses(),
        api.getNotifications(),
        api.getRecommendations(),
        api.getReports(),
      ]);
      setExpenses(newExpenses);
      setNotifications(newNotifs);
      setRecommendations(newRecs);
      setReports(newReports);
    } catch (err) {
      console.error("Failed to add expense:", err);
    }
  };

  const handleEditExpense = async (id: string, payload: any) => {
    try {
      await api.editExpense(id, payload);
      const [newExpenses, newNotifs, newRecs, newReports] = await Promise.all([
        api.getExpenses(),
        api.getNotifications(),
        api.getRecommendations(),
        api.getReports(),
      ]);
      setExpenses(newExpenses);
      setNotifications(newNotifs);
      setRecommendations(newRecs);
      setReports(newReports);
    } catch (err) {
      console.error("Failed to edit expense:", err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await api.deleteExpense(id);
      const [newExpenses, newNotifs, newRecs, newReports] = await Promise.all([
        api.getExpenses(),
        api.getNotifications(),
        api.getRecommendations(),
        api.getReports(),
      ]);
      setExpenses(newExpenses);
      setNotifications(newNotifs);
      setRecommendations(newRecs);
      setReports(newReports);
    } catch (err) {
      console.error("Failed to delete expense:", err);
    }
  };

  const handleUpdateProfile = async (uName: string, salary: number, date: number, curr: string) => {
    try {
      await api.updateProfile(uName, salary, date, curr);
      await loadUserData(); // Refresh profile state and recalculated reports
    } catch (err) {
      console.error("Failed to update profile:", err);
    }
  };

  const handleSendMessage = async (text: string) => {
    return api.chatAdvisor(text);
  };

  const handleTriggerScheduler = async () => {
    setIsSchedulerRunning(true);
    setSchedulerLogs(["Initiating nightly cron calculation loop...", "Fetching transaction ratios..."]);
    try {
      const res = await api.triggerScheduler();
      setSchedulerLogs(res.logs);
      
      // Reload states
      const [profileData, expensesData, notificationsData, recommendationsData, reportsData] = await Promise.all([
        api.getProfile(),
        api.getExpenses(),
        api.getNotifications(),
        api.getRecommendations(),
        api.getReports(),
      ]);

      setProfile(profileData);
      setExpenses(expensesData);
      setNotifications(notificationsData);
      setRecommendations(recommendationsData);
      setReports(reportsData);
    } catch (err: any) {
      setSchedulerLogs((prev) => [...prev, `[ERROR] Calculation failed: ${err.message || err}`]);
    } finally {
      setIsSchedulerRunning(false);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await api.markNotificationsRead();
      const updatedNotifs = await api.getNotifications();
      setNotifications(updatedNotifs);
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  const handleMarkSingleNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      const updatedNotifs = await api.getNotifications();
      setNotifications(updatedNotifs);
    } catch (err) {
      console.error("Failed to update notification:", err);
    }
  };

  // Extract currency symbol
  const getCurrencySymbol = (code: string) => {
    switch (code) {
      case "INR": return "₹";
      case "EUR": return "€";
      case "GBP": return "£";
      case "JPY": return "¥";
      case "CAD": return "C$";
      case "AUD": return "A$";
      default: return "$";
    }
  };
  const currencySymbol = profile ? getCurrencySymbol(profile.preferredCurrency) : "$";

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f0720] flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-100">
        {/* Glow visual accents */}
        <div className="absolute top-0 inset-x-0 h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px]"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-pink-600/20 rounded-full blur-[120px]"></div>
        </div>

        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8 shadow-2xl overflow-hidden relative"
        >
          {/* Top visual accent bar */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />

          <div className="text-center space-y-2 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-500 to-pink-500 p-0.5 flex items-center justify-center text-white mx-auto shadow-lg shadow-violet-500/20">
              <div className="bg-[#120822] rounded-xl h-full w-full flex items-center justify-center text-xl">
                🌸
              </div>
            </div>
            <h1 className="font-display text-2xl font-extrabold text-white tracking-tight">Serene Wealth AI</h1>
            <p className="text-xs font-semibold text-slate-400">RAG-Grounded Private Financial Assistant</p>
          </div>

          <form onSubmit={authMode === "login" ? handleLogin : handleSignup} className="space-y-4">
            {authError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-bold text-rose-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authMode === "signup" && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Your Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-white placeholder-slate-400 focus:border-violet-500/50 outline-none transition"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                required
                placeholder="e.g., you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-white placeholder-slate-400 focus:border-violet-500/50 outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Password</label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-white placeholder-slate-400 focus:border-violet-500/50 outline-none transition"
              />
            </div>

            {authMode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Monthly Salary</label>
                    <input 
                      type="number" 
                      required
                      value={monthlySalary}
                      onChange={(e) => setMonthlySalary(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm font-bold text-white placeholder-slate-400 focus:border-violet-500/50 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Salary Credit Day</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      max="31"
                      value={salaryCreditDate}
                      onChange={(e) => setSalaryCreditDate(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm font-bold text-white placeholder-slate-400 focus:border-violet-500/50 outline-none transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Preferred Currency</label>
                  <select
                    value={preferredCurrency}
                    onChange={(e) => setPreferredCurrency(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#120822] px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-violet-500/50 transition"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="AUD">AUD (A$)</option>
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <span>{authMode === "login" ? "Verify Secure Login" : "Initialize Asset Profile"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => {
                setAuthMode(authMode === "login" ? "signup" : "login");
                setAuthError("");
              }}
              className="text-xs font-bold text-pink-400 hover:text-pink-300 hover:underline"
            >
              {authMode === "login" ? "New to Serene Wealth? Setup profile" : "Already have secure portfolio? Authenticate login"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0720] text-slate-100 flex flex-col font-sans relative overflow-hidden print:bg-white print:text-gray-900">
      {/* Background glowing blurry circles */}
      <div className="absolute top-0 inset-x-0 h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-pink-600/20 rounded-full blur-[120px]"></div>
      </div>

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-2xl border-b border-white/10 px-6 py-4 flex items-center justify-between print:hidden">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 p-0.5 flex items-center justify-center text-white font-extrabold shadow-md shadow-violet-500/20">
            🌸
          </div>
          <div>
            <h1 className="font-display text-base font-extrabold tracking-tight text-white leading-none">Serene Wealth</h1>
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">AI Financial Companion</span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-4">
          {/* Notifications Panel */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition relative"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-pink-500 text-white text-[9px] font-extrabold h-4.5 w-4.5 rounded-full flex items-center justify-center border-2 border-[#130925] animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2.5 w-80 bg-[#140b2a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden text-white"
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
                    <span className="font-display font-bold text-sm text-white">System Logs & Alerts</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkNotificationsRead}
                        className="text-[10px] font-bold text-pink-400 hover:text-pink-300 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          onClick={() => handleMarkSingleNotificationRead(notif.id)}
                          className={`p-4 text-xs font-semibold hover:bg-white/5 cursor-pointer transition ${!notif.read ? "bg-white/5 border-l-2 border-pink-500" : ""}`}
                        >
                          <div className="flex items-start justify-between">
                            <p className="font-bold text-slate-100">{notif.title}</p>
                            <span className="text-[8px] text-slate-400 font-semibold">{new Date(notif.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">{notif.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                        All clear! No notifications.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile info */}
          <div className="flex items-center gap-2.5 border-l border-white/10 pl-4">
            <div className="h-8 w-8 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center justify-center font-bold text-xs">
              {currentUser?.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-white leading-none">{currentUser?.name}</p>
              <span className="text-[10px] font-bold text-slate-400">{currentUser?.email}</span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-xl transition ml-2"
              title="Logout session"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex-1 flex flex-col md:flex-row print:bg-white print:p-0">
        {/* Navigation Sidebar (Vertical tabs) */}
        <nav className="w-full md:w-64 bg-white/5 backdrop-blur-2xl border-r border-white/10 p-4 space-y-1.5 flex-shrink-0 print:hidden">
          {[
            { id: "dashboard", label: "Dashboard", icon: Wallet },
            { id: "expenses", label: "Daily Ledger", icon: CreditCard },
            { id: "advisor", label: "AI Advisor Chat", icon: Brain },
            { id: "reports", label: "Financial Reports", icon: FileBarChart },
            { id: "profile", label: "Account Profile", icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowNotifications(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold border transition cursor-pointer ${
                  isActive 
                    ? "bg-white/10 text-white border-white/10 shadow-lg shadow-violet-500/10" 
                    : "text-slate-400 border-transparent hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Viewport Frame */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full print:p-0 print:max-w-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "dashboard" && (
                <DashboardView 
                  profile={profile}
                  expenses={expenses}
                  notifications={notifications}
                  recommendations={recommendations}
                  onTriggerScheduler={handleTriggerScheduler}
                  schedulerLogs={schedulerLogs}
                  isSchedulerRunning={isSchedulerRunning}
                  onNavigateToTab={(tab) => setActiveTab(tab)}
                  currencySymbol={currencySymbol}
                />
              )}

              {activeTab === "expenses" && (
                <ExpensesView 
                  expenses={expenses}
                  categories={categories}
                  onAddExpense={handleAddExpense}
                  onEditExpense={handleEditExpense}
                  onDeleteExpense={handleDeleteExpense}
                  currencySymbol={currencySymbol}
                />
              )}

              {activeTab === "advisor" && (
                <AdvisorView 
                  onSendMessage={handleSendMessage}
                  ragDocuments={ragDocuments}
                  currencySymbol={currencySymbol}
                />
              )}

              {activeTab === "reports" && (
                <ReportsView 
                  reports={reports}
                  profile={profile}
                  currencySymbol={currencySymbol}
                />
              )}

              {activeTab === "profile" && (
                <ProfileView 
                  profile={profile}
                  userEmail={currentUser?.email || ""}
                  onUpdateProfile={handleUpdateProfile}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Footer copyright */}
      <footer className="bg-white/5 backdrop-blur-md border-t border-white/10 py-4 text-center text-[10px] text-slate-500 font-semibold print:hidden flex-shrink-0">
        © 2026 Serene Wealth • Secured RAG Financial Literacy Advisor Engine. Built on React & Gemini.
      </footer>
    </div>
  );
}
