import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import { db, User } from "./server/db.js";
import { answerFinancialQuestion } from "./server/rag.js";
import { runDailySchedulerForUser } from "./server/scheduler.js";

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "violet-pink-finance-ai-token-secret";

// Auth Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication token required." });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: "Token expired or invalid." });
    }
    req.user = decoded;
    next();
  });
}

async function startServer() {
  const app = express();

  // Enable JSON and forms with high limit for Base64 receipts
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // --- API ROUTES ---

  // 1. Auth API
  app.post("/api/auth/signup", (req, res) => {
    try {
      const { email, password, name, monthlySalary, salaryCreditDate, preferredCurrency } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: "Email, password, and name are required." });
      }

      const existing = db.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "A user with this email already exists." });
      }

      const user = db.createUser(email, password);
      
      // Upsert default profile details
      const salary = Number(monthlySalary) || 3000;
      const creditDate = Number(salaryCreditDate) || 1;
      const currency = preferredCurrency || "USD";
      db.upsertProfile(user.id, name, salary, creditDate, currency);

      // Save initial empty reports or populate defaults
      const currentMonth = new Date().toISOString().substring(0, 7);
      
      // Create welcome notification
      db.createNotification(user.id, {
        title: "🌸 Welcome to Finance AI!",
        message: `Hi ${name}, welcome! Start tracking your daily expenses, monitor your ${salary} ${currency} budget, and chat with your AI advisor.`,
        type: "general",
      });

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
      res.status(201).json({ token, user: { id: user.id, email: user.email, name } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const user = db.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      const bcryptjs = require("bcryptjs");
      const valid = bcryptjs.compareSync(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      const profile = db.getProfileByUserId(user.id);
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
      
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: profile ? profile.name : "User",
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    try {
      const user = db.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }
      const profile = db.getProfileByUserId(user.id);
      res.json({
        id: user.id,
        email: user.email,
        profile,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Profile Management API
  app.get("/api/profile", authenticateToken, (req: any, res) => {
    try {
      const profile = db.getProfileByUserId(req.user.id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found." });
      }
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/profile", authenticateToken, (req: any, res) => {
    try {
      const { name, monthlySalary, salaryCreditDate, preferredCurrency } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Name is required." });
      }

      const profile = db.upsertProfile(
        req.user.id,
        name,
        Number(monthlySalary) || 0,
        Number(salaryCreditDate) || 1,
        preferredCurrency || "USD"
      );

      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Daily Expenses API
  app.get("/api/expenses", authenticateToken, (req: any, res) => {
    try {
      const expenses = db.getExpensesByUserId(req.user.id);
      const { search, category, month } = req.query;

      let filtered = [...expenses];

      if (search) {
        const query = (search as string).toLowerCase();
        filtered = filtered.filter(
          (e) =>
            e.description.toLowerCase().includes(query) ||
            e.category.toLowerCase().includes(query) ||
            e.paymentMethod.toLowerCase().includes(query)
        );
      }

      if (category) {
        filtered = filtered.filter((e) => e.category === category);
      }

      if (month) {
        filtered = filtered.filter((e) => e.date.startsWith(month as string));
      }

      // Sort by date descending
      filtered.sort((a, b) => b.date.localeCompare(a.date));

      res.json(filtered);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/expenses", authenticateToken, (req: any, res) => {
    try {
      const { date, amount, category, description, paymentMethod, billImage } = req.body;
      if (!date || !amount || !category || !description || !paymentMethod) {
        return res.status(400).json({ error: "Missing required expense fields." });
      }

      const expense = db.createExpense(req.user.id, {
        date,
        amount: Number(amount),
        category,
        description,
        paymentMethod,
        billImage,
      });

      // Recalculate scheduler updates asynchronously to keep UI fast
      runDailySchedulerForUser(req.user.id).catch((err) =>
        console.error("Async scheduler trigger failed:", err)
      );

      res.status(201).json(expense);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/expenses/:id", authenticateToken, (req: any, res) => {
    try {
      const expense = db.updateExpense(req.params.id, req.user.id, req.body);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found or unauthorized." });
      }

      runDailySchedulerForUser(req.user.id).catch((err) =>
        console.error("Async scheduler trigger failed:", err)
      );

      res.json(expense);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/expenses/:id", authenticateToken, (req: any, res) => {
    try {
      const success = db.deleteExpense(req.params.id, req.user.id);
      if (!success) {
        return res.status(404).json({ error: "Expense not found or unauthorized." });
      }

      runDailySchedulerForUser(req.user.id).catch((err) =>
        console.error("Async scheduler trigger failed:", err)
      );

      res.json({ success: true, message: "Expense deleted successfully." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Categories API
  app.get("/api/categories", (req, res) => {
    res.json(db.getCategories());
  });

  // 5. Reports API
  app.get("/api/reports", authenticateToken, (req: any, res) => {
    try {
      const reports = db.getMonthlyReports(req.user.id);
      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reports/:month", authenticateToken, async (req: any, res) => {
    try {
      const month = req.params.month; // YYYY-MM
      const reports = db.getMonthlyReports(req.user.id);
      let report = reports.find((r) => r.month === month);

      if (!report) {
        // Trigger scheduler calculations to build report dynamically!
        await runDailySchedulerForUser(req.user.id);
        const updatedReports = db.getMonthlyReports(req.user.id);
        report = updatedReports.find((r) => r.month === month);
      }

      if (!report) {
        return res.status(404).json({ error: "No report generated yet for this month." });
      }

      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. AI Q&A Advisor Chat API
  app.post("/api/advisor/chat", authenticateToken, async (req: any, res) => {
    try {
      const { question } = req.body;
      if (!question) {
        return res.status(400).json({ error: "Question is required." });
      }

      const reply = await answerFinancialQuestion(req.user.id, question);
      res.json(reply);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. AI Recommendations API
  app.get("/api/recommendations", authenticateToken, (req: any, res) => {
    try {
      const recommendations = db.getRecommendationsByUserId(req.user.id);
      res.json(recommendations);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Notifications API
  app.get("/api/notifications", authenticateToken, (req: any, res) => {
    try {
      const notifications = db.getNotificationsByUserId(req.user.id);
      res.json(notifications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/notifications/read", authenticateToken, (req: any, res) => {
    try {
      db.markAllNotificationsAsRead(req.user.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/notifications/:id/read", authenticateToken, (req: any, res) => {
    try {
      const success = db.markNotificationAsRead(req.params.id, req.user.id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Manual / Background Scheduler Trigger API
  app.post("/api/scheduler/trigger", authenticateToken, async (req: any, res) => {
    try {
      const result = await runDailySchedulerForUser(req.user.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10. RAG Articles list
  app.get("/api/rag/documents", authenticateToken, (req, res) => {
    try {
      res.json(db.getRAGDocuments());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
