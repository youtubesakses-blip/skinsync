// src/app/api/account/profile/route.ts
import { type NextRequest } from "next/server";
import { getSession, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validators/auth";

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Data profil tidak valid" }, { status: 400 });
    }

    const { name, skinTypeId, allergies } = parsed.data;

    const updatedUser = await db.user.update({
      where: { id: session.userId },
      data: {
        name,
        skinTypeId: skinTypeId || null,
        allergies: allergies || null,
      },
    });

    // Update JWT session cookie with new name
    await setSessionCookie({
      userId: updatedUser.id,
      role: updatedUser.role,
      phone: updatedUser.phone,
      name: updatedUser.name,
    });

    return Response.json({ success: true, user: updatedUser });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui profil";
    return Response.json({ error: message }, { status: 400 });
  }
}
