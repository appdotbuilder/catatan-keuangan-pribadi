import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput, type UpdateCategoryInput } from '../schema';
import { updateCategory } from '../handlers/update_category';
import { eq } from 'drizzle-orm';

// Helper function to create a test category
const createTestCategory = async (input: CreateCategoryInput) => {
  const result = await db.insert(categoriesTable)
    .values({
      name: input.name,
      type: input.type,
    })
    .returning()
    .execute();
  
  return result[0];
};

const testCategoryInput: CreateCategoryInput = {
  name: 'Test Category',
  type: 'income'
};

describe('updateCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update category name', async () => {
    // Create a test category first
    const category = await createTestCategory(testCategoryInput);

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Updated Category Name'
    };

    const result = await updateCategory(updateInput);

    // Verify the result
    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Updated Category Name');
    expect(result.type).toEqual('income'); // Should remain unchanged
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update category type', async () => {
    // Create a test category first
    const category = await createTestCategory(testCategoryInput);

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      type: 'expense'
    };

    const result = await updateCategory(updateInput);

    // Verify the result
    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Test Category'); // Should remain unchanged
    expect(result.type).toEqual('expense');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update both name and type', async () => {
    // Create a test category first
    const category = await createTestCategory(testCategoryInput);

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Updated Category',
      type: 'expense'
    };

    const result = await updateCategory(updateInput);

    // Verify the result
    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Updated Category');
    expect(result.type).toEqual('expense');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save updated category to database', async () => {
    // Create a test category first
    const category = await createTestCategory(testCategoryInput);

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Updated Category Name',
      type: 'expense'
    };

    await updateCategory(updateInput);

    // Query the database to verify the update
    const updatedCategories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, category.id))
      .execute();

    expect(updatedCategories).toHaveLength(1);
    expect(updatedCategories[0].name).toEqual('Updated Category Name');
    expect(updatedCategories[0].type).toEqual('expense');
    expect(updatedCategories[0].id).toEqual(category.id);
  });

  it('should handle partial updates correctly', async () => {
    // Create a test category first
    const category = await createTestCategory({
      name: 'Original Name',
      type: 'expense'
    });

    // Update only the name
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Only Name Updated'
    };

    const result = await updateCategory(updateInput);

    // Verify only name changed, type remains the same
    expect(result.name).toEqual('Only Name Updated');
    expect(result.type).toEqual('expense'); // Should remain unchanged
    expect(result.id).toEqual(category.id);
  });

  it('should throw error for non-existent category', async () => {
    const updateInput: UpdateCategoryInput = {
      id: 99999, // Non-existent ID
      name: 'Updated Name'
    };

    expect(updateCategory(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle empty update gracefully', async () => {
    // Create a test category first
    const category = await createTestCategory(testCategoryInput);

    // Update with only id (no actual changes)
    const updateInput: UpdateCategoryInput = {
      id: category.id
    };

    const result = await updateCategory(updateInput);

    // Should return the original category unchanged
    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual(category.name);
    expect(result.type).toEqual(category.type);
  });

  it('should preserve created_at timestamp', async () => {
    // Create a test category first
    const category = await createTestCategory(testCategoryInput);
    const originalCreatedAt = category.created_at;

    // Wait a bit to ensure timestamp would be different if updated
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Updated Name'
    };

    const result = await updateCategory(updateInput);

    // created_at should remain the same
    expect(result.created_at).toEqual(originalCreatedAt);
  });
});