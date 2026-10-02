// src/app/api/account/addresses/route.ts
import { type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { addressSchema } from "@/lib/validators/order";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const addresses = await db.address.findMany({
    where: { userId: session.userId },
    orderBy: [{ isDefault: "desc" }, { id: "desc" }],
  });

  return Response.json({ addresses });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Data alamat tidak valid" }, { status: 400 });
    }

    const { isDefault, ...rest } = parsed.data;

    // Jika dijadikan default, reset default lama
    if (isDefault) {
      await db.address.updateMany({
        where: { userId: session.userId },
        data: { isDefault: false },
      });
    }

    // Jika ini alamat pertama, otomatis set default
    const count = await db.address.count({ where: { userId: session.userId } });
    const shouldBeDefault = isDefault || count === 0;

    const newAddress = await db.address.create({
      data: {
        ...rest,
        isDefault: shouldBeDefault,
        userId: session.userId,
      },
    });

    return Response.json({ success: true, address: newAddress });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menambahkan alamat";
    return Response.json({ error: message }, { status: 400 });
  }
}
