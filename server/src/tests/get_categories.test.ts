import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type TransactionType } from '../schema';
import { getCategories } from '../handlers/get_categories';

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();
    expect(result).toEqual([]);
  });

  it('should return all categories when no filter is provided', async () => {
    // Create test categories
    await db.insert(categoriesTable).values([
      { name: 'Salary', type: 'income' },
      { name: 'Groceries', type: 'expense' },
      { name: 'Freelance', type: 'income' },
      { name: 'Utilities', type: 'expense' }
    ]).execute();

    const result = await getCategories();

    expect(result).toHaveLength(4);
    
    // Verify all required fields are present
    result.forEach(category => {
      expect(category.id).toBeDefined();
      expect(typeof category.id).toBe('number');
      expect(category.name).toBeDefined();
      expect(typeof category.name).toBe('string');
      expect(category.type).toBeDefined();
      expect(['income', 'expense']).toContain(category.type);
      expect(category.created_at).toBeInstanceOf(Date);
    });

    // Verify specific categories exist
    const categoryNames = result.map(c => c.name);
    expect(categoryNames).toContain('Salary');
    expect(categoryNames).toContain('Groceries');
    expect(categoryNames).toContain('Freelance');
    expect(categoryNames).toContain('Utilities');
  });

  it('should return only income categories when type is income', async () => {
    // Create test categories
    await db.insert(categoriesTable).values([
      { name: 'Salary', type: 'income' },
      { name: 'Groceries', type: 'expense' },
      { name: 'Freelance', type: 'income' },
      { name: 'Utilities', type: 'expense' }
    ]).execute();

    const result = await getCategories('income' as TransactionType);

    expect(result).toHaveLength(2);
    
    // Verify all returned categories are income type
    result.forEach(category => {
      expect(category.type).toBe('income');
    });

    // Verify specific income categories
    const categoryNames = result.map(c => c.name);
    expect(categoryNames).toContain('Salary');
    expect(categoryNames).toContain('Freelance');
    expect(categoryNames).not.toContain('Groceries');
    expect(categoryNames).not.toContain('Utilities');
  });

  it('should return only expense categories when type is expense', async () => {
    // Create test categories
    await db.insert(categoriesTable).values([
      { name: 'Salary', type: 'income' },
      { name: 'Groceries', type: 'expense' },
      { name: 'Freelance', type: 'income' },
      { name: 'Utilities', type: 'expense' }
    ]).execute();

    const result = await getCategories('expense' as TransactionType);

    expect(result).toHaveLength(2);
    
    // Verify all returned categories are expense type
    result.forEach(category => {
      expect(category.type).toBe('expense');
    });

    // Verify specific expense categories
    const categoryNames = result.map(c => c.name);
    expect(categoryNames).toContain('Groceries');
    expect(categoryNames).toContain('Utilities');
    expect(categoryNames).not.toContain('Salary');
    expect(categoryNames).not.toContain('Freelance');
  });

  it('should return empty array when filtering for type with no matching categories', async () => {
    // Create only income categories
    await db.insert(categoriesTable).values([
      { name: 'Salary', type: 'income' },
      { name: 'Freelance', type: 'income' }
    ]).execute();

    // Filter for expense categories (should return empty)
    const result = await getCategories('expense' as TransactionType);

    expect(result).toEqual([]);
  });

  it('should handle categories with same name but different types', async () => {
    // Create categories with same name but different types
    await db.insert(categoriesTable).values([
      { name: 'Business', type: 'income' },
      { name: 'Business', type: 'expense' },
      { name: 'Travel', type: 'expense' }
    ]).execute();

    const incomeResult = await getCategories('income' as TransactionType);
    const expenseResult = await getCategories('expense' as TransactionType);
    const allResult = await getCategories();

    expect(incomeResult).toHaveLength(1);
    expect(incomeResult[0].name).toBe('Business');
    expect(incomeResult[0].type).toBe('income');

    expect(expenseResult).toHaveLength(2);
    const expenseNames = expenseResult.map(c => c.name);
    expect(expenseNames).toContain('Business');
    expect(expenseNames).toContain('Travel');

    expect(allResult).toHaveLength(3);
  });

  it('should maintain correct data types after database retrieval', async () => {
    // Create a test category
    await db.insert(categoriesTable).values({
      name: 'Test Category',
      type: 'income'
    }).execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    const category = result[0];

    // Verify all data types are correct
    expect(typeof category.id).toBe('number');
    expect(typeof category.name).toBe('string');
    expect(typeof category.type).toBe('string');
    expect(category.created_at).toBeInstanceOf(Date);
    
    // Verify enum values
    expect(['income', 'expense']).toContain(category.type);
  });
});