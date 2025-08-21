import { db } from '../db';
import { categoriesTable, transactionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteCategory = async (id: number): Promise<{ success: boolean }> => {
  try {
    // Check if category exists
    const existingCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .execute();

    if (existingCategory.length === 0) {
      throw new Error(`Category with id ${id} not found`);
    }

    // Check if there are any transactions referencing this category
    const existingTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.category_id, id))
      .execute();

    if (existingTransactions.length > 0) {
      throw new Error(`Cannot delete category. ${existingTransactions.length} transaction(s) are associated with this category`);
    }

    // Delete the category
    await db.delete(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Category deletion failed:', error);
    throw error;
  }
};