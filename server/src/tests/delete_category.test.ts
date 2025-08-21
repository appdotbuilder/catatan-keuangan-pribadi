import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, transactionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { deleteCategory } from '../handlers/delete_category';

describe('deleteCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a category successfully', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        type: 'income'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Delete the category
    const result = await deleteCategory(categoryId);

    expect(result.success).toBe(true);

    // Verify category is deleted from database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(0);
  });

  it('should throw error when category does not exist', async () => {
    const nonExistentId = 999;

    await expect(deleteCategory(nonExistentId))
      .rejects
      .toThrow(/category with id 999 not found/i);
  });

  it('should throw error when category has associated transactions', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        type: 'income'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create a transaction referencing this category
    await db.insert(transactionsTable)
      .values({
        amount: '100.00', // Convert to string for numeric column
        description: 'Test Transaction',
        date: new Date(),
        category_id: categoryId,
        type: 'income'
      })
      .execute();

    // Try to delete the category
    await expect(deleteCategory(categoryId))
      .rejects
      .toThrow(/cannot delete category.*1 transaction\(s\) are associated/i);

    // Verify category still exists in database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(1);
  });

  it('should throw error when multiple transactions are associated', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        type: 'expense'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create multiple transactions referencing this category
    await db.insert(transactionsTable)
      .values([
        {
          amount: '50.00',
          description: 'Transaction 1',
          date: new Date(),
          category_id: categoryId,
          type: 'expense'
        },
        {
          amount: '75.00',
          description: 'Transaction 2',
          date: new Date(),
          category_id: categoryId,
          type: 'expense'
        }
      ])
      .execute();

    // Try to delete the category
    await expect(deleteCategory(categoryId))
      .rejects
      .toThrow(/cannot delete category.*2 transaction\(s\) are associated/i);

    // Verify category still exists in database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(1);
  });

  it('should handle deletion of category after all transactions are removed', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        type: 'income'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create a transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        amount: '100.00',
        description: 'Test Transaction',
        date: new Date(),
        category_id: categoryId,
        type: 'income'
      })
      .returning()
      .execute();

    // Verify deletion fails when transaction exists
    await expect(deleteCategory(categoryId))
      .rejects
      .toThrow(/cannot delete category/i);

    // Remove the transaction
    await db.delete(transactionsTable)
      .where(eq(transactionsTable.id, transactionResult[0].id))
      .execute();

    // Now deletion should succeed
    const result = await deleteCategory(categoryId);
    expect(result.success).toBe(true);

    // Verify category is deleted
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(0);
  });
});