export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  monthlySalary: number;
  salaryCreditDate: number;
  preferredCurrency: string;
}

export interface Expense {
  id: string;
  userId: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  paymentMethod: string;
  billImage?: string;
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
  month: string;
  totalSalary: number;
  totalExpenses: number;
  remainingAmount: number;
  savingsPercentage: number;
  highestExpenseCategory: string;
  dailySpendingTrend: { date: string; amount: number }[];
  weeklyComparison: { week: string; amount: number }[];
  top10Expenses: Expense[];
  budgetUtilization: number;
  expenseBreakdown: { category: string; amount: number; percentage: number }[];
  generatedAt: string;
}

export interface AIRecommendation {
  id: string;
  userId: string;
  date: string;
  title: string;
  text: string;
  category?: string;
  actionItem?: string;
  potentialSavings?: number;
}

export interface NotificationLog {
  id: string;
  userId: string;
  date: string;
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
