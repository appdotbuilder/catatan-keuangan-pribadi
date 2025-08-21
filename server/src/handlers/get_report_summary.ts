import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type DateRange, type ReportSummary } from '../schema';
import { and, gte, lte, eq, count, sum, SQL } from 'drizzle-orm';

export const getReportSummary = async (dateRange: DateRange): Promise<ReportSummary> => {
  try {
    // Apply date range filters
    const conditions: SQL<unknown>[] = [];
    conditions.push(gte(transactionsTable.date, dateRange.start_date));
    conditions.push(lte(transactionsTable.date, dateRange.end_date));

    // Build and execute query
    const results = await db.select({
      type: transactionsTable.type,
      total_amount: sum(transactionsTable.amount),
      transaction_count: count(transactionsTable.id),
    })
    .from(transactionsTable)
    .where(and(...conditions))
    .groupBy(transactionsTable.type)
    .execute();

    // Initialize summary values
    let total_income = 0;
    let total_expense = 0;
    let income_count = 0;
    let expense_count = 0;

    // Process results by transaction type
    for (const result of results) {
      const amount = parseFloat(result.total_amount || '0');
      const count = result.transaction_count || 0;

      if (result.type === 'income') {
        total_income = amount;
        income_count = count;
      } else if (result.type === 'expense') {
        total_expense = amount;
        expense_count = count;
      }
    }

    // Calculate net amount and total transaction count
    const net_amount = Math.round((total_income - total_expense) * 100) / 100;
    const transactions_count = income_count + expense_count;

    return {
      total_income: Math.round(total_income * 100) / 100,
      total_expense: Math.round(total_expense * 100) / 100,
      net_amount,
      transactions_count,
      period: {
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      },
    };
  } catch (error) {
    console.error('Report summary generation failed:', error);
    throw error;
  }
};