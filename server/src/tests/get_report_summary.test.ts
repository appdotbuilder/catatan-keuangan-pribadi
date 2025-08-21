import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, transactionsTable } from '../db/schema';
import { type DateRange, type CreateCategoryInput, type CreateTransactionInput } from '../schema';
import { getReportSummary } from '../handlers/get_report_summary';

describe('getReportSummary', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test helper to create categories
  const createTestCategories = async () => {
    const categories = await db.insert(categoriesTable)
      .values([
        { name: 'Salary', type: 'income' },
        { name: 'Food', type: 'expense' },
        { name: 'Investment', type: 'income' },
      ])
      .returning()
      .execute();

    return categories;
  };

  // Test helper to create transactions
  const createTestTransactions = async (categoryIds: number[]) => {
    const baseDate = new Date('2024-01-15');
    
    const transactions = await db.insert(transactionsTable)
      .values([
        {
          amount: '1000.00',
          description: 'Monthly Salary',
          date: new Date('2024-01-15'),
          category_id: categoryIds[0], // Salary (income)
          type: 'income',
        },
        {
          amount: '200.50',
          description: 'Groceries',
          date: new Date('2024-01-16'),
          category_id: categoryIds[1], // Food (expense)
          type: 'expense',
        },
        {
          amount: '500.00',
          description: 'Stock Investment',
          date: new Date('2024-01-17'),
          category_id: categoryIds[2], // Investment (income)
          type: 'income',
        },
        {
          amount: '75.25',
          description: 'Restaurant',
          date: new Date('2024-01-18'),
          category_id: categoryIds[1], // Food (expense)
          type: 'expense',
        },
        // Transaction outside the test date range
        {
          amount: '300.00',
          description: 'Old Transaction',
          date: new Date('2023-12-31'),
          category_id: categoryIds[0],
          type: 'income',
        },
      ])
      .returning()
      .execute();

    return transactions;
  };

  it('should generate correct summary for date range with transactions', async () => {
    // Setup test data
    const categories = await createTestCategories();
    const categoryIds = categories.map(c => c.id);
    await createTestTransactions(categoryIds);

    // Test date range covering most transactions
    const dateRange: DateRange = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
    };

    const result = await getReportSummary(dateRange);

    // Verify summary calculations
    expect(result.total_income).toEqual(1500.00); // 1000 + 500
    expect(result.total_expense).toEqual(275.75); // 200.50 + 75.25
    expect(result.net_amount).toEqual(1224.25); // 1500 - 275.75
    expect(result.transactions_count).toEqual(4); // 4 transactions in range
    expect(result.period.start_date).toEqual(dateRange.start_date);
    expect(result.period.end_date).toEqual(dateRange.end_date);
  });

  it('should return zero values for date range with no transactions', async () => {
    // Create categories but no transactions
    await createTestCategories();

    const dateRange: DateRange = {
      start_date: new Date('2024-02-01'),
      end_date: new Date('2024-02-28'),
    };

    const result = await getReportSummary(dateRange);

    expect(result.total_income).toEqual(0);
    expect(result.total_expense).toEqual(0);
    expect(result.net_amount).toEqual(0);
    expect(result.transactions_count).toEqual(0);
    expect(result.period.start_date).toEqual(dateRange.start_date);
    expect(result.period.end_date).toEqual(dateRange.end_date);
  });

  it('should handle date range with only income transactions', async () => {
    const categories = await createTestCategories();
    const salaryCategory = categories.find(c => c.name === 'Salary');

    // Create only income transactions
    await db.insert(transactionsTable)
      .values([
        {
          amount: '2000.00',
          description: 'Salary',
          date: new Date('2024-01-15'),
          category_id: salaryCategory!.id,
          type: 'income',
        },
        {
          amount: '1500.00',
          description: 'Bonus',
          date: new Date('2024-01-20'),
          category_id: salaryCategory!.id,
          type: 'income',
        },
      ])
      .execute();

    const dateRange: DateRange = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
    };

    const result = await getReportSummary(dateRange);

    expect(result.total_income).toEqual(3500.00);
    expect(result.total_expense).toEqual(0);
    expect(result.net_amount).toEqual(3500.00); // All income, no expenses
    expect(result.transactions_count).toEqual(2);
  });

  it('should handle date range with only expense transactions', async () => {
    const categories = await createTestCategories();
    const foodCategory = categories.find(c => c.name === 'Food');

    // Create only expense transactions
    await db.insert(transactionsTable)
      .values([
        {
          amount: '150.75',
          description: 'Groceries',
          date: new Date('2024-01-10'),
          category_id: foodCategory!.id,
          type: 'expense',
        },
        {
          amount: '89.25',
          description: 'Restaurant',
          date: new Date('2024-01-15'),
          category_id: foodCategory!.id,
          type: 'expense',
        },
      ])
      .execute();

    const dateRange: DateRange = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
    };

    const result = await getReportSummary(dateRange);

    expect(result.total_income).toEqual(0);
    expect(result.total_expense).toEqual(240.00);
    expect(result.net_amount).toEqual(-240.00); // Negative net amount
    expect(result.transactions_count).toEqual(2);
  });

  it('should filter transactions correctly by date boundaries', async () => {
    const categories = await createTestCategories();
    const categoryIds = categories.map(c => c.id);

    // Create transactions on boundary dates
    await db.insert(transactionsTable)
      .values([
        {
          amount: '100.00',
          description: 'Before range',
          date: new Date('2024-01-14T23:59:59'),
          category_id: categoryIds[0],
          type: 'income',
        },
        {
          amount: '200.00',
          description: 'Start of range',
          date: new Date('2024-01-15T00:00:00'),
          category_id: categoryIds[0],
          type: 'income',
        },
        {
          amount: '300.00',
          description: 'End of range',
          date: new Date('2024-01-20T00:00:00'),
          category_id: categoryIds[0],
          type: 'income',
        },
        {
          amount: '400.00',
          description: 'After range',
          date: new Date('2024-01-21T00:00:00'),
          category_id: categoryIds[0],
          type: 'income',
        },
      ])
      .execute();

    const dateRange: DateRange = {
      start_date: new Date('2024-01-15'),
      end_date: new Date('2024-01-20'),
    };

    const result = await getReportSummary(dateRange);

    // Should only include transactions within the date range
    expect(result.total_income).toEqual(500.00); // 200 + 300
    expect(result.transactions_count).toEqual(2);
  });

  it('should handle decimal amounts correctly', async () => {
    const categories = await createTestCategories();
    const categoryIds = categories.map(c => c.id);

    // Create transactions with various decimal amounts
    await db.insert(transactionsTable)
      .values([
        {
          amount: '1234.56',
          description: 'Income with decimals',
          date: new Date('2024-01-15'),
          category_id: categoryIds[0],
          type: 'income',
        },
        {
          amount: '987.65',
          description: 'Expense with decimals',
          date: new Date('2024-01-16'),
          category_id: categoryIds[1],
          type: 'expense',
        },
        {
          amount: '0.01',
          description: 'Tiny amount',
          date: new Date('2024-01-17'),
          category_id: categoryIds[0],
          type: 'income',
        },
      ])
      .execute();

    const dateRange: DateRange = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
    };

    const result = await getReportSummary(dateRange);

    expect(result.total_income).toEqual(1234.57); // 1234.56 + 0.01
    expect(result.total_expense).toEqual(987.65);
    expect(result.net_amount).toEqual(246.92); // 1234.57 - 987.65
    expect(result.transactions_count).toEqual(3);
  });
});