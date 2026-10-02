// src/app/api/admin/products/route.ts
import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { productSchema } from "@/lib/validators/product";

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Input tidak valid" }, { status: 400 });
    }

    const { skinTypeIds, skinConcernIds, ...data } = parsed.data;

    // Check duplicate slug
    const existing = await db.product.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return Response.json({ error: "Slug produk sudah digunakan" }, { status: 400 });
    }

    const newProduct = await db.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          ...data,
          skinTypes: {
            connect: skinTypeIds.map((id) => ({ id })),
          },
          skinConcerns: {
            connect: skinConcernIds.map((id) => ({ id })),
          },
        },
      });

      // Default variant jika diberikan di body
      if (Array.isArray(body.variants) && body.variants.length > 0) {
        for (const v of body.variants) {
          await tx.productVariant.create({
            data: {
              productId: prod.id,
              sku: v.sku,
              name: v.name,
              price: Number(v.price),
              comparePrice: v.comparePrice ? Number(v.comparePrice) : null,
              weightGram: Number(v.weightGram || 0),
              stock: Number(v.stock || 0),
              minStock: Number(v.minStock || 5),
              isActive: v.isActive !== false,
            },
          });
        }
      }

      // Hubungkan gambar jika diberikan
      if (Array.isArray(body.imageKeys) && body.imageKeys.length > 0) {
        for (let i = 0; i < body.imageKeys.length; i++) {
          await tx.productImage.create({
            data: {
              productId: prod.id,
              key: body.imageKeys[i],
              sortOrder: i,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: "CREATE_PRODUCT",
          entityType: "Product",
          entityId: prod.id,
          newValues: { name: prod.name, slug: prod.slug },
        },
      });

      return prod;
    });

    return Response.json({ success: true, product: newProduct });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat produk";
    return Response.json({ error: message }, { status: 500 });
  }
}
