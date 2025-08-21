import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type GetTransactionsInput, type TransactionWithCategory } from '../schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export const getTransactions = async (input?: GetTransactionsInput): Promise<TransactionWithCategory[]> => {
  try {
    // Build conditions array for optional filtering
    const conditions: SQL<unknown>[] = [];

    if (input?.start_date) {
      conditions.push(gte(transactionsTable.date, input.start_date));
    }

    if (input?.end_date) {
      conditions.push(lte(transactionsTable.date, input.end_date));
    }

    if (input?.type) {
      conditions.push(eq(transactionsTable.type, input.type));
    }

    if (input?.category_id) {
      conditions.push(eq(transactionsTable.category_id, input.category_id));
    }

    // Build base query
    const baseQuery = db.select({
      id: transactionsTable.id,
      amount: transactionsTable.amount,
      description: transactionsTable.description,
      date: transactionsTable.date,
      category_id: transactionsTable.category_id,
      type: transactionsTable.type,
      created_at: transactionsTable.created_at,
      category_name: categoriesTable.name,
    })
    .from(transactionsTable)
    .innerJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id));

    // Apply where clause and ordering in a single chain
    const query = conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(transactionsTable.date)
      : baseQuery.orderBy(transactionsTable.date);

    const results = await query.execute();

    // Convert numeric fields back to numbers before returning
    return results.map(result => ({
      ...result,
      amount: parseFloat(result.amount), // Convert numeric string to number
    }));
  } catch (error) {
    console.error('Get transactions failed:', error);
    throw error;
  }
};