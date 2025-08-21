import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteTransaction = async (id: number): Promise<{ success: boolean }> => {
  try {
    // Delete the transaction record
    const result = await db.delete(transactionsTable)
      .where(eq(transactionsTable.id, id))
      .execute();

    // Check if any rows were affected (transaction existed and was deleted)
    const success = result.rowCount !== null && result.rowCount > 0;
    
    return { success };
  } catch (error) {
    console.error('Transaction deletion failed:', error);
    throw error;
  }
};