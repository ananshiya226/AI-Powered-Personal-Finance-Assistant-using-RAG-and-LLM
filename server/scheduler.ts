import { db, MonthlyReport, MonthlyStatistics } from "./db.js";
import { generateBudgetAlerts, generateMonthlyAnalysis } from "./rag.js";

/**
 * Runs the nightly analytical calculation for a user's account.
 * Updates current month reports, statistics, checks budget alerts, and inserts notifications.
 */
export async function runDailySchedulerForUser(userId: string): Promise<{ success: boolean; logs: string[] }> {
  const logs: string[] = [];
  const profile = db.getProfileByUserId(userId);
  if (!profile) {
    return { success: false, logs: ["User profile not found. Please complete profile setup."] };
  }

  logs.push(`Running daily scheduler for user: ${profile.name} (ID: ${userId})`);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  
  // 1. Fetch expenses for the current month
  const allExpenses = db.getExpensesByUserId(userId);
  const currentMonthExpenses = allExpenses.filter((e) => e.date.startsWith(currentMonth));
  
  const totalSalary = profile.monthlySalary;
  const totalExpenses = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingAmount = totalSalary - totalExpenses;
  const savingsPercentage = totalSalary > 0 ? Math.max(0, (remainingAmount / totalSalary) * 100) : 0;
  const budgetUtilization = totalSalary > 0 ? (totalExpenses / totalSalary) * 100 : 0;

  logs.push(`Calculated totals: Salary = ${totalSalary}, Spent = ${totalExpenses}, Remaining = ${remainingAmount} (${savingsPercentage.toFixed(1)}% savings)`);

  // 2. Group expenses by category
  const categories: Record<string, number> = {};
  currentMonthExpenses.forEach((e) => {
    categories[e.category] = (categories[e.category] || 0) + e.amount;
  });

  const expenseBreakdown = Object.entries(categories).map(([cat, amt]) => ({
    category: cat,
    amount: amt,
    percentage: totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0,
  }));

  const highestCategory = expenseBreakdown.length > 0
    ? expenseBreakdown.sort((a, b) => b.amount - a.amount)[0].category
    : "None";

  // 3. Calculate daily trend
  const dailyTrendMap: Record<string, number> = {};
  currentMonthExpenses.forEach((e) => {
    dailyTrendMap[e.date] = (dailyTrendMap[e.date] || 0) + e.amount;
  });
  const dailySpendingTrend = Object.entries(dailyTrendMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({ date, amount }));

  // 4. Calculate weekly comparison (Week 1, Week 2, Week 3, Week 4, Week 5)
  const weeklyMap: Record<string, number> = { "Week 1": 0, "Week 2": 0, "Week 3": 0, "Week 4": 0, "Week 5": 0 };
  currentMonthExpenses.forEach((e) => {
    const day = new Date(e.date).getDate();
    if (day <= 7) weeklyMap["Week 1"] += e.amount;
    else if (day <= 14) weeklyMap["Week 2"] += e.amount;
    else if (day <= 21) weeklyMap["Week 3"] += e.amount;
    else if (day <= 28) weeklyMap["Week 4"] += e.amount;
    else weeklyMap["Week 5"] += e.amount;
  });
  const weeklyComparison = Object.entries(weeklyMap).map(([week, amount]) => ({ week, amount }));

  // 5. Get top 10 expenses
  const top10Expenses = [...currentMonthExpenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // 6. Build the Monthly Report object
  const report: MonthlyReport = {
    id: `rep_${userId}_${currentMonth}`,
    userId,
    month: currentMonth,
    totalSalary,
    totalExpenses,
    remainingAmount,
    savingsPercentage,
    highestExpenseCategory: highestCategory,
    dailySpendingTrend,
    weeklyComparison,
    top10Expenses,
    budgetUtilization,
    expenseBreakdown,
    generatedAt: new Date().toISOString(),
  };

  db.saveMonthlyReport(report);
  logs.push(`Successfully saved monthly report for ${currentMonth}`);

  // 7. Update statistics
  const stats: Omit<MonthlyStatistics, "id" | "userId" | "month">[] = Object.entries(categories).map(([cat, amt]) => ({
    category: cat,
    totalAmount: amt,
  }));
  db.updateStatistics(userId, currentMonth, stats);
  logs.push(`Successfully updated monthly statistics`);

  // 8. Check Budget Warning Alert (if remaining balance <= 20% of salary)
  const alertCheck = await generateBudgetAlerts(userId);
  if (alertCheck.alerted && alertCheck.warningText) {
    logs.push(`Budget alert condition met! Creating system warning...`);
    // Create notification log
    db.createNotification(userId, {
      title: "⚠️ Low Budget Warning",
      message: alertCheck.warningText,
      type: "alert",
    });
  }

  // 9. Generate and save AI savings recommendations and monthly analysis if none exists for this month yet
  const existingRecommendations = db.getRecommendationsByUserId(userId);
  const hasRecommendationsThisMonth = existingRecommendations.some(
    (r) => r.date.startsWith(currentMonth)
  );

  if (!hasRecommendationsThisMonth && currentMonthExpenses.length >= 2) {
    logs.push(`No savings suggestions detected for this month. Invoking AI analyst...`);
    try {
      const analysisResult = await generateMonthlyAnalysis(userId, currentMonth);
      
      // Save AI recommendations in DB
      const recommendationsToSave = analysisResult.savingsSuggestions.map((s) => ({
        date: now.toISOString().split("T")[0],
        title: s.title,
        text: s.text,
        category: s.title.split(" ").pop() || "Savings",
        actionItem: s.actionItem,
        potentialSavings: s.potentialSavings,
      }));
      db.saveRecommendations(userId, recommendationsToSave);

      // Create notification log for suggestions
      db.createNotification(userId, {
        title: "✨ Personalized AI Savings Advisor",
        message: `Your custom analysis for ${currentMonth} is ready. Potential savings of up to ${recommendationsToSave.reduce((sum, s) => sum + (s.potentialSavings || 0), 0)} ${profile.preferredCurrency} detected!`,
        type: "advice",
      });

      logs.push(`Successfully generated and saved AI recommendations.`);
    } catch (err: any) {
      logs.push(`Failed to generate AI monthly recommendations: ${err.message || err}`);
    }
  }

  // 10. Generate an occasional friendly reminder notification to log daily expenses
  const notifications = db.getNotificationsByUserId(userId);
  const lastReminder = notifications.find((n) => n.type === "reminder");
  const lastReminderDate = lastReminder ? new Date(lastReminder.date) : null;
  const hoursSinceLastReminder = lastReminderDate
    ? (now.getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60)
    : 999;

  if (hoursSinceLastReminder > 12) {
    db.createNotification(userId, {
      title: "✍️ Log your Daily Expenses",
      message: "Keep your tracking flawless! Spend just 30 seconds to log your expenses today.",
      type: "reminder",
    });
    logs.push(`Created a daily reminder to log expenses.`);
  }

  return { success: true, logs };
}
