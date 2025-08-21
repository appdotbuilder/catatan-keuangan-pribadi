import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type UpdateTransactionInput, type CreateCategoryInput, type CreateTransactionInput } from '../schema';
import { updateTransaction } from '../handlers/update_transaction';
import { eq } from 'drizzle-orm';

// Test data
const testCategory1: CreateCategoryInput = {
  name: 'Test Category 1',
  type: 'income'
};

const testCategory2: CreateCategoryInput = {
  name: 'Test Category 2',
  type: 'expense'
};

const testTransaction: CreateTransactionInput = {
  amount: 100.50,
  description: 'Original description',
  date: new Date('2024-01-15'),
  category_id: 1, // Will be set after category creation
  type: 'income'
};

describe('updateTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let categoryId1: number;
  let categoryId2: number;
  let transactionId: number;

  beforeEach(async () => {
    // Create test categories
    const category1Result = await db.insert(categoriesTable)
      .values(testCategory1)
      .returning()
      .execute();
    categoryId1 = category1Result[0].id;

    const category2Result = await db.insert(categoriesTable)
      .values(testCategory2)
      .returning()
      .execute();
    categoryId2 = category2Result[0].id;

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        amount: testTransaction.amount.toString(),
        category_id: categoryId1
      })
      .returning()
      .execute();
    transactionId = transactionResult[0].id;
  });

  it('should update transaction amount', async () => {
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      amount: 250.75
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionId);
    expect(result.amount).toEqual(250.75);
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.category_id).toEqual(categoryId1); // Unchanged
    expect(result.type).toEqual('income'); // Unchanged
    expect(result.category_name).toEqual('Test Category 1');
  });

  it('should update transaction description', async () => {
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      description: 'Updated description'
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionId);
    expect(result.amount).toEqual(100.50); // Unchanged
    expect(result.description).toEqual('Updated description');
    expect(result.category_id).toEqual(categoryId1); // Unchanged
    expect(result.category_name).toEqual('Test Category 1');
  });

  it('should update transaction date', async () => {
    const newDate = new Date('2024-02-20');
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      date: newDate
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionId);
    expect(result.date).toEqual(newDate);
    expect(result.amount).toEqual(100.50); // Unchanged
    expect(result.description).toEqual('Original description'); // Unchanged
  });

  it('should update transaction category', async () => {
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      category_id: categoryId2,
      type: 'expense' // Also updating type to match new category
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionId);
    expect(result.category_id).toEqual(categoryId2);
    expect(result.category_name).toEqual('Test Category 2');
    expect(result.type).toEqual('expense');
    expect(result.amount).toEqual(100.50); // Unchanged
    expect(result.description).toEqual('Original description'); // Unchanged
  });

  it('should update multiple transaction fields at once', async () => {
    const newDate = new Date('2024-03-10');
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      amount: 500.25,
      description: 'Completely updated transaction',
      date: newDate,
      category_id: categoryId2,
      type: 'expense'
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionId);
    expect(result.amount).toEqual(500.25);
    expect(result.description).toEqual('Completely updated transaction');
    expect(result.date).toEqual(newDate);
    expect(result.category_id).toEqual(categoryId2);
    expect(result.type).toEqual('expense');
    expect(result.category_name).toEqual('Test Category 2');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should persist changes to database', async () => {
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      amount: 999.99,
      description: 'Database persistence test'
    };

    await updateTransaction(updateInput);

    // Verify changes were saved to database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(parseFloat(transactions[0].amount)).toEqual(999.99);
    expect(transactions[0].description).toEqual('Database persistence test');
  });

  it('should throw error for non-existent transaction', async () => {
    const updateInput: UpdateTransactionInput = {
      id: 999999, // Non-existent ID
      amount: 100.00
    };

    expect(() => updateTransaction(updateInput)).toThrow(/Transaction with id 999999 not found/i);
  });

  it('should throw error for non-existent category', async () => {
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      category_id: 999999 // Non-existent category ID
    };

    expect(() => updateTransaction(updateInput)).toThrow(/Category with id 999999 not found/i);
  });

  it('should handle partial updates correctly', async () => {
    // Update only amount
    const partialUpdate: UpdateTransactionInput = {
      id: transactionId,
      amount: 75.25
    };

    const result = await updateTransaction(partialUpdate);

    // Verify only amount changed
    expect(result.amount).toEqual(75.25);
    expect(result.description).toEqual('Original description');
    expect(result.category_id).toEqual(categoryId1);
    expect(result.type).toEqual('income');

    // Verify original date is preserved (approximately)
    expect(result.date.getTime()).toBeCloseTo(new Date('2024-01-15').getTime(), -3);
  });

  it('should return correct numeric type for amount', async () => {
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      amount: 123.45
    };

    const result = await updateTransaction(updateInput);

    expect(typeof result.amount).toBe('number');
    expect(result.amount).toEqual(123.45);
  });
});