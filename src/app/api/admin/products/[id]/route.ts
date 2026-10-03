// src/app/api/admin/products/[id]/route.ts
import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObject } from "@/lib/storage";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const productId = parseInt(id, 10);

  try {
    const body = await request.json();

    const updated = await db.$transaction(async (tx) => {
      const data: Record<string, unknown> = {
        name: body.name,
        slug: body.slug,
        description: body.description,
        ingredients: body.ingredients,
        howToUse: body.howToUse,
        bpomNumber: body.bpomNumber,
        isActive: body.isActive,
        categoryId: body.categoryId ? Number(body.categoryId) : undefined,
        brandId: body.brandId ? Number(body.brandId) : undefined,
      };

      // Relasi kesesuaian kulit (opsional, hanya bila dikirim dari form edit)
      if (Array.isArray(body.skinTypeIds)) {
        const ids = (body.skinTypeIds as unknown[])
          .map(Number)
          .filter((n) => Number.isInteger(n) && n > 0);
        data.skinTypes = { set: ids.map((id) => ({ id })) };
      }
      if (Array.isArray(body.skinConcernIds)) {
        const ids = (body.skinConcernIds as unknown[])
          .map(Number)
          .filter((n) => Number.isInteger(n) && n > 0);
        data.skinConcerns = { set: ids.map((id) => ({ id })) };
      }

      const product = await tx.product.update({
        where: { id: productId },
        data,
      });

      // Sinkronisasi varian (tambah / ubah / hapus)
      if (Array.isArray(body.variants)) {
        const incoming = body.variants as Array<{
          id?: number;
          sku?: string;
          name?: string;
          price?: number;
          comparePrice?: number | null;
          weightGram?: number;
          stock?: number;
          minStock?: number;
          isActive?: boolean;
        }>;

        const existing = await tx.productVariant.findMany({
          where: { productId },
          include: {
            _count: { select: { orderItems: true, cartItems: true } },
          },
        });

        const incomingIds = new Set(
          incoming
            .map((v) => Number(v.id))
            .filter((n) => Number.isInteger(n) && n > 0)
        );

        // Hapus varian yang tidak lagi dikirim; yang sudah punya transaksi cukup dinonaktifkan
        for (const ev of existing) {
          if (!incomingIds.has(ev.id)) {
            const hasTransaction =
              ev._count.orderItems > 0 || ev._count.cartItems > 0;
            if (hasTransaction) {
              await tx.productVariant.update({
                where: { id: ev.id },
                data: { isActive: false },
              });
            } else {
              await tx.productVariant.delete({ where: { id: ev.id } });
            }
          }
        }

        // Validasi SKU duplikat dalam payload
        const skus = incoming
          .map((v) => String(v.sku || "").trim().toUpperCase())
          .filter(Boolean);
        if (new Set(skus).size !== skus.length) {
          throw new Error("SKU varian tidak boleh duplikat");
        }

        for (const v of incoming) {
          const sku = String(v.sku || "").trim().toUpperCase();
          const name = String(v.name || "").trim();
          const price = Number(v.price);
          if (!sku || !name || !Number.isFinite(price) || price <= 0) {
            throw new Error("Varian wajib punya SKU, nama, dan harga > 0");
          }
          const variantData = {
            sku,
            name,
            price,
            comparePrice:
              v.comparePrice != null && String(v.comparePrice) !== ""
                ? Number(v.comparePrice)
                : null,
            weightGram: Number(v.weightGram ?? 0) || 0,
            minStock: Number(v.minStock ?? 5) || 0,
            isActive: v.isActive !== false,
          };

          const variantId = Number(v.id);
          if (Number.isInteger(variantId) && variantId > 0) {
            const old = existing.find((e) => e.id === variantId);
            if (!old) continue;
            const newStock =
              v.stock != null && Number.isFinite(Number(v.stock))
                ? Math.max(0, Number(v.stock))
                : old.stock;
            await tx.productVariant.update({
              where: { id: variantId },
              data: { ...variantData, stock: newStock },
            });
            // Catat mutasi bila stok berubah lewat form edit
            if (newStock !== old.stock) {
              await tx.stockMovement.create({
                data: {
                  variantId,
                  type: "ADJUST",
                  qty: Math.abs(newStock - old.stock),
                  referenceType: "manual",
                  note: `Ubah stok via edit produk (${old.stock} → ${newStock})`,
                  createdBy: session.userId,
                },
              });
            }
          } else {
            await tx.productVariant.create({
              data: {
                productId,
                ...variantData,
                stock: Math.max(0, Number(v.stock ?? 0) || 0),
              },
            });
          }
        }
      }

      // Sinkronisasi gambar bila daftar images dikirim (pengganti penuh berurutan).
      // Format: images: [{ key: string, altText?: string }]
      if (Array.isArray(body.images)) {
        const incoming = (body.images as Array<{ key?: string; altText?: string }>)
          .filter((img) => typeof img?.key === "string" && img.key.length > 0)
          .slice(0, 8);

        const existing = await tx.productImage.findMany({
          where: { productId },
        });
        const incomingKeys = new Set(incoming.map((img) => img.key as string));

        // Hapus baris yang tidak lagi dipakai
        const removed = existing.filter((img) => !incomingKeys.has(img.key));
        if (removed.length > 0) {
          await tx.productImage.deleteMany({
            where: { id: { in: removed.map((img) => img.id) } },
          });
        }

        // Update urutan/altText yang dipertahankan, buat yang baru
        for (let i = 0; i < incoming.length; i++) {
          const item = incoming[i];
          const kept = existing.find((img) => img.key === item.key);
          if (kept) {
            await tx.productImage.update({
              where: { id: kept.id },
              data: { sortOrder: i, altText: item.altText || null },
            });
          } else {
            await tx.productImage.create({
              data: {
                productId,
                key: item.key as string,
                altText: item.altText || null,
                sortOrder: i,
              },
            });
          }
        }

        // Best effort hapus file yang tidak dipakai lagi dari bucket
        for (const img of removed) {
          deleteObject(img.key).catch(() => {});
        }
      }

      return product;
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "UPDATE_PRODUCT",
        entityType: "Product",
        entityId: updated.id,
        newValues: body,
      },
    });

    return Response.json({ success: true, product: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengupdate produk";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const productId = parseInt(id, 10);

  try {
    // Soft delete: set deletedAt = now() & isActive = false
    const product = await db.product.update({
      where: { id: productId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
      include: { images: true },
    });

    // Best effort hapus gambar di bucket
    for (const img of product.images) {
      deleteObject(img.key).catch(() => {});
    }

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "SOFT_DELETE_PRODUCT",
        entityType: "Product",
        entityId: product.id,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus produk";
    return Response.json({ error: message }, { status: 500 });
  }
}
