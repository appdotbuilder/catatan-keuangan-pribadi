import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type UpdateTransactionInput, type TransactionWithCategory } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTransaction = async (input: UpdateTransactionInput): Promise<TransactionWithCategory> => {
  try {
    // First, check if the transaction exists
    const existingTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.id))
      .execute();

    if (existingTransaction.length === 0) {
      throw new Error(`Transaction with id ${input.id} not found`);
    }

    // If category_id is being updated, verify the category exists
    if (input.category_id !== undefined) {
      const categoryExists = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.category_id))
        .execute();

      if (categoryExists.length === 0) {
        throw new Error(`Category with id ${input.category_id} not found`);
      }
    }

    // Build update object with only the fields that are provided
    const updateData: any = {};
    if (input.amount !== undefined) {
      updateData.amount = input.amount.toString(); // Convert number to string for numeric column
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.date !== undefined) {
      updateData.date = input.date;
    }
    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }
    if (input.type !== undefined) {
      updateData.type = input.type;
    }

    // Update the transaction
    const updatedTransaction = await db.update(transactionsTable)
      .set(updateData)
      .where(eq(transactionsTable.id, input.id))
      .returning()
      .execute();

    // Get the updated transaction with category information
    const result = await db.select({
      id: transactionsTable.id,
      amount: transactionsTable.amount,
      description: transactionsTable.description,
      date: transactionsTable.date,
      category_id: transactionsTable.category_id,
      type: transactionsTable.type,
      created_at: transactionsTable.created_at,
      category_name: categoriesTable.name,
    })
      .from(transactionsTable)
      .innerJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id))
      .where(eq(transactionsTable.id, input.id))
      .execute();

    const transactionWithCategory = result[0];
    
    return {
      ...transactionWithCategory,
      amount: parseFloat(transactionWithCategory.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction update failed:', error);
    throw error;
  }
};