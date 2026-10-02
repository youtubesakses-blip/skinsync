// src/app/api/admin/notifications/[id]/retry/route.ts
// Tombol kirim ulang WhatsApp per log

import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendFonnteMessage } from "@/lib/fonnte";
import type { Prisma } from "../../../../../../../generated/prisma/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const logId = parseInt(id, 10);

  const log = await db.notificationLog.findUnique({ where: { id: logId } });
  if (!log) {
    return Response.json({ error: "Log notifikasi tidak ditemukan" }, { status: 404 });
  }

  try {
    const result = await sendFonnteMessage(log.recipient, log.message);

    await db.notificationLog.update({
      where: { id: log.id },
      data: {
        status: "SENT",
        providerResponse: result as unknown as Prisma.InputJsonValue,
        sentAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    await db.notificationLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
      },
    });

    const message = error instanceof Error ? error.message : "Gagal kirim ulang WA";
    return Response.json({ error: message }, { status: 500 });
  }
}
