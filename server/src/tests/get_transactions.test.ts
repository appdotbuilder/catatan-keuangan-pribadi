import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, transactionsTable } from '../db/schema';
import { type GetTransactionsInput, type CreateCategoryInput, type CreateTransactionInput } from '../schema';
import { getTransactions } from '../handlers/get_transactions';

// Test data
const testCategory1: CreateCategoryInput = {
  name: 'Food',
  type: 'expense'
};

const testCategory2: CreateCategoryInput = {
  name: 'Salary',
  type: 'income'
};

describe('getTransactions', () => {
  let category1Id: number;
  let category2Id: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test categories first
    const category1Result = await db.insert(categoriesTable)
      .values(testCategory1)
      .returning()
      .execute();
    
    const category2Result = await db.insert(categoriesTable)
      .values(testCategory2)
      .returning()
      .execute();
    
    category1Id = category1Result[0].id;
    category2Id = category2Result[0].id;

    // Create test transactions
    const testTransactions: CreateTransactionInput[] = [
      {
        amount: 25.50,
        description: 'Lunch',
        date: new Date('2024-01-15'),
        category_id: category1Id,
        type: 'expense'
      },
      {
        amount: 3000.00,
        description: 'Monthly salary',
        date: new Date('2024-01-01'),
        category_id: category2Id,
        type: 'income'
      },
      {
        amount: 45.75,
        description: 'Groceries',
        date: new Date('2024-01-20'),
        category_id: category1Id,
        type: 'expense'
      },
      {
        amount: 15.25,
        description: 'Coffee',
        date: new Date('2024-02-01'),
        category_id: category1Id,
        type: 'expense'
      }
    ];

    // Insert test transactions
    await db.insert(transactionsTable)
      .values(testTransactions.map(t => ({
        ...t,
        amount: t.amount.toString() // Convert to string for numeric column
      })))
      .execute();
  });

  afterEach(resetDB);

  it('should get all transactions with category information', async () => {
    const result = await getTransactions();

    expect(result).toHaveLength(4);
    
    // Verify all transactions have required fields
    result.forEach(transaction => {
      expect(transaction.id).toBeDefined();
      expect(typeof transaction.amount).toBe('number');
      expect(transaction.description).toBeDefined();
      expect(transaction.date).toBeInstanceOf(Date);
      expect(transaction.category_id).toBeDefined();
      expect(transaction.type).toBeDefined();
      expect(transaction.created_at).toBeInstanceOf(Date);
      expect(transaction.category_name).toBeDefined();
    });

    // Verify specific transaction data
    const lunchTransaction = result.find(t => t.description === 'Lunch');
    expect(lunchTransaction).toBeDefined();
    expect(lunchTransaction!.amount).toBe(25.50);
    expect(lunchTransaction!.category_name).toBe('Food');
    expect(lunchTransaction!.type).toBe('expense');
  });

  it('should filter transactions by date range', async () => {
    const input: GetTransactionsInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(3); // Should exclude February transaction
    result.forEach(transaction => {
      expect(transaction.date >= new Date('2024-01-01')).toBe(true);
      expect(transaction.date <= new Date('2024-01-31')).toBe(true);
    });
  });

  it('should filter transactions by type', async () => {
    const input: GetTransactionsInput = {
      type: 'expense'
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(3); // Should exclude income transaction
    result.forEach(transaction => {
      expect(transaction.type).toBe('expense');
    });
  });

  it('should filter transactions by category', async () => {
    const input: GetTransactionsInput = {
      category_id: category1Id
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(3); // Should get all Food category transactions
    result.forEach(transaction => {
      expect(transaction.category_id).toBe(category1Id);
      expect(transaction.category_name).toBe('Food');
    });
  });

  it('should filter transactions with multiple criteria', async () => {
    const input: GetTransactionsInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      type: 'expense',
      category_id: category1Id
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(2); // Should get only January food expenses
    result.forEach(transaction => {
      expect(transaction.date >= new Date('2024-01-01')).toBe(true);
      expect(transaction.date <= new Date('2024-01-31')).toBe(true);
      expect(transaction.type).toBe('expense');
      expect(transaction.category_id).toBe(category1Id);
      expect(transaction.category_name).toBe('Food');
    });
  });

  it('should handle start_date filter only', async () => {
    const input: GetTransactionsInput = {
      start_date: new Date('2024-01-16')
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(2); // Should get transactions from Jan 20 and Feb 1
    result.forEach(transaction => {
      expect(transaction.date >= new Date('2024-01-16')).toBe(true);
    });
  });

  it('should handle end_date filter only', async () => {
    const input: GetTransactionsInput = {
      end_date: new Date('2024-01-15')
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(2); // Should get transactions from Jan 1 and Jan 15
    result.forEach(transaction => {
      expect(transaction.date <= new Date('2024-01-15')).toBe(true);
    });
  });

  it('should return empty array when no transactions match filters', async () => {
    const input: GetTransactionsInput = {
      start_date: new Date('2025-01-01'),
      end_date: new Date('2025-01-31')
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(0);
  });

  it('should return transactions ordered by date', async () => {
    const result = await getTransactions();

    expect(result).toHaveLength(4);
    
    // Verify transactions are ordered by date (ascending based on orderBy clause)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].date >= result[i - 1].date).toBe(true);
    }
  });

  it('should handle undefined input parameter', async () => {
    const result = await getTransactions(undefined);

    expect(result).toHaveLength(4); // Should return all transactions
    expect(result[0].category_name).toBeDefined(); // Should include category info
  });
});