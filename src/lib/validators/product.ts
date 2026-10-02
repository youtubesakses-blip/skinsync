// src/lib/validators/product.ts
// Zod validators untuk produk dan varian

import { z } from "zod";

export const productSchema = z.object({
  brandId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  name: z.string().min(3, "Nama produk minimal 3 karakter").max(200),
  slug: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug hanya huruf kecil, angka, dan tanda -"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  ingredients: z.string().min(5),
  howToUse: z.string().min(5),
  bpomNumber: z.string().min(5, "Nomor BPOM wajib diisi"),
  isActive: z.boolean().default(true),
  skinTypeIds: z.array(z.number().int().positive()).default([]),
  skinConcernIds: z.array(z.number().int().positive()).default([]),
});

export const productVariantSchema = z.object({
  sku: z.string().min(3, "SKU minimal 3 karakter").max(50),
  name: z.string().min(1).max(100), // contoh: "30 ml"
  price: z.number().int().positive("Harga harus lebih dari 0"),
  comparePrice: z.number().int().positive().optional().nullable(),
  weightGram: z.number().int().min(0).default(0),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
});

export const stockAdjustSchema = z.object({
  variantId: z.number().int().positive(),
  qty: z.number().int(), // positif untuk IN, negatif untuk OUT
  type: z.enum(["IN", "OUT", "ADJUST"]),
  note: z.string().max(500).optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;
