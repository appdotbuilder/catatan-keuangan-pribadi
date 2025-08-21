import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type Category, type TransactionType } from '../schema';
import { eq } from 'drizzle-orm';

export const getCategories = async (type?: TransactionType): Promise<Category[]> => {
  try {
    // Build query with conditional where clause
    const baseQuery = db.select().from(categoriesTable);
    
    const results = type 
      ? await baseQuery.where(eq(categoriesTable.type, type)).execute()
      : await baseQuery.execute();

    // Return results (no numeric conversion needed for categories table)
    return results;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
};