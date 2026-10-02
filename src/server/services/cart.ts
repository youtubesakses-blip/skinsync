// src/server/services/cart.ts
// Service pengelolaan keranjang belanja
// Keranjang hanya untuk user yang login

import { db } from "@/lib/db";

export async function getOrCreateCart(userId: number) {
  let cart = await db.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  images: { orderBy: { sortOrder: "asc" }, take: 1 },
                },
              },
            },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!cart) {
    cart = await db.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: { orderBy: { sortOrder: "asc" }, take: 1 },
                  },
                },
              },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    });
  }

  return cart;
}

export async function addItemToCart(userId: number, variantId: number, qty: number) {
  if (qty < 1) throw new Error("Jumlah harus minimal 1");

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });

  if (!variant || !variant.isActive || !variant.product.isActive || variant.product.deletedAt) {
    throw new Error("Produk atau varian tidak tersedia");
  }

  if (variant.stock < qty) {
    throw new Error(`Stok tidak mencukupi. Tersedia: ${variant.stock}`);
  }

  const cart = await getOrCreateCart(userId);

  const existingItem = cart.items.find((item) => item.variantId === variantId);

  if (existingItem) {
    const newQty = existingItem.qty + qty;
    if (newQty > variant.stock) {
      throw new Error(`Total pembelian melebihi stok yang tersedia (${variant.stock})`);
    }

    return db.cartItem.update({
      where: { id: existingItem.id },
      data: { qty: newQty },
    });
  }

  return db.cartItem.create({
    data: {
      cartId: cart.id,
      variantId,
      qty,
    },
  });
}

export async function updateCartItemQuantity(userId: number, itemId: number, qty: number) {
  const item = await db.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true, variant: true },
  });

  if (!item || item.cart.userId !== userId) {
    throw new Error("Item keranjang tidak ditemukan");
  }

  if (qty <= 0) {
    return db.cartItem.delete({ where: { id: itemId } });
  }

  if (qty > item.variant.stock) {
    throw new Error(`Stok hanya tersisa ${item.variant.stock}`);
  }

  return db.cartItem.update({
    where: { id: itemId },
    data: { qty },
  });
}

export async function removeCartItem(userId: number, itemId: number) {
  const item = await db.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true },
  });

  if (!item || item.cart.userId !== userId) {
    throw new Error("Item tidak ditemukan");
  }

  return db.cartItem.delete({ where: { id: itemId } });
}
