// src/server/services/order.ts
// Service order: createOrder transaksional dengan row lock, expire order, complete order

import { db } from "@/lib/db";
import { validateVoucher, rollbackVoucher } from "./voucher";
import { createSnapTransaction } from "@/lib/midtrans";
import { sendWhatsApp } from "./notification";
import { formatRupiah } from "@/lib/money";
import type { Address, ShippingZone } from "../../../generated/prisma/client";

const DEFAULT_EXPIRY_HOURS = 24;

/**
 * Generate nomor pesanan unik: SKN-YYYYMMDD-XXXX
 */
function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `SKN-${date}-${random}`;
}

/**
 * Base URL aplikasi tanpa trailing slash agar tidak menghasilkan "//" di link WA.
 * APP_URL di Railway sering diisi dengan trailing slash (mis. "...up.railway.app/").
 */
function getAppBaseUrl(): string {
  const raw = process.env.APP_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function buildOrderUrl(orderNumber: string): string {
  return `${getAppBaseUrl()}/account/orders/${orderNumber}`;
}

/**
 * Format datetime ke WIB untuk pesan WA.
 */
function formatDateWIB(date: Date): string {
  return date.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface CreateOrderParams {
  userId: number;
  address: Address;
  shippingZone: ShippingZone;
  voucherCode?: string;
  customerNote?: string;
}

/**
 * Buat pesanan baru dalam satu transaksi database.
 * Urutan sesuai plan.md 6.3.
 */
export async function createOrder(params: CreateOrderParams) {
  const { userId, address, shippingZone, voucherCode, customerNote } = params;

  // Ambil masa berlaku bayar dari Setting atau default 24 jam
  const expirySetting = await db.setting.findUnique({
    where: { key: "order_expiry_hours" },
  });
  const expiryHours =
    expirySetting && typeof expirySetting.value === "number"
      ? (expirySetting.value as number)
      : DEFAULT_EXPIRY_HOURS;

  const order = await db.$transaction(async (tx) => {
    // 1. Ambil item keranjang user
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error("Keranjang kosong");
    }

    // 2. Lock baris varian dan cek stok dengan SELECT FOR UPDATE (raw query)
    const variantIds = cart.items.map((i) => i.variantId);
    const lockedVariants = await tx.$queryRawUnsafe<
      Array<{ id: number; stock: number; isActive: boolean; name: string; price: number }>
    >(
      `SELECT id, stock, "isActive", name, price FROM "ProductVariant" WHERE id = ANY($1::int[]) FOR UPDATE`,
      variantIds
    );

    const variantMap = new Map(lockedVariants.map((v) => [v.id, v]));

    // Validasi stok
    for (const item of cart.items) {
      const variant = variantMap.get(item.variantId);
      if (!variant) throw new Error(`Varian ${item.variantId} tidak ditemukan`);
      if (!variant.isActive) throw new Error(`Produk "${variant.name}" tidak aktif`);
      if (variant.stock < item.qty) {
        throw new Error(`Stok "${variant.name}" tidak cukup (tersedia: ${variant.stock})`);
      }
    }

    // 3. Hitung subtotal
    let subtotal = 0;
    for (const item of cart.items) {
      const variant = variantMap.get(item.variantId)!;
      subtotal += variant.price * item.qty;
    }

    const shippingCost = shippingZone.cost;

    // 4. Validasi voucher
    let discountTotal = 0;
    let voucherId: number | undefined;
    let validatedVoucher = null;

    if (voucherCode) {
      const voucherResult = await validateVoucher(
        voucherCode,
        userId,
        subtotal,
        shippingCost
      );
      if (!voucherResult.valid) {
        throw new Error(voucherResult.error ?? "Voucher tidak valid");
      }
      discountTotal = voucherResult.discountAmount!;
      voucherId = voucherResult.voucher!.id;
      validatedVoucher = voucherResult.voucher!;
    }

    // grandTotal tidak boleh < 0
    const grandTotal = Math.max(0, subtotal - discountTotal + shippingCost);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);
    const orderNumber = generateOrderNumber();

    // 5. Buat Order, OrderItem, OrderStatusHistory
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        userId,
        status: "PENDING_PAYMENT",
        subtotal,
        discountTotal,
        shippingCost,
        grandTotal,
        voucherId,
        shippingZoneId: shippingZone.id,
        recipientName: address.recipientName,
        recipientPhone: address.phone,
        shipProvince: address.province,
        shipCity: address.city,
        shipDistrict: address.district,
        shipPostalCode: address.postalCode,
        shipAddress: address.addressLine,
        customerNote,
        expiresAt,
        items: {
          create: cart.items.map((item) => {
            const variant = variantMap.get(item.variantId)!;
            return {
              variantId: item.variantId,
              productName: item.variant.product.name,
              variantName: variant.name,
              sku: item.variant.sku,
              price: variant.price,
              qty: item.qty,
              subtotal: variant.price * item.qty,
            };
          }),
        },
        histories: {
          create: {
            fromStatus: null,
            toStatus: "PENDING_PAYMENT",
            note: "Pesanan dibuat",
          },
        },
      },
    });

    // 6. Kurangi stok dan catat StockMovement RESERVE
    for (const item of cart.items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.qty } },
      });

      await tx.stockMovement.create({
        data: {
          variantId: item.variantId,
          type: "RESERVE",
          qty: item.qty,
          referenceType: "order",
          referenceId: newOrder.id,
          note: `Reservasi untuk pesanan ${orderNumber}`,
        },
      });
    }

    // 7. Buat VoucherUsage jika pakai voucher
    if (voucherId && validatedVoucher) {
      await tx.voucherUsage.create({
        data: { voucherId, userId, orderId: newOrder.id },
      });
      await tx.voucher.update({
        where: { id: voucherId },
        data: { usedCount: { increment: 1 } },
      });
    }

    // 8. Kosongkan keranjang
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return newOrder;
  });

  // Setelah transaksi: buat transaksi Midtrans Snap (batas bayar tetap 24 jam)
  let snapToken: string | undefined;
  let redirectUrl: string | undefined;
  let midtransError: string | undefined;

  // start_time Midtrans harus WAKTU SEKARANG (bukan expiresAt), format "yyyy-MM-dd HH:mm:ss +0700"
  const nowForMidtrans = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const startTimeStr =
    `${nowForMidtrans.getFullYear()}-${pad(nowForMidtrans.getMonth() + 1)}-${pad(nowForMidtrans.getDate())} ` +
    `${pad(nowForMidtrans.getHours())}:${pad(nowForMidtrans.getMinutes())}:${pad(nowForMidtrans.getSeconds())} +0700`;

  try {
    const orderUser = await db.user.findUnique({ where: { id: userId } });

    // SENGAJA tanpa item_details: Midtrans memvalidasi
    // gross_amount == sum(item price*qty) dan batas panjang nama item.
    // Ongkir + diskon membuat rincian sulit balance (harga negatif tidak diterima),
    // sehingga request selalu ditolak. Tanpa item_details, Snap hanya pakai
    // gross_amount dan halaman bayar tetap tampil normal (nama merchant + total).
    const snapResponse = await createSnapTransaction({
      transaction_details: {
        order_id: order.orderNumber,
        gross_amount: order.grandTotal,
      },
      customer_details: {
        first_name: (orderUser?.name ?? "Pelanggan").slice(0, 20),
        phone: orderUser?.phone ?? "",
      },
      expiry: {
        start_time: startTimeStr,
        unit: "hour" as const,
        duration: 24,
      },
    });

    snapToken = snapResponse.token;
    redirectUrl = snapResponse.redirect_url;

    // Simpan Payment record
    await db.payment.create({
      data: {
        orderId: order.id,
        midtransOrderId: order.orderNumber,
        snapToken,
        redirectUrl,
        amount: order.grandTotal,
        status: "PENDING",
        expiresAt: order.expiresAt,
      },
    });
  } catch (error) {
    midtransError = error instanceof Error ? error.message : "Gagal membuat transaksi Midtrans";
    console.error("[order] Gagal membuat transaksi Midtrans:", error);
    // Tetap buat Payment PENDING tanpa token agar user bisa retry dari halaman pesanan.
    try {
      await db.payment.create({
        data: {
          orderId: order.id,
          midtransOrderId: order.orderNumber,
          amount: order.grandTotal,
          status: "PENDING",
          expiresAt: order.expiresAt,
        },
      });
    } catch (dbErr) {
      console.error("[order] Gagal membuat Payment fallback:", dbErr);
    }
  }

  // Kirim notifikasi WA (batas bayar tetap 24 jam).
  // paymentUrl pakai buildOrderUrl agar tidak ada "//" ganda yang bikin 404.
  // Prioritas link pembayaran Midtrans langsung (tanpa login), fallback ke halaman order.
  const user = await db.user.findUnique({ where: { id: userId } });
  if (user) {
    await sendWhatsApp(
      user.phone,
      "order_created",
      {
        name: user.name,
        orderNumber: order.orderNumber,
        total: formatRupiah(order.grandTotal),
        expiresAt: formatDateWIB(order.expiresAt),
        paymentUrl: redirectUrl ?? buildOrderUrl(order.orderNumber),
      },
      order.id
    );
  }

  return { order, snapToken, redirectUrl, midtransError };
}

/**
 * Expire order yang belum dibayar melewati batas waktu.
 * Dipanggil dari cron job.
 */
export async function expireOverdueOrders(): Promise<number> {
  const now = new Date();

  const overdueOrders = await db.order.findMany({
    where: {
      status: "PENDING_PAYMENT",
      expiresAt: { lt: now },
    },
    include: { items: true, user: true },
    take: 50,
  });

  let expiredCount = 0;

  for (const order of overdueOrders) {
    await db.$transaction(async (tx) => {
      // Update status order
      await tx.order.update({
        where: { id: order.id },
        data: { status: "EXPIRED" },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: "PENDING_PAYMENT",
          toStatus: "EXPIRED",
          note: "Kedaluwarsa otomatis",
        },
      });

      // Kembalikan stok (RELEASE)
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.qty } },
        });

        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            type: "RELEASE",
            qty: item.qty,
            referenceType: "order",
            referenceId: order.id,
            note: `Pengembalian stok dari pesanan kedaluwarsa ${order.orderNumber}`,
          },
        });
      }

      // Rollback voucher (dalam transaksi yang sama)
      if (order.voucherId) {
        await rollbackVoucher(order.id, order.voucherId, tx);
      }

      // Update payment ke EXPIRED
      await tx.payment.updateMany({
        where: { orderId: order.id, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
    });

    // Kirim notifikasi WA
    await sendWhatsApp(
      order.user.phone,
      "order_expired",
      { name: order.user.name, orderNumber: order.orderNumber },
      order.id
    );

    expiredCount++;
  }

  return expiredCount;
}

/**
 * Auto-complete pesanan yang sudah SHIPPED lebih dari 7 hari.
 */
export async function autoCompleteOrders(): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const shippedOrders = await db.order.findMany({
    where: {
      status: "SHIPPED",
      shippedAt: { lt: sevenDaysAgo },
    },
    take: 50,
  });

  let completedCount = 0;

  for (const order of shippedOrders) {
    const now = new Date();
    await db.order.update({
      where: { id: order.id },
      data: { status: "COMPLETED", completedAt: now },
    });

    await db.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: "SHIPPED",
        toStatus: "COMPLETED",
        note: "Selesai otomatis setelah 7 hari pengiriman",
      },
    });

    completedCount++;
  }

  return completedCount;
}
