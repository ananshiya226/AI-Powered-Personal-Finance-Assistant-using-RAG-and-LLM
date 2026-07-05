import fs from "fs";
import path from "path";
import bcryptjs from "bcryptjs";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  monthlySalary: number;
  salaryCreditDate: number; // 1 to 31
  preferredCurrency: string; // USD, EUR, INR, GBP, etc.
}

export interface Expense {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: string;
  description: string;
  paymentMethod: string; // Cash, Card, UPI, Net Banking, etc.
  billImage?: string; // Base64 or placeholder URL
}

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface MonthlyReport {
  id: string;
  userId: string;
  month: string; // YYYY-MM
  totalSalary: number;
  totalExpenses: number;
  remainingAmount: number;
  savingsPercentage: number;
  highestExpenseCategory: string;
  dailySpendingTrend: { date: string; amount: number }[];
  weeklyComparison: { week: string; amount: number }[];
  top10Expenses: Expense[];
  budgetUtilization: number; // percentage
  expenseBreakdown: { category: string; amount: number; percentage: number }[];
  generatedAt: string;
}

export interface MonthlyStatistics {
  id: string;
  userId: string;
  month: string; // YYYY-MM
  category: string;
  totalAmount: number;
}

export interface AIRecommendation {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  title: string;
  text: string;
  category?: string;
  actionItem?: string;
  potentialSavings?: number;
}

export interface NotificationLog {
  id: string;
  userId: string;
  date: string; // ISO String
  title: string;
  message: string;
  type: "alert" | "advice" | "reminder" | "summary" | "general";
  read: boolean;
}

export interface RAGDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
}

export interface DocumentEmbedding {
  id: string;
  documentId: string;
  vector: number[];
}

interface DatabaseSchema {
  users: User[];
  userProfiles: UserProfile[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  monthlyReports: MonthlyReport[];
  monthlyStatistics: MonthlyStatistics[];
  aiRecommendations: AIRecommendation[];
  notificationLogs: NotificationLog[];
  ragDocuments: RAGDocument[];
  documentEmbeddings: DocumentEmbedding[];
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: "1", name: "Food", icon: "Utensils", color: "#EC4899" }, // Pinkish
  { id: "2", name: "Grocery", icon: "ShoppingCart", color: "#F43F5E" },
  { id: "3", name: "Rent", icon: "Home", color: "#D946EF" },
  { id: "4", name: "Fuel", icon: "Fuel", color: "#A855F7" },
  { id: "5", name: "Electricity", icon: "Zap", color: "#8B5CF6" },
  { id: "6", name: "Water", icon: "Droplet", color: "#6366F1" },
  { id: "7", name: "Internet", icon: "Wifi", color: "#3B82F6" },
  { id: "8", name: "Entertainment", icon: "Film", color: "#06B6D4" },
  { id: "9", name: "Shopping", icon: "ShoppingBag", color: "#14B8A6" },
  { id: "10", name: "Medical", icon: "HeartPulse", color: "#10B981" },
  { id: "11", name: "Education", icon: "GraduationCap", color: "#F59E0B" },
  { id: "12", name: "Travel", icon: "Plane", color: "#EF4444" },
  { id: "13", name: "EMI", icon: "CreditCard", color: "#6B7280" },
  { id: "14", name: "Investment", icon: "TrendingUp", color: "#10B981" },
  { id: "15", name: "Miscellaneous", icon: "HelpCircle", color: "#9CA3AF" },
];

const DEFAULT_RAG_DOCUMENTS: RAGDocument[] = [
  {
    id: "rag_1",
    title: "The 50/30/20 Budgeting Rule",
    category: "Budgeting",
    tags: ["budgeting", "savings", "planning"],
    content: `The 50/30/20 rule is an intuitive and simple budgeting method to help you manage your money effectively. It splits your after-tax monthly income into three main spending categories:
1. 50% for Needs: This includes absolute essentials that you must pay to survive and work, such as rent/mortgage, utilities, basic groceries, health insurance, transportation, and minimum loan payments.
2. 30% for Wants: This is discretionary spending on things that are nice to have but not essential. Examples include dining out, entertainment, shopping, hobbies, subscription services (Netflix, Spotify), and luxury travel.
3. 20% for Savings and Debt Paydown: This portion goes toward building an emergency fund, investing for retirement (like SIPs, stocks, or mutual funds), and making extra payments on high-interest debt to clear it faster.
By maintaining these ratios, you ensure you are always saving for the future while maintaining a comfortable lifestyle.`
  },
  {
    id: "rag_2",
    title: "Building a 3-to-6 Month Emergency Fund",
    category: "Savings",
    tags: ["savings", "emergency-fund", "safety"],
    content: `An emergency fund is a stash of money set aside to cover financial surprises or emergencies. These surprises can include sudden medical emergencies, car breakdown expenses, urgent home repairs, or unexpected job losses.
How much do you need?
Most financial planners recommend saving three to six months' worth of living expenses. If your monthly essential needs (rent, utilities, food) total $2,000, your target emergency fund should be between $6,000 and $12,000.
Where should you keep it?
The fund must be kept in a highly liquid and safe account, separate from your daily checking account. Good options include High-Yield Savings Accounts (HYSA) or liquid mutual funds, where your money can earn reasonable interest while being instantly accessible when an emergency strikes.`
  },
  {
    id: "rag_3",
    title: "Understanding Systematic Investment Plans (SIP)",
    category: "Investment",
    tags: ["investment", "sip", "wealth-building"],
    content: `A Systematic Investment Plan (SIP) is an investment route offered by mutual funds where you invest a fixed amount of money at regular intervals (usually monthly) instead of making a one-time lump-sum investment.
Benefits of SIP:
1. Rupee Cost Averaging: You buy more units when market prices are low and fewer units when prices are high. This averages out the purchase price over time and reduces the risk of market timing.
2. Power of Compounding: Investing regularly over a long period allows you to earn interest on your interest, leading to exponential wealth creation over 5, 10, or 20 years.
3. Financial Discipline: Since the amount is auto-debited on a fixed date (ideally just after your salary credit date), it cultivates a habit of saving first and spending later.`
  },
  {
    id: "rag_4",
    title: "How to Detect and Eliminate Unnecessary Expenses",
    category: "Expense Control",
    tags: ["expenses", "saving", "discretionary"],
    content: `Detecting and cutting unnecessary expenses is the fastest way to boost your savings rate without increasing your income. Follow these key steps:
1. Audit Subscriptions: List all streaming, gaming, fitness, and software subscriptions. Identify any you haven't used in the past 30 days and cancel them immediately.
2. Limit Food Delivery & Coffee Runs: Dining out and ordering food delivery are often the highest discretionary costs. Try cooking at home more often and limit dining out to weekends.
3. Implement the 24-Hour Rule: For non-essential shopping items, wait 24 hours before completing the purchase. This cooling-off period eliminates impulsive buys.
4. Switch to Generic Brands: Buy store brands for groceries and household goods instead of expensive brand names; they are often identical in quality but cost 20-30% less.`
  },
  {
    id: "rag_5",
    title: "The Envelope Budgeting Method",
    category: "Budgeting",
    tags: ["budgeting", "cash", "expense-control"],
    content: `Envelope budgeting is a highly disciplined system for tracking and controlling discretionary spending.
How it works:
1. Identify your high-spending discretionary categories, like Groceries, Dining Out, Entertainment, and Shopping.
2. Set a strict budget for each category for the month.
3. Withdraw that exact amount in physical cash or allocate it to virtual dedicated cards/accounts.
4. Place the cash/allocation into labeled envelopes for each category.
5. Once the envelope is empty, you cannot spend any more in that category until the next month. This physical or strict visual constraint makes it impossible to overspend.`
  },
  {
    id: "rag_6",
    title: "Zero-Based Budgeting",
    category: "Budgeting",
    tags: ["budgeting", "advanced", "savings"],
    content: `Zero-Based Budgeting (ZBB) is a budgeting technique where every single dollar or rupee of your monthly income is allocated to a specific category, so that your income minus expenses/savings equals exactly zero.
Unlike traditional budgeting where you spend first and save what remains, Zero-Based Budgeting forces you to justify and assign a job to every unit of currency before the month starts.
Formula: Income - Expenses - Savings - Debt Payments = 0
For example, if you earn $4,000:
- Rent: $1,200
- Groceries: $400
- Utilities: $200
- SIP Investment: $800
- Emergency Savings: $400
- Wants/Dining: $600
- Debt Paydown: $400
Sum = $4,000. Remaining unallocated = $0. This ensures complete awareness and accountability for where every cent goes.`
  },
  {
    id: "rag_7",
    title: "Understanding Government Savings Schemes & Secure Instruments",
    category: "Investment",
    tags: ["investment", "savings-schemes", "low-risk"],
    content: `For conservative investors or individuals building baseline wealth, government-backed saving schemes offer high security and guaranteed returns.
Key Secure Instruments:
1. Recurring Deposits (RD): A bank product where you deposit a fixed sum monthly for a fixed term (e.g., 12 months) and earn a fixed interest rate.
2. Public Provident Fund (PPF) / National Pension Scheme (NPS): Long-term retirement accounts with tax benefits and compounding interest.
3. Certificates of Deposit (CD) or Treasury Bills: Short-to-medium-term instruments backed by government credit, ideal for storing cash that you'll need in 1-2 years.`
  }
];

class JSONDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = {
      users: [],
      userProfiles: [],
      expenses: [],
      expenseCategories: DEFAULT_CATEGORIES,
      monthlyReports: [],
      monthlyStatistics: [],
      aiRecommendations: [],
      notificationLogs: [],
      ragDocuments: DEFAULT_RAG_DOCUMENTS,
      documentEmbeddings: [],
    };
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_PATH)) {
        const fileContent = fs.readFileSync(DB_PATH, "utf8");
        const parsed = JSON.parse(fileContent);
        this.data = {
          ...this.data,
          ...parsed,
          // Ensure default values exist
          expenseCategories: parsed.expenseCategories?.length ? parsed.expenseCategories : DEFAULT_CATEGORIES,
          ragDocuments: parsed.ragDocuments?.length ? parsed.ragDocuments : DEFAULT_RAG_DOCUMENTS,
        };
      } else {
        this.save();
      }
    } catch (error) {
      console.error("Failed to load database. Using empty fallback:", error);
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), "utf8");
    } catch (error) {
      console.error("Failed to save database:", error);
    }
  }

  // --- Users & Profiles ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(email: string, passwordPlain: string): User {
    const id = "usr_" + Math.random().toString(36).substring(2, 11);
    const passwordHash = bcryptjs.hashSync(passwordPlain, 10);
    const newUser: User = { id, email, passwordHash };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  public getProfileByUserId(userId: string): UserProfile | undefined {
    return this.data.userProfiles.find((p) => p.userId === userId);
  }

  public upsertProfile(userId: string, name: string, monthlySalary: number, salaryCreditDate: number, preferredCurrency: string): UserProfile {
    let profile = this.data.userProfiles.find((p) => p.userId === userId);
    if (profile) {
      profile.name = name;
      profile.monthlySalary = monthlySalary;
      profile.salaryCreditDate = salaryCreditDate;
      profile.preferredCurrency = preferredCurrency;
    } else {
      profile = {
        id: "prof_" + Math.random().toString(36).substring(2, 11),
        userId,
        name,
        monthlySalary,
        salaryCreditDate,
        preferredCurrency,
      };
      this.data.userProfiles.push(profile);
    }
    this.save();
    return profile;
  }

  // --- Expenses ---
  public getExpensesByUserId(userId: string): Expense[] {
    return this.data.expenses.filter((e) => e.userId === userId);
  }

  public createExpense(userId: string, expenseData: Omit<Expense, "id" | "userId">): Expense {
    const id = "exp_" + Math.random().toString(36).substring(2, 11);
    const newExpense: Expense = {
      id,
      userId,
      ...expenseData,
    };
    this.data.expenses.push(newExpense);
    this.save();
    return newExpense;
  }

  public updateExpense(id: string, userId: string, updatedData: Partial<Omit<Expense, "id" | "userId">>): Expense | undefined {
    const index = this.data.expenses.findIndex((e) => e.id === id && e.userId === userId);
    if (index === -1) return undefined;
    this.data.expenses[index] = {
      ...this.data.expenses[index],
      ...updatedData,
    };
    this.save();
    return this.data.expenses[index];
  }

  public deleteExpense(id: string, userId: string): boolean {
    const index = this.data.expenses.findIndex((e) => e.id === id && e.userId === userId);
    if (index === -1) return false;
    this.data.expenses.splice(index, 1);
    this.save();
    return true;
  }

  // --- Categories ---
  public getCategories(): ExpenseCategory[] {
    return this.data.expenseCategories;
  }

  // --- Monthly Reports ---
  public getMonthlyReports(userId: string): MonthlyReport[] {
    return this.data.monthlyReports.filter((r) => r.userId === userId);
  }

  public saveMonthlyReport(report: MonthlyReport) {
    const index = this.data.monthlyReports.findIndex((r) => r.userId === report.userId && r.month === report.month);
    if (index !== -1) {
      this.data.monthlyReports[index] = report;
    } else {
      this.data.monthlyReports.push(report);
    }
    this.save();
  }

  // --- Monthly Statistics ---
  public getStatistics(userId: string, month: string): MonthlyStatistics[] {
    return this.data.monthlyStatistics.filter((s) => s.userId === userId && s.month === month);
  }

  public updateStatistics(userId: string, month: string, statistics: Omit<MonthlyStatistics, "id" | "userId" | "month">[]) {
    // Clear old monthly stats
    this.data.monthlyStatistics = this.data.monthlyStatistics.filter(
      (s) => !(s.userId === userId && s.month === month)
    );
    // Add new ones
    statistics.forEach((stat) => {
      this.data.monthlyStatistics.push({
        id: "stat_" + Math.random().toString(36).substring(2, 11),
        userId,
        month,
        ...stat,
      });
    });
    this.save();
  }

  // --- AI Recommendations ---
  public getRecommendationsByUserId(userId: string): AIRecommendation[] {
    return this.data.aiRecommendations.filter((r) => r.userId === userId);
  }

  public saveRecommendations(userId: string, recommendations: Omit<AIRecommendation, "id" | "userId">[]) {
    // Clear old ones
    this.data.aiRecommendations = this.data.aiRecommendations.filter((r) => r.userId !== userId);
    // Add new ones
    recommendations.forEach((rec) => {
      this.data.aiRecommendations.push({
        id: "rec_" + Math.random().toString(36).substring(2, 11),
        userId,
        ...rec,
      });
    });
    this.save();
  }

  // --- Notifications ---
  public getNotificationsByUserId(userId: string): NotificationLog[] {
    return this.data.notificationLogs.filter((n) => n.userId === userId);
  }

  public createNotification(userId: string, notification: Omit<NotificationLog, "id" | "userId" | "read" | "date">): NotificationLog {
    const id = "notif_" + Math.random().toString(36).substring(2, 11);
    const newNotif: NotificationLog = {
      id,
      userId,
      date: new Date().toISOString(),
      read: false,
      ...notification,
    };
    this.data.notificationLogs.unshift(newNotif); // latest first
    // Limit to 50 notifications per user
    const userNotifs = this.data.notificationLogs.filter((n) => n.userId === userId);
    if (userNotifs.length > 50) {
      const toKeep = userNotifs.slice(0, 50);
      this.data.notificationLogs = this.data.notificationLogs.filter((n) => n.userId !== userId).concat(toKeep);
    }
    this.save();
    return newNotif;
  }

  public markNotificationAsRead(id: string, userId: string): boolean {
    const notif = this.data.notificationLogs.find((n) => n.id === id && n.userId === userId);
    if (notif) {
      notif.read = true;
      this.save();
      return true;
    }
    return false;
  }

  public markAllNotificationsAsRead(userId: string) {
    this.data.notificationLogs.forEach((n) => {
      if (n.userId === userId) {
        n.read = true;
      }
    });
    this.save();
  }

  // --- RAG Documents ---
  public getRAGDocuments(): RAGDocument[] {
    return this.data.ragDocuments;
  }
}

export const db = new JSONDatabase();
