import { GoogleGenAI, Type } from "@google/genai";
import { db, RAGDocument, Expense, UserProfile } from "./db.js";

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not configured. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

/**
 * Perform a keyword and category-based semantic ranking of RAG documents for a user question
 */
export function retrieveRelevantDocuments(question: string, documents: RAGDocument[]): RAGDocument[] {
  const normalizedQuestion = question.toLowerCase();
  
  // Scoring documents based on term match in title, content, or tags
  const scoredDocs = documents.map((doc) => {
    let score = 0;
    
    // Exact category matches
    if (normalizedQuestion.includes(doc.category.toLowerCase())) {
      score += 10;
    }
    
    // Tag matches
    doc.tags.forEach((tag) => {
      if (normalizedQuestion.includes(tag.toLowerCase())) {
        score += 5;
      }
    });
    
    // Term occurrences in title/content
    const words = normalizedQuestion.split(/\s+/);
    words.forEach((word) => {
      if (word.length > 3) {
        if (doc.title.toLowerCase().includes(word)) score += 3;
        if (doc.content.toLowerCase().includes(word)) score += 1;
      }
    });
    
    return { doc, score };
  });
  
  // Sort by score descending and return the top 3 (always return at least 2 default ones if score is 0)
  const sorted = scoredDocs.sort((a, b) => b.score - a.score);
  return sorted.slice(0, 3).map((item) => item.doc);
}

/**
 * Answer financial Q&A using user's actual spending history and RAG documents
 */
export async function answerFinancialQuestion(
  userId: string,
  question: string
): Promise<{ text: string; retrievedSources: string[] }> {
  const profile = db.getProfileByUserId(userId);
  const expenses = db.getExpensesByUserId(userId);
  const allDocs = db.getRAGDocuments();
  
  const relevantDocs = retrieveRelevantDocuments(question, allDocs);
  const sourceTitles = relevantDocs.map((d) => d.title);
  
  // Format user profile
  const salaryStr = profile
    ? `${profile.monthlySalary} ${profile.preferredCurrency} (Paid on day ${profile.salaryCreditDate} of each month)`
    : "Not configured yet";
  
  // Format recent expenses (limit to latest 30 expenses for token size and context safety)
  const sortedExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  const expensesSummary = sortedExpenses.length > 0
    ? sortedExpenses.map((e) => `- ${e.date}: ${e.amount} [${e.category}] - ${e.description} (${e.paymentMethod})`).join("\n")
    : "No recent transactions logged.";
    
  // Calculate total spending by category for context
  const totalsByCategory: Record<string, number> = {};
  let totalSpent = 0;
  expenses.forEach((e) => {
    totalsByCategory[e.category] = (totalsByCategory[e.category] || 0) + e.amount;
    totalSpent += e.amount;
  });
  const categorySummary = Object.entries(totalsByCategory)
    .map(([cat, amt]) => `- ${cat}: ${amt} (${((amt / (totalSpent || 1)) * 100).toFixed(1)}%)`)
    .join("\n");

  const knowledgeContext = relevantDocs
    .map((d, idx) => `[Source ${idx + 1}: ${d.title}]\n${d.content}`)
    .join("\n\n");

  const systemInstruction = `You are a highly skilled, professional AI Personal Finance Advisor.
Your objective is to provide actionable, accurate, and empathetic financial advice to the user.
You must ground your answers in the provided "Financial Knowledge Articles" (RAG Context) and the user's "Real Spending History".

Rules:
1. Always refer to the user's specific currency (${profile?.preferredCurrency || "currency"}).
2. Reference specific items from the user's spending log if they are relevant to the user's query.
3. Be clear, professional, and supportive. Use bullet points and clean structure.
4. When suggesting savings, calculate precise amounts when possible based on their logged transactions.
5. If the user asks about general advice, combine it with the closest matching knowledge article.
6. Clearly cite the articles you used for answering.`;

  const userPrompt = `=== USER FINANCIAL PROFILE ===
- Monthly Salary: ${salaryStr}
- Total Expenses Logged: ${totalSpent} ${profile?.preferredCurrency || "units"}
- Remaining Balance: ${profile ? profile.monthlySalary - totalSpent : "N/A"} ${profile?.preferredCurrency || "units"}

=== TOTAL EXPENDITURE BY CATEGORY ===
${categorySummary || "No categories logged yet."}

=== RECENT EXPENDITURES (LATEST 30) ===
${expensesSummary}

=== FINANCIAL KNOWLEDGE ARTICLES (RETRIEVED RAG CONTEXT) ===
${knowledgeContext}

=== USER QUESTION ===
"${question}"

Please provide a detailed, cohesive financial answer combining their actual data and the retrieved budgeting best practices:`;

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
    
    return {
      text: response.text || "I was unable to analyze your financial history. Please verify your details or try again.",
      retrievedSources: sourceTitles,
    };
  } catch (error: any) {
    console.error("Gemini RAG generation error:", error);
    return {
      text: `Failed to generate financial analysis. Root cause: ${error.message || error}. Ensure your Gemini API Key is set in AI Studio Secrets.`,
      retrievedSources: [],
    };
  }
}

/**
 * Triggered daily or manually to generate an alert warning, anomalous categories, and personalized advice if salary balance <= 20%
 */
export async function generateBudgetAlerts(userId: string): Promise<{ alerted: boolean; warningText?: string; overspendingCategories?: string[] }> {
  const profile = db.getProfileByUserId(userId);
  if (!profile || profile.monthlySalary <= 0) {
    return { alerted: false };
  }
  
  const expenses = db.getExpensesByUserId(userId);
  // Get expenses in the current calendar month
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthExpenses = expenses.filter((e) => e.date.startsWith(currentYearMonth));
  
  const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = profile.monthlySalary - totalSpent;
  const remainingPct = (remaining / profile.monthlySalary) * 100;
  
  if (remainingPct > 20) {
    return { alerted: false };
  }
  
  // Calculate total spent per category
  const categories: Record<string, number> = {};
  currentMonthExpenses.forEach((e) => {
    categories[e.category] = (categories[e.category] || 0) + e.amount;
  });
  
  // Sort categories by expenditure
  const sortedCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);
    
  // Discretionary categories we typically warn about
  const discretionary = ["Food", "Entertainment", "Shopping", "Travel", "Miscellaneous"];
  const highDiscretionary = sortedCategories.filter((cat) => discretionary.includes(cat));

  const systemPrompt = `You are a strict yet professional financial warning engine.
The user is down to ${remainingPct.toFixed(1)}% of their monthly salary.
Create a short, warning notification (max 3 sentences) highlighting their primary spending categories, explaining that they have less than 20% remaining, and offering urgent recommendations to cut discretionary costs.`;

  const contextPrompt = `User Salary: ${profile.monthlySalary} ${profile.preferredCurrency}
Remaining: ${remaining.toFixed(2)} ${profile.preferredCurrency} (${remainingPct.toFixed(1)}%)
All Expenses category sums:
${Object.entries(categories).map(([cat, amt]) => `- ${cat}: ${amt}`).join("\n")}
Top overspending candidate categories: ${highDiscretionary.join(", ") || "None specific"}`;

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contextPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.5,
      }
    });
    
    const warningText = response.text || "Your remaining budget is below 20%. Please consider reducing discretionary expenses.";
    return {
      alerted: true,
      warningText,
      overspendingCategories: highDiscretionary,
    };
  } catch (error) {
    console.error("Failed to generate AI budget warning:", error);
    return {
      alerted: true,
      warningText: `Warning: Only ${remainingPct.toFixed(1)}% of your salary remains. Please review your logged categories to reduce further discretionary spending.`,
      overspendingCategories: highDiscretionary,
    };
  }
}

/**
 * End-of-month financial summary generation
 */
export async function generateMonthlyAnalysis(
  userId: string,
  month: string // YYYY-MM
): Promise<{ summary: string; savingsSuggestions: { title: string; text: string; potentialSavings: number; actionItem: string }[] }> {
  const profile = db.getProfileByUserId(userId);
  if (!profile) {
    throw new Error("User profile not found.");
  }
  
  const expenses = db.getExpensesByUserId(userId).filter((e) => e.date.startsWith(month));
  const totalSalary = profile.monthlySalary;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Category Breakdown
  const categories: Record<string, number> = {};
  expenses.forEach((e) => {
    categories[e.category] = (categories[e.category] || 0) + e.amount;
  });
  
  const breakdownStr = Object.entries(categories)
    .map(([cat, amt]) => `- ${cat}: ${amt} ${profile.preferredCurrency}`)
    .join("\n");

  const systemInstruction = `You are an expert financial analyst.
Provide a high-quality end-of-month breakdown and return a JSON containing:
1. "summary": A personalized, conversational summary of their spending this month, pointing out unusual spending patterns (e.g. food delivery spikes, high shopping), potential savings, and a supportive wrap-up.
2. "suggestions": A list of exactly 3 custom, actionable saving recommendations based on their actual expenses, each containing a "title", "text" (specific details), "potentialSavings" (a realistic savings amount in their currency), and an "actionItem" (a single concrete step to take).

Your response MUST be strict JSON matching this schema:
{
  "summary": "...",
  "suggestions": [
    {
      "title": "...",
      "text": "...",
      "potentialSavings": 120,
      "actionItem": "..."
    }
  ]
}`;

  const prompt = `User Monthly Salary: ${totalSalary} ${profile.preferredCurrency}
Total Logged Expenses: ${totalExpenses} ${profile.preferredCurrency}
Remaining Amount: ${totalSalary - totalExpenses} ${profile.preferredCurrency}
Expenses Category Breakdown:
${breakdownStr || "No expenses logged this month."}`;

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  text: { type: Type.STRING },
                  potentialSavings: { type: Type.NUMBER },
                  actionItem: { type: Type.STRING },
                },
                required: ["title", "text", "potentialSavings", "actionItem"],
              },
            },
          },
          required: ["summary", "suggestions"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      summary: result.summary || "No monthly transactions to analyze. Great job keeping your spending clean!",
      savingsSuggestions: result.suggestions || [],
    };
  } catch (error) {
    console.error("AI End of Month Analysis failed:", error);
    // Return standard template
    return {
      summary: `Your total spending for ${month} is ${totalExpenses} ${profile.preferredCurrency} against your salary of ${totalSalary} ${profile.preferredCurrency}. To maximize savings, consider setting up weekly spend limits on non-essential categories.`,
      savingsSuggestions: [
        {
          title: "Limit Food Delivery",
          text: "Dining and ordering food often spike spending. Limit deliveries to twice a week to save up to 15%.",
          potentialSavings: Math.round(totalExpenses * 0.05),
          actionItem: "Try meal planning for weekdays."
        },
        {
          title: "Optimize Subscriptions",
          text: "Review active software and streaming subscriptions. Cancel any unused accounts.",
          potentialSavings: Math.round(totalExpenses * 0.02),
          actionItem: "Check your bank statement for recurring charges."
        },
        {
          title: "Automate Baseline Savings",
          text: "Set up a recurring Systematic Investment Plan (SIP) or deposit on your salary date.",
          potentialSavings: Math.round(totalSalary * 0.1),
          actionItem: "Create an automatic transfer of 10% on your next salary credit date."
        }
      ],
    };
  }
}
