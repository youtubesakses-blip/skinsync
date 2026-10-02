// src/app/api/vouchers/validate/route.ts
import { type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { validateVoucher } from "@/server/services/voucher";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(1, "Masukkan kode voucher"),
  subtotal: z.number().int().nonnegative(),
  shippingCost: z.number().int().nonnegative(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Parameter tidak valid" }, { status: 400 });
    }

    const { code, subtotal, shippingCost } = parsed.data;
    const result = await validateVoucher(code, session.userId, subtotal, shippingCost);

    if (!result.valid) {
      return Response.json({ valid: false, error: result.error }, { status: 400 });
    }

    return Response.json({
      valid: true,
      voucher: {
        id: result.voucher?.id,
        code: result.voucher?.code,
        type: result.voucher?.type,
        value: result.voucher?.value,
      },
      discountAmount: result.discountAmount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memvalidasi voucher";
    return Response.json({ error: message }, { status: 500 });
  }
}
