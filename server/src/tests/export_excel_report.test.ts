import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, transactionsTable } from '../db/schema';
import { type DateRange } from '../schema';
import { exportExcelReport } from '../handlers/export_excel_report';

// Test data
const testCategories = [
  { name: 'Salary', type: 'income' as const },
  { name: 'Food', type: 'expense' as const },
  { name: 'Transport', type: 'expense' as const },
];

const baseDate = new Date('2024-01-15');
const testDateRange: DateRange = {
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-01-31'),
};

describe('exportExcelReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should export report with transaction data and summary', async () => {
    // Create test categories
    const categories = await db.insert(categoriesTable)
      .values(testCategories)
      .returning()
      .execute();

    // Create test transactions
    await db.insert(transactionsTable)
      .values([
        {
          amount: '3000.00',
          description: 'Monthly salary',
          date: baseDate,
          category_id: categories[0].id,
          type: 'income',
        },
        {
          amount: '500.50',
          description: 'Groceries',
          date: baseDate,
          category_id: categories[1].id,
          type: 'expense',
        },
        {
          amount: '100.75',
          description: 'Bus pass',
          date: baseDate,
          category_id: categories[2].id,
          type: 'expense',
        },
      ])
      .execute();

    const result = await exportExcelReport(testDateRange);

    // Verify file properties
    expect(result.filename).toBe('financial_report_2024-01-01_to_2024-01-31.xlsx');
    expect(result.file_url).toBe('/exports/financial_report_2024-01-01_to_2024-01-31.xlsx');
    expect(result.file_url).toMatch(/^\/exports\//);
    expect(result.filename).toMatch(/financial_report_\d{4}-\d{2}-\d{2}_to_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it('should handle date range filtering correctly', async () => {
    // Create test category
    const categories = await db.insert(categoriesTable)
      .values([{ name: 'Test Category', type: 'income' }])
      .returning()
      .execute();

    // Create transactions - some inside range, some outside
    await db.insert(transactionsTable)
      .values([
        {
          amount: '1000.00',
          description: 'Inside range',
          date: new Date('2024-01-15'),
          category_id: categories[0].id,
          type: 'income',
        },
        {
          amount: '2000.00',
          description: 'Outside range - before',
          date: new Date('2023-12-15'),
          category_id: categories[0].id,
          type: 'income',
        },
        {
          amount: '3000.00',
          description: 'Outside range - after',
          date: new Date('2024-02-15'),
          category_id: categories[0].id,
          type: 'income',
        },
      ])
      .execute();

    const result = await exportExcelReport(testDateRange);

    // Should generate file even with filtered data
    expect(result.filename).toBe('financial_report_2024-01-01_to_2024-01-31.xlsx');
    expect(result.file_url).toBe('/exports/financial_report_2024-01-01_to_2024-01-31.xlsx');
  });

  it('should handle empty date ranges', async () => {
    // Create test category and transaction outside the range
    const categories = await db.insert(categoriesTable)
      .values([{ name: 'Test Category', type: 'income' }])
      .returning()
      .execute();

    await db.insert(transactionsTable)
      .values([
        {
          amount: '1000.00',
          description: 'Outside range',
          date: new Date('2023-12-15'),
          category_id: categories[0].id,
          type: 'income',
        },
      ])
      .execute();

    const emptyDateRange: DateRange = {
      start_date: new Date('2024-06-01'),
      end_date: new Date('2024-06-30'),
    };

    const result = await exportExcelReport(emptyDateRange);

    // Should still generate file with proper naming
    expect(result.filename).toBe('financial_report_2024-06-01_to_2024-06-30.xlsx');
    expect(result.file_url).toBe('/exports/financial_report_2024-06-01_to_2024-06-30.xlsx');
  });

  it('should handle multiple transaction types correctly', async () => {
    // Create test categories for both income and expense
    const categories = await db.insert(categoriesTable)
      .values([
        { name: 'Salary', type: 'income' },
        { name: 'Food', type: 'expense' },
        { name: 'Freelance', type: 'income' },
      ])
      .returning()
      .execute();

    // Create mixed transactions
    await db.insert(transactionsTable)
      .values([
        {
          amount: '5000.00',
          description: 'Main job salary',
          date: new Date('2024-01-01'),
          category_id: categories[0].id,
          type: 'income',
        },
        {
          amount: '2000.00',
          description: 'Freelance work',
          date: new Date('2024-01-15'),
          category_id: categories[2].id,
          type: 'income',
        },
        {
          amount: '800.00',
          description: 'Restaurant bills',
          date: new Date('2024-01-10'),
          category_id: categories[1].id,
          type: 'expense',
        },
      ])
      .execute();

    const result = await exportExcelReport(testDateRange);

    // Verify basic file structure
    expect(result.filename).toMatch(/financial_report_\d{4}-\d{2}-\d{2}_to_\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(result.file_url).toMatch(/^\/exports\/financial_report_\d{4}-\d{2}-\d{2}_to_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it('should handle edge case with boundary dates', async () => {
    // Create test category
    const categories = await db.insert(categoriesTable)
      .values([{ name: 'Test Category', type: 'income' }])
      .returning()
      .execute();

    // Create transactions exactly on boundary dates
    await db.insert(transactionsTable)
      .values([
        {
          amount: '1000.00',
          description: 'Start date transaction',
          date: new Date('2024-01-01T00:00:00'),
          category_id: categories[0].id,
          type: 'income',
        },
        {
          amount: '2000.00',
          description: 'End date transaction',
          date: new Date('2024-01-31T23:59:59'),
          category_id: categories[0].id,
          type: 'income',
        },
      ])
      .execute();

    const result = await exportExcelReport(testDateRange);

    // Should include both boundary transactions
    expect(result.filename).toBe('financial_report_2024-01-01_to_2024-01-31.xlsx');
    expect(result.file_url).toBe('/exports/financial_report_2024-01-01_to_2024-01-31.xlsx');
  });

  it('should handle single day date range', async () => {
    // Create test category
    const categories = await db.insert(categoriesTable)
      .values([{ name: 'Daily Category', type: 'expense' }])
      .returning()
      .execute();

    // Create transaction on specific date
    await db.insert(transactionsTable)
      .values([
        {
          amount: '50.00',
          description: 'Daily expense',
          date: new Date('2024-01-15'),
          category_id: categories[0].id,
          type: 'expense',
        },
      ])
      .execute();

    const singleDayRange: DateRange = {
      start_date: new Date('2024-01-15'),
      end_date: new Date('2024-01-15'),
    };

    const result = await exportExcelReport(singleDayRange);

    expect(result.filename).toBe('financial_report_2024-01-15_to_2024-01-15.xlsx');
    expect(result.file_url).toBe('/exports/financial_report_2024-01-15_to_2024-01-15.xlsx');
  });

  it('should validate foreign key constraints', async () => {
    // Create category first
    const categories = await db.insert(categoriesTable)
      .values([{ name: 'Valid Category', type: 'income' }])
      .returning()
      .execute();

    // Insert transaction with valid foreign key
    await db.insert(transactionsTable)
      .values([
        {
          amount: '1000.00',
          description: 'Valid transaction',
          date: baseDate,
          category_id: categories[0].id,
          type: 'income',
        },
      ])
      .execute();

    // Should not throw error for valid foreign key
    const result = await exportExcelReport(testDateRange);
    expect(result.filename).toMatch(/financial_report_\d{4}-\d{2}-\d{2}_to_\d{4}-\d{2}-\d{2}\.xlsx$/);

    // Test error case: inserting transaction with invalid category_id should fail
    await expect(
      db.insert(transactionsTable)
        .values([
          {
            amount: '1000.00',
            description: 'Invalid transaction',
            date: baseDate,
            category_id: 99999, // Non-existent category
            type: 'income',
          },
        ])
        .execute()
    ).rejects.toThrow(/foreign key constraint/i);
  });
});