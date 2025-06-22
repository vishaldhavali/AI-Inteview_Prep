import { ToastMessage } from "@/types/app";

// Standardized logger
export const logger = {
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.info(`[INFO] ${message}`, data);
    }
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data);
  },
  error: (message: string, error: any) => {
    console.error(`[ERROR] ${message}`, error);
  },
};

// Error categories for better error handling
export enum ErrorCategory {
  AUTH = "Authentication",
  RESUME = "Resume Processing",
  INTERVIEW = "Interview",
  DATABASE = "Database",
  STORAGE = "File Storage",
  AI = "AI Processing",
  VALIDATION = "Validation",
  NETWORK = "Network",
}

// Standardized error handler
export const handleError = (
  error: any,
  category: ErrorCategory,
  context?: string
): ToastMessage => {
  // Log the error with context
  logger.error(`${category} error${context ? ` in ${context}` : ""}:`, error);

  // Handle specific error types
  if (
    error?.message?.includes("not authenticated") ||
    error?.message?.includes("not authorized")
  ) {
    return {
      title: "Authentication Error",
      description: "Please sign in to continue",
      variant: "destructive",
    };
  }

  if (error?.message?.includes("network")) {
    return {
      title: "Network Error",
      description: "Please check your internet connection",
      variant: "destructive",
    };
  }

  // Handle specific error categories
  switch (category) {
    case ErrorCategory.AUTH:
      return {
        title: "Authentication Error",
        description: error.message || "Failed to authenticate",
        variant: "destructive",
      };

    case ErrorCategory.RESUME:
      return {
        title: "Resume Processing Error",
        description: error.message || "Failed to process resume",
        variant: "destructive",
      };

    case ErrorCategory.INTERVIEW:
      return {
        title: "Interview Error",
        description: error.message || "Failed to process interview request",
        variant: "destructive",
      };

    case ErrorCategory.AI:
      return {
        title: "AI Processing Error",
        description: error.message || "Failed to process with AI",
        variant: "destructive",
      };

    case ErrorCategory.DATABASE:
      return {
        title: "Database Error",
        description: "Failed to save or retrieve data",
        variant: "destructive",
      };

    case ErrorCategory.STORAGE:
      return {
        title: "Storage Error",
        description: error.message || "Failed to handle file storage",
        variant: "destructive",
      };

    case ErrorCategory.VALIDATION:
      return {
        title: "Validation Error",
        description: error.message || "Invalid input provided",
        variant: "destructive",
      };

    default:
      return {
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      };
  }
};

// Data sanitization utility
export const sanitizeData = <T extends object>(data: T): Partial<T> => {
  const sanitized = { ...data };
  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "key",
    "auth",
    "credential",
  ];

  Object.keys(sanitized).forEach((key) => {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
      delete sanitized[key as keyof T];
    }
  });

  return sanitized;
};

// Validation utilities
export const validationUtils = {
  phone: (phone: string): boolean => {
    return /^\d{10}$/.test(phone);
  },
  email: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  password: (password: string): boolean => {
    return password.length >= 8;
  },
  name: (name: string): boolean => {
    return name.trim().length > 0;
  },
};
