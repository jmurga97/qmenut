import { z } from "zod";

export const branchScopedSchema = z.object({
  branchId: z.string().trim().min(1),
});

const nullableText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

export const categoryWriteSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: nullableText,
  imageUrl: nullableText,
  position: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const createCategorySchema = branchScopedSchema.extend({
  data: categoryWriteSchema,
});

export const updateCategorySchema = z.object({
  categoryId: z.string().trim().min(1),
  data: categoryWriteSchema,
});

export const dishWriteSchema = z.object({
  categoryId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(200),
  description: nullableText,
  price: z.number().int().min(0),
  imageUrl: nullableText,
  position: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isRecommended: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

export const createDishSchema = branchScopedSchema.extend({
  data: dishWriteSchema,
});

export const updateDishSchema = z.object({
  dishId: z.string().trim().min(1),
  branchId: z.string().trim().min(1),
  data: dishWriteSchema,
});

export const dishRelationsSchema = z.object({
  dishId: z.string().trim().min(1),
  tagIds: z.array(z.string().trim().min(1)).default([]),
  allergenIds: z.array(z.number().int().positive()).default([]),
  extraIngredientIds: z.array(z.string().trim().min(1)).default([]),
});

export const createIngredientSchema = z.object({
  name: z.string().trim().min(1).max(200),
  price: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
