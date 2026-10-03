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
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          name: body.name,
          slug: body.slug,
          description: body.description,
          ingredients: body.ingredients,
          howToUse: body.howToUse,
          bpomNumber: body.bpomNumber,
          isActive: body.isActive,
          categoryId: body.categoryId ? Number(body.categoryId) : undefined,
          brandId: body.brandId ? Number(body.brandId) : undefined,
        },
      });

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
