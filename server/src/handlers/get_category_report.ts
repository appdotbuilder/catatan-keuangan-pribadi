import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type DateRange, type CategoryReport } from '../schema';
import { eq, gte, lte, and, sum, count } from 'drizzle-orm';

export const getCategoryReport = async (dateRange: DateRange): Promise<CategoryReport[]> => {
  try {
    // Query to get category-wise report with aggregated data
    const results = await db
      .select({
        category_id: categoriesTable.id,
        category_name: categoriesTable.name,
        type: categoriesTable.type,
        total_amount: sum(transactionsTable.amount),
        transactions_count: count(transactionsTable.id),
      })
      .from(transactionsTable)
      .innerJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id))
      .where(
        and(
          gte(transactionsTable.date, dateRange.start_date),
          lte(transactionsTable.date, dateRange.end_date)
        )
      )
      .groupBy(categoriesTable.id, categoriesTable.name, categoriesTable.type)
      .execute();

    // Convert numeric fields and ensure proper types
    return results.map(result => ({
      category_id: result.category_id,
      category_name: result.category_name,
      type: result.type,
      total_amount: parseFloat(result.total_amount || '0'), // Handle null from sum()
      transactions_count: result.transactions_count,
    }));
  } catch (error) {
    console.error('Category report generation failed:', error);
    throw error;
  }
};