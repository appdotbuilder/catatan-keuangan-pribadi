import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for transaction types
export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense']);

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: transactionTypeEnum('type').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description').notNull(),
  date: timestamp('date').notNull(),
  category_id: integer('category_id').references(() => categoriesTable.id).notNull(),
  type: transactionTypeEnum('type').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  transactions: many(transactionsTable),
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  category: one(categoriesTable, {
    fields: [transactionsTable.category_id],
    references: [categoriesTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;
export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  categories: categoriesTable, 
  transactions: transactionsTable 
};

export const tableRelations = {
  categoriesRelations,
  transactionsRelations,
};