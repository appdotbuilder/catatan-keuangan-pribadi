import { z } from 'zod';

// Transaction type enum
export const transactionTypeSchema = z.enum(['income', 'expense']);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  type: transactionTypeSchema,
  created_at: z.coerce.date(),
});

export type Category = z.infer<typeof categorySchema>;

// Input schema for creating categories
export const createCategoryInputSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  type: transactionTypeSchema,
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

// Input schema for updating categories
export const updateCategoryInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Category name is required').optional(),
  type: transactionTypeSchema.optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  amount: z.number().positive(),
  description: z.string(),
  date: z.coerce.date(),
  category_id: z.number(),
  type: transactionTypeSchema,
  created_at: z.coerce.date(),
});

export type Transaction = z.infer<typeof transactionSchema>;

// Input schema for creating transactions
export const createTransactionInputSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  date: z.coerce.date(),
  category_id: z.number().positive('Category is required'),
  type: transactionTypeSchema,
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Input schema for updating transactions
export const updateTransactionInputSchema = z.object({
  id: z.number(),
  amount: z.number().positive('Amount must be positive').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  date: z.coerce.date().optional(),
  category_id: z.number().positive('Category is required').optional(),
  type: transactionTypeSchema.optional(),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

// Schema for date range filtering
export const dateRangeSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
});

export type DateRange = z.infer<typeof dateRangeSchema>;

// Schema for getting transactions with filters
export const getTransactionsInputSchema = z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  type: transactionTypeSchema.optional(),
  category_id: z.number().optional(),
}).optional();

export type GetTransactionsInput = z.infer<typeof getTransactionsInputSchema>;

// Report schema for income/expense summary
export const reportSummarySchema = z.object({
  total_income: z.number(),
  total_expense: z.number(),
  net_amount: z.number(),
  transactions_count: z.number(),
  period: z.object({
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
  }),
});

export type ReportSummary = z.infer<typeof reportSummarySchema>;

// Schema for category-wise report
export const categoryReportSchema = z.object({
  category_id: z.number(),
  category_name: z.string(),
  type: transactionTypeSchema,
  total_amount: z.number(),
  transactions_count: z.number(),
});

export type CategoryReport = z.infer<typeof categoryReportSchema>;

// Transaction with category details
export const transactionWithCategorySchema = z.object({
  id: z.number(),
  amount: z.number(),
  description: z.string(),
  date: z.coerce.date(),
  category_id: z.number(),
  type: transactionTypeSchema,
  created_at: z.coerce.date(),
  category_name: z.string(),
});

export type TransactionWithCategory = z.infer<typeof transactionWithCategorySchema>;