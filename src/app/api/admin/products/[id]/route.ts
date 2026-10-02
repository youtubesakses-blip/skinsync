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

    const product = await db.product.update({
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

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "UPDATE_PRODUCT",
        entityType: "Product",
        entityId: product.id,
        newValues: body,
      },
    });

    return Response.json({ success: true, product });
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
