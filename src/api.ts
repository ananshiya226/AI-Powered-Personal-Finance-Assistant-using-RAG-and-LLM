const API_URL = ""; // Relative paths will resolve to server on port 3000

export function getAuthToken(): string | null {
  return localStorage.getItem("finance_jwt_token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("finance_jwt_token", token);
}

export function clearAuthToken() {
  localStorage.removeItem("finance_jwt_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  login: async (email: string, passwordString: string) => {
    const res = await request<{ token: string; user: { id: string; email: string; name: string } }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password: passwordString }),
      }
    );
    setAuthToken(res.token);
    return res;
  },

  signup: async (
    email: string,
    passwordString: string,
    name: string,
    monthlySalary: number,
    salaryCreditDate: number,
    preferredCurrency: string
  ) => {
    const res = await request<{ token: string; user: { id: string; email: string; name: string } }>(
      "/api/auth/signup",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password: passwordString,
          name,
          monthlySalary,
          salaryCreditDate,
          preferredCurrency,
        }),
      }
    );
    setAuthToken(res.token);
    return res;
  },

  me: async () => {
    return request<{ id: string; email: string; profile: any }>("/api/auth/me");
  },

  // Profile
  getProfile: async () => {
    return request<any>("/api/profile");
  },

  updateProfile: async (name: string, monthlySalary: number, salaryCreditDate: number, preferredCurrency: string) => {
    return request<any>("/api/profile", {
      method: "POST",
      body: JSON.stringify({ name, monthlySalary, salaryCreditDate, preferredCurrency }),
    });
  },

  // Expenses
  getExpenses: async (filters: { search?: string; category?: string; month?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.category) params.append("category", filters.category);
    if (filters.month) params.append("month", filters.month);

    const query = params.toString() ? `?${params.toString()}` : "";
    return request<any[]>(`/api/expenses${query}`);
  },

  addExpense: async (expense: {
    date: string;
    amount: number;
    category: string;
    description: string;
    paymentMethod: string;
    billImage?: string;
  }) => {
    return request<any>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(expense),
    });
  },

  editExpense: async (
    id: string,
    expense: {
      date?: string;
      amount?: number;
      category?: string;
      description?: string;
      paymentMethod?: string;
      billImage?: string;
    }
  ) => {
    return request<any>(`/api/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(expense),
    });
  },

  deleteExpense: async (id: string) => {
    return request<{ success: boolean; message: string }>(`/api/expenses/${id}`, {
      method: "DELETE",
    });
  },

  // Categories
  getCategories: async () => {
    return request<any[]>("/api/categories");
  },

  // Reports
  getReports: async () => {
    return request<any[]>("/api/reports");
  },

  getReportForMonth: async (month: string) => {
    return request<any>(`/api/reports/${month}`);
  },

  // RAG Chat Q&A Advisor
  chatAdvisor: async (question: string) => {
    return request<{ text: string; retrievedSources: string[] }>("/api/advisor/chat", {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  },

  // AI Savings recommendations
  getRecommendations: async () => {
    return request<any[]>("/api/recommendations");
  },

  // Notifications
  getNotifications: async () => {
    return request<any[]>("/api/notifications");
  },

  markNotificationsRead: async () => {
    return request<{ success: boolean }>("/api/notifications/read", {
      method: "POST",
    });
  },

  markNotificationRead: async (id: string) => {
    return request<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: "POST",
    });
  },

  // Force trigger nightly scheduler
  triggerScheduler: async () => {
    return request<{ success: boolean; logs: string[] }>("/api/scheduler/trigger", {
      method: "POST",
    });
  },

  // Browse RAG articles
  getRAGDocuments: async () => {
    return request<any[]>("/api/rag/documents");
  },
};
