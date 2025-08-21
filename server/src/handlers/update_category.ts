import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type UpdateCategoryInput, type Category } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCategory = async (input: UpdateCategoryInput): Promise<Category> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.type !== undefined) {
      updateData.type = input.type;
    }

    // If no fields to update, just fetch and return the existing category
    if (Object.keys(updateData).length === 0) {
      const result = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.id))
        .execute();

      if (result.length === 0) {
        throw new Error(`Category with id ${input.id} not found`);
      }

      return result[0];
    }

    // Update the category record
    const result = await db.update(categoriesTable)
      .set(updateData)
      .where(eq(categoriesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Category with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Category update failed:', error);
    throw error;
  }
};