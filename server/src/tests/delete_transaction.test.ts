import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { deleteTransaction } from '../handlers/delete_transaction';

describe('deleteTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing transaction', async () => {
    // Create prerequisite category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        type: 'expense'
      })
      .returning()
      .execute();

    const category = categoryResult[0];

    // Create transaction to delete
    const transactionResult = await db.insert(transactionsTable)
      .values({
        amount: '100.50',
        description: 'Test transaction',
        date: new Date(),
        category_id: category.id,
        type: 'expense'
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    // Delete the transaction
    const result = await deleteTransaction(transaction.id);

    // Should return success
    expect(result.success).toBe(true);

    // Verify transaction was deleted from database
    const deletedTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transaction.id))
      .execute();

    expect(deletedTransactions).toHaveLength(0);
  });

  it('should return false when deleting non-existent transaction', async () => {
    const nonExistentId = 99999;

    const result = await deleteTransaction(nonExistentId);

    // Should return false for non-existent transaction
    expect(result.success).toBe(false);
  });

  it('should not affect other transactions when deleting specific transaction', async () => {
    // Create prerequisite category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        type: 'income'
      })
      .returning()
      .execute();

    const category = categoryResult[0];

    // Create multiple transactions
    const transaction1Result = await db.insert(transactionsTable)
      .values({
        amount: '50.00',
        description: 'First transaction',
        date: new Date(),
        category_id: category.id,
        type: 'income'
      })
      .returning()
      .execute();

    const transaction2Result = await db.insert(transactionsTable)
      .values({
        amount: '75.25',
        description: 'Second transaction',
        date: new Date(),
        category_id: category.id,
        type: 'income'
      })
      .returning()
      .execute();

    const transaction1 = transaction1Result[0];
    const transaction2 = transaction2Result[0];

    // Delete only the first transaction
    const result = await deleteTransaction(transaction1.id);

    expect(result.success).toBe(true);

    // Verify first transaction was deleted
    const deletedTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transaction1.id))
      .execute();

    expect(deletedTransactions).toHaveLength(0);

    // Verify second transaction still exists
    const remainingTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transaction2.id))
      .execute();

    expect(remainingTransactions).toHaveLength(1);
    expect(remainingTransactions[0].description).toEqual('Second transaction');
    expect(parseFloat(remainingTransactions[0].amount)).toEqual(75.25);
  });

  it('should handle deletion with valid ID that was already deleted', async () => {
    // Create prerequisite category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        type: 'expense'
      })
      .returning()
      .execute();

    const category = categoryResult[0];

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        amount: '200.00',
        description: 'Transaction to delete twice',
        date: new Date(),
        category_id: category.id,
        type: 'expense'
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    // Delete the transaction first time
    const firstResult = await deleteTransaction(transaction.id);
    expect(firstResult.success).toBe(true);

    // Try to delete the same transaction again
    const secondResult = await deleteTransaction(transaction.id);
    expect(secondResult.success).toBe(false);
  });
});