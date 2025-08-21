import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type CreateTransactionInput, type TransactionWithCategory } from '../schema';
import { eq } from 'drizzle-orm';

export const createTransaction = async (input: CreateTransactionInput): Promise<TransactionWithCategory> => {
  try {
    // First, verify the category exists and get its name
    const category = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.category_id))
      .execute();

    if (category.length === 0) {
      throw new Error(`Category with ID ${input.category_id} not found`);
    }

    // Insert the transaction
    const result = await db.insert(transactionsTable)
      .values({
        amount: input.amount.toString(), // Convert number to string for numeric column
        description: input.description,
        date: input.date,
        category_id: input.category_id,
        type: input.type
      })
      .returning()
      .execute();

    const transaction = result[0];

    // Return with category name and numeric conversion
    return {
      id: transaction.id,
      amount: parseFloat(transaction.amount), // Convert string back to number
      description: transaction.description,
      date: transaction.date,
      category_id: transaction.category_id,
      type: transaction.type,
      created_at: transaction.created_at,
      category_name: category[0].name
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
};