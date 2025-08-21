import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type DateRange } from '../schema';
import { and, gte, lte, eq, sql } from 'drizzle-orm';

export const exportExcelReport = async (dateRange: DateRange): Promise<{ file_url: string; filename: string }> => {
  try {
    // Query transactions within date range with category details
    const transactionsWithCategories = await db.select({
      id: transactionsTable.id,
      amount: transactionsTable.amount,
      description: transactionsTable.description,
      date: transactionsTable.date,
      type: transactionsTable.type,
      category_name: categoriesTable.name,
      category_id: transactionsTable.category_id,
    })
      .from(transactionsTable)
      .innerJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id))
      .where(
        and(
          gte(transactionsTable.date, dateRange.start_date),
          lte(transactionsTable.date, dateRange.end_date)
        )
      )
      .execute();

    // Query category-wise summary
    const categoryBreakdown = await db.select({
      category_id: transactionsTable.category_id,
      category_name: categoriesTable.name,
      type: transactionsTable.type,
      total_amount: sql<string>`sum(${transactionsTable.amount})`.as('total_amount'),
      transactions_count: sql<string>`count(*)`.as('transactions_count'),
    })
      .from(transactionsTable)
      .innerJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id))
      .where(
        and(
          gte(transactionsTable.date, dateRange.start_date),
          lte(transactionsTable.date, dateRange.end_date)
        )
      )
      .groupBy(
        transactionsTable.category_id,
        categoriesTable.name,
        transactionsTable.type
      )
      .execute();

    // Query overall summary
    const summaryResult = await db.select({
      total_income: sql<string>`coalesce(sum(case when ${transactionsTable.type} = 'income' then ${transactionsTable.amount} else 0 end), 0)`.as('total_income'),
      total_expense: sql<string>`coalesce(sum(case when ${transactionsTable.type} = 'expense' then ${transactionsTable.amount} else 0 end), 0)`.as('total_expense'),
      transactions_count: sql<string>`count(*)`.as('transactions_count'),
    })
      .from(transactionsTable)
      .where(
        and(
          gte(transactionsTable.date, dateRange.start_date),
          lte(transactionsTable.date, dateRange.end_date)
        )
      )
      .execute();

    // Convert numeric fields from strings to numbers
    const transactionData = transactionsWithCategories.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount),
    }));

    const categoryData = categoryBreakdown.map(category => ({
      ...category,
      total_amount: parseFloat(category.total_amount),
      transactions_count: parseInt(category.transactions_count),
    }));

    const summary = summaryResult[0] ? {
      total_income: parseFloat(summaryResult[0].total_income),
      total_expense: parseFloat(summaryResult[0].total_expense),
      transactions_count: parseInt(summaryResult[0].transactions_count),
    } : {
      total_income: 0,
      total_expense: 0,
      transactions_count: 0,
    };

    // Calculate net amount
    const net_amount = summary.total_income - summary.total_expense;

    // Generate Excel file content (simplified JSON structure for this implementation)
    // In a real implementation, this would use a library like 'xlsx' to create actual Excel files
    const reportData = {
      summary: {
        ...summary,
        net_amount,
        period: {
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        },
      },
      transactions: transactionData,
      category_breakdown: categoryData,
      generated_at: new Date(),
    };

    // Generate filename
    const startDateStr = dateRange.start_date.toISOString().split('T')[0];
    const endDateStr = dateRange.end_date.toISOString().split('T')[0];
    const filename = `financial_report_${startDateStr}_to_${endDateStr}.xlsx`;

    // In a real implementation, you would:
    // 1. Create actual Excel file using a library like 'xlsx'
    // 2. Save it to a file system or cloud storage
    // 3. Return the actual file URL
    
    // For this implementation, we'll simulate the file creation
    const file_url = `/exports/${filename}`;

    return {
      file_url,
      filename,
    };
  } catch (error) {
    console.error('Excel report export failed:', error);
    throw error;
  }
};