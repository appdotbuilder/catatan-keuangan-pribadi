import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create a test category
  const createTestCategory = async () => {
    const result = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        type: 'expense'
      })
      .returning()
      .execute();
    return result[0];
  };

  const createIncomeCategory = async () => {
    const result = await db.insert(categoriesTable)
      .values({
        name: 'Salary',
        type: 'income'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should create an expense transaction with category details', async () => {
    const category = await createTestCategory();
    
    const testInput: CreateTransactionInput = {
      amount: 250.75,
      description: 'Grocery shopping',
      date: new Date('2024-01-15'),
      category_id: category.id,
      type: 'expense'
    };

    const result = await createTransaction(testInput);

    // Verify all fields are correct
    expect(result.amount).toEqual(250.75);
    expect(typeof result.amount).toBe('number');
    expect(result.description).toEqual('Grocery shopping');
    expect(result.date).toEqual(new Date('2024-01-15'));
    expect(result.category_id).toEqual(category.id);
    expect(result.type).toEqual('expense');
    expect(result.category_name).toEqual('Test Category');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an income transaction with category details', async () => {
    const category = await createIncomeCategory();
    
    const testInput: CreateTransactionInput = {
      amount: 3500.00,
      description: 'Monthly salary',
      date: new Date('2024-01-31'),
      category_id: category.id,
      type: 'income'
    };

    const result = await createTransaction(testInput);

    expect(result.amount).toEqual(3500.00);
    expect(typeof result.amount).toBe('number');
    expect(result.description).toEqual('Monthly salary');
    expect(result.type).toEqual('income');
    expect(result.category_name).toEqual('Salary');
  });

  it('should save transaction to database correctly', async () => {
    const category = await createTestCategory();
    
    const testInput: CreateTransactionInput = {
      amount: 99.99,
      description: 'Online purchase',
      date: new Date('2024-02-01'),
      category_id: category.id,
      type: 'expense'
    };

    const result = await createTransaction(testInput);

    // Verify it was saved to database
    const savedTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(savedTransactions).toHaveLength(1);
    const savedTransaction = savedTransactions[0];
    
    expect(parseFloat(savedTransaction.amount)).toEqual(99.99);
    expect(savedTransaction.description).toEqual('Online purchase');
    expect(savedTransaction.date).toEqual(new Date('2024-02-01'));
    expect(savedTransaction.category_id).toEqual(category.id);
    expect(savedTransaction.type).toEqual('expense');
    expect(savedTransaction.created_at).toBeInstanceOf(Date);
  });

  it('should handle decimal amounts correctly', async () => {
    const category = await createTestCategory();
    
    const testInput: CreateTransactionInput = {
      amount: 12.34,
      description: 'Coffee',
      date: new Date(),
      category_id: category.id,
      type: 'expense'
    };

    const result = await createTransaction(testInput);

    expect(result.amount).toEqual(12.34);
    expect(typeof result.amount).toBe('number');

    // Verify precision is maintained in database
    const saved = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(parseFloat(saved[0].amount)).toEqual(12.34);
  });

  it('should throw error when category does not exist', async () => {
    const testInput: CreateTransactionInput = {
      amount: 100.00,
      description: 'Test transaction',
      date: new Date(),
      category_id: 999, // Non-existent category
      type: 'expense'
    };

    await expect(createTransaction(testInput)).rejects.toThrow(/Category with ID 999 not found/i);
  });

  it('should handle large amounts correctly', async () => {
    const category = await createTestCategory();
    
    const testInput: CreateTransactionInput = {
      amount: 10000.99,
      description: 'Large expense',
      date: new Date(),
      category_id: category.id,
      type: 'expense'
    };

    const result = await createTransaction(testInput);

    expect(result.amount).toEqual(10000.99);
    expect(typeof result.amount).toBe('number');
  });

  it('should create multiple transactions for same category', async () => {
    const category = await createTestCategory();
    
    const transaction1: CreateTransactionInput = {
      amount: 50.00,
      description: 'First transaction',
      date: new Date('2024-01-01'),
      category_id: category.id,
      type: 'expense'
    };

    const transaction2: CreateTransactionInput = {
      amount: 75.25,
      description: 'Second transaction',
      date: new Date('2024-01-02'),
      category_id: category.id,
      type: 'expense'
    };

    const result1 = await createTransaction(transaction1);
    const result2 = await createTransaction(transaction2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.category_name).toEqual('Test Category');
    expect(result2.category_name).toEqual('Test Category');
    expect(result1.amount).toEqual(50.00);
    expect(result2.amount).toEqual(75.25);
  });
});