import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, transactionsTable } from '../db/schema';
import { type DateRange, type CreateCategoryInput, type CreateTransactionInput } from '../schema';
import { getCategoryReport } from '../handlers/get_category_report';

// Test data setup
const incomeCategory: CreateCategoryInput = {
  name: 'Salary',
  type: 'income'
};

const expenseCategory: CreateCategoryInput = {
  name: 'Groceries',
  type: 'expense'
};

const anotherExpenseCategory: CreateCategoryInput = {
  name: 'Utilities',
  type: 'expense'
};

describe('getCategoryReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no transactions exist', async () => {
    const dateRange: DateRange = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getCategoryReport(dateRange);
    expect(result).toEqual([]);
  });

  it('should generate category report for single category', async () => {
    // Create category
    const [category] = await db.insert(categoriesTable)
      .values(incomeCategory)
      .returning()
      .execute();

    // Create transactions
    const transaction1: CreateTransactionInput = {
      amount: 5000,
      description: 'January salary',
      date: new Date('2024-01-15'),
      category_id: category.id,
      type: 'income'
    };

    const transaction2: CreateTransactionInput = {
      amount: 3000,
      description: 'Bonus',
      date: new Date('2024-01-20'),
      category_id: category.id,
      type: 'income'
    };

    await db.insert(transactionsTable)
      .values([
        {
          ...transaction1,
          amount: transaction1.amount.toString()
        },
        {
          ...transaction2,
          amount: transaction2.amount.toString()
        }
      ])
      .execute();

    const dateRange: DateRange = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getCategoryReport(dateRange);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      category_id: category.id,
      category_name: 'Salary',
      type: 'income',
      total_amount: 8000,
      transactions_count: 2
    });
  });

  it('should generate report for multiple categories', async () => {
    // Create categories
    const [salaryCategory] = await db.insert(categoriesTable)
      .values(incomeCategory)
      .returning()
      .execute();

    const [groceriesCategory] = await db.insert(categoriesTable)
      .values(expenseCategory)
      .returning()
      .execute();

    const [utilitiesCategory] = await db.insert(categoriesTable)
      .values(anotherExpenseCategory)
      .returning()
      .execute();

    // Create transactions for different categories
    await db.insert(transactionsTable)
      .values([
        {
          amount: '5000',
          description: 'Salary',
          date: new Date('2024-01-15'),
          category_id: salaryCategory.id,
          type: 'income'
        },
        {
          amount: '200',
          description: 'Weekly groceries',
          date: new Date('2024-01-10'),
          category_id: groceriesCategory.id,
          type: 'expense'
        },
        {
          amount: '150',
          description: 'More groceries',
          date: new Date('2024-01-20'),
          category_id: groceriesCategory.id,
          type: 'expense'
        },
        {
          amount: '120',
          description: 'Electric bill',
          date: new Date('2024-01-05'),
          category_id: utilitiesCategory.id,
          type: 'expense'
        }
      ])
      .execute();

    const dateRange: DateRange = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getCategoryReport(dateRange);

    expect(result).toHaveLength(3);

    // Sort results by category_id for consistent testing
    const sortedResult = result.sort((a, b) => a.category_id - b.category_id);

    expect(sortedResult[0]).toEqual({
      category_id: salaryCategory.id,
      category_name: 'Salary',
      type: 'income',
      total_amount: 5000,
      transactions_count: 1
    });

    expect(sortedResult[1]).toEqual({
      category_id: groceriesCategory.id,
      category_name: 'Groceries',
      type: 'expense',
      total_amount: 350,
      transactions_count: 2
    });

    expect(sortedResult[2]).toEqual({
      category_id: utilitiesCategory.id,
      category_name: 'Utilities',
      type: 'expense',
      total_amount: 120,
      transactions_count: 1
    });
  });

  it('should filter transactions by date range correctly', async () => {
    // Create category
    const [category] = await db.insert(categoriesTable)
      .values(incomeCategory)
      .returning()
      .execute();

    // Create transactions in different date ranges
    await db.insert(transactionsTable)
      .values([
        {
          amount: '1000',
          description: 'Before range',
          date: new Date('2023-12-31'),
          category_id: category.id,
          type: 'income'
        },
        {
          amount: '2000',
          description: 'In range 1',
          date: new Date('2024-01-15'),
          category_id: category.id,
          type: 'income'
        },
        {
          amount: '3000',
          description: 'In range 2',
          date: new Date('2024-01-20'),
          category_id: category.id,
          type: 'income'
        },
        {
          amount: '4000',
          description: 'After range',
          date: new Date('2024-02-01'),
          category_id: category.id,
          type: 'income'
        }
      ])
      .execute();

    const dateRange: DateRange = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getCategoryReport(dateRange);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      category_id: category.id,
      category_name: 'Salary',
      type: 'income',
      total_amount: 5000, // Only transactions within date range
      transactions_count: 2
    });
  });

  it('should handle categories with no transactions in date range', async () => {
    // Create category
    const [category] = await db.insert(categoriesTable)
      .values(incomeCategory)
      .returning()
      .execute();

    // Create transaction outside date range
    await db.insert(transactionsTable)
      .values({
        amount: '1000',
        description: 'Outside range',
        date: new Date('2023-12-31'),
        category_id: category.id,
        type: 'income'
      })
      .execute();

    const dateRange: DateRange = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getCategoryReport(dateRange);
    
    // Should return empty array since no transactions are in the date range
    expect(result).toEqual([]);
  });

  it('should handle decimal amounts correctly', async () => {
    // Create category
    const [category] = await db.insert(categoriesTable)
      .values(expenseCategory)
      .returning()
      .execute();

    // Create transactions with decimal amounts
    await db.insert(transactionsTable)
      .values([
        {
          amount: '19.99',
          description: 'Small purchase',
          date: new Date('2024-01-10'),
          category_id: category.id,
          type: 'expense'
        },
        {
          amount: '125.50',
          description: 'Medium purchase',
          date: new Date('2024-01-15'),
          category_id: category.id,
          type: 'expense'
        }
      ])
      .execute();

    const dateRange: DateRange = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getCategoryReport(dateRange);

    expect(result).toHaveLength(1);
    expect(result[0].total_amount).toEqual(145.49);
    expect(result[0].transactions_count).toEqual(2);
    expect(typeof result[0].total_amount).toBe('number');
  });

  it('should handle date range boundaries inclusively', async () => {
    // Create category
    const [category] = await db.insert(categoriesTable)
      .values(incomeCategory)
      .returning()
      .execute();

    // Create transactions exactly on boundary dates
    const startDate = new Date('2024-01-01T00:00:00.000Z');
    const endDate = new Date('2024-01-31T23:59:59.999Z');

    await db.insert(transactionsTable)
      .values([
        {
          amount: '1000',
          description: 'Start boundary',
          date: startDate,
          category_id: category.id,
          type: 'income'
        },
        {
          amount: '2000',
          description: 'End boundary',
          date: endDate,
          category_id: category.id,
          type: 'income'
        }
      ])
      .execute();

    const dateRange: DateRange = {
      start_date: startDate,
      end_date: endDate
    };

    const result = await getCategoryReport(dateRange);

    expect(result).toHaveLength(1);
    expect(result[0].total_amount).toEqual(3000);
    expect(result[0].transactions_count).toEqual(2);
  });
});