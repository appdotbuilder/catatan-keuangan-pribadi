import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Test inputs for different transaction types
const incomeTestInput: CreateCategoryInput = {
  name: 'Salary',
  type: 'income'
};

const expenseTestInput: CreateCategoryInput = {
  name: 'Groceries',
  type: 'expense'
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an income category', async () => {
    const result = await createCategory(incomeTestInput);

    // Basic field validation
    expect(result.name).toEqual('Salary');
    expect(result.type).toEqual('income');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an expense category', async () => {
    const result = await createCategory(expenseTestInput);

    // Basic field validation
    expect(result.name).toEqual('Groceries');
    expect(result.type).toEqual('expense');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save income category to database', async () => {
    const result = await createCategory(incomeTestInput);

    // Query using proper drizzle syntax
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Salary');
    expect(categories[0].type).toEqual('income');
    expect(categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should save expense category to database', async () => {
    const result = await createCategory(expenseTestInput);

    // Query using proper drizzle syntax
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Groceries');
    expect(categories[0].type).toEqual('expense');
    expect(categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple categories with unique ids', async () => {
    const incomeResult = await createCategory(incomeTestInput);
    const expenseResult = await createCategory(expenseTestInput);

    // Verify different IDs
    expect(incomeResult.id).not.toEqual(expenseResult.id);

    // Verify both are in database
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(2);
    
    const incomeCategory = allCategories.find(c => c.type === 'income');
    const expenseCategory = allCategories.find(c => c.type === 'expense');
    
    expect(incomeCategory).toBeDefined();
    expect(incomeCategory?.name).toEqual('Salary');
    expect(expenseCategory).toBeDefined();
    expect(expenseCategory?.name).toEqual('Groceries');
  });

  it('should handle special characters in category names', async () => {
    const specialCharInput: CreateCategoryInput = {
      name: 'Café & Restaurant Expenses',
      type: 'expense'
    };

    const result = await createCategory(specialCharInput);

    expect(result.name).toEqual('Café & Restaurant Expenses');
    expect(result.type).toEqual('expense');

    // Verify in database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories[0].name).toEqual('Café & Restaurant Expenses');
  });

  it('should create categories with long names', async () => {
    const longNameInput: CreateCategoryInput = {
      name: 'Professional Development and Training Courses for Career Advancement',
      type: 'expense'
    };

    const result = await createCategory(longNameInput);

    expect(result.name).toEqual('Professional Development and Training Courses for Career Advancement');
    expect(result.type).toEqual('expense');

    // Verify in database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories[0].name).toEqual('Professional Development and Training Courses for Career Advancement');
  });

  it('should create categories with same name but different types', async () => {
    const freelanceIncomeInput: CreateCategoryInput = {
      name: 'Freelance',
      type: 'income'
    };

    const freelanceExpenseInput: CreateCategoryInput = {
      name: 'Freelance',
      type: 'expense'
    };

    const incomeResult = await createCategory(freelanceIncomeInput);
    const expenseResult = await createCategory(freelanceExpenseInput);

    // Both should be created successfully
    expect(incomeResult.name).toEqual('Freelance');
    expect(incomeResult.type).toEqual('income');
    expect(expenseResult.name).toEqual('Freelance');
    expect(expenseResult.type).toEqual('expense');

    // Verify both exist in database
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(2);
    expect(allCategories.some(c => c.name === 'Freelance' && c.type === 'income')).toBe(true);
    expect(allCategories.some(c => c.name === 'Freelance' && c.type === 'expense')).toBe(true);
  });
});