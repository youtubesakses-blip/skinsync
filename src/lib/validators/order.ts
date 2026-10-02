// src/lib/validators/order.ts
// Zod validators untuk checkout dan order

import { z } from "zod";

export const addressSchema = z.object({
  label: z.string().min(2).max(50),
  recipientName: z.string().min(2).max(100),
  phone: z.string().min(9).max(15),
  province: z.string().min(3).max(100),
  city: z.string().min(3).max(100),
  district: z.string().min(3).max(100),
  postalCode: z.string().min(5).max(10),
  addressLine: z.string().min(10).max(500),
  isDefault: z.boolean().default(false),
});

export const checkoutSchema = z.object({
  addressId: z.number().int().positive("Pilih alamat pengiriman"),
  shippingZoneId: z.number().int().positive("Pilih zona pengiriman"),
  voucherCode: z.string().optional(),
  customerNote: z.string().max(500).optional(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.number().int().positive(),
  status: z.enum(["PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"]),
  note: z.string().max(500).optional(),
  courierName: z.string().max(100).optional(),
  trackingNumber: z.string().max(100).optional(),
  adminNote: z.string().max(500).optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
