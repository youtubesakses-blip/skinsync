// src/lib/midtrans.ts
// Konfigurasi Midtrans Snap untuk pembayaran

export interface MidtransSnapParams {
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  item_details?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  customer_details?: {
    first_name?: string;
    phone?: string;
  };
  expiry?: {
    start_time: string;  // format: "yyyy-MM-dd HH:mm:ss Z"
    unit: "minute" | "hour" | "day";
    duration: number;
  };
}

export interface MidtransSnapResponse {
  token: string;
  redirect_url: string;
}

function getCredentials() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.MIDTRANS_CLIENT_KEY;
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

  if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY wajib diisi");

  return { serverKey, clientKey, isProduction };
}

function getSnapBaseUrl(isProduction: boolean): string {
  return isProduction
    ? "https://app.midtrans.com/snap/v1"
    : "https://app.sandbox.midtrans.com/snap/v1";
}

/**
 * Buat transaksi Midtrans Snap dan dapatkan snap_token + redirect_url.
 */
export async function createSnapTransaction(
  params: MidtransSnapParams
): Promise<MidtransSnapResponse> {
  const { serverKey, isProduction } = getCredentials();
  const baseUrl = getSnapBaseUrl(isProduction);

  const authString = Buffer.from(`${serverKey}:`).toString("base64");

  const response = await fetch(`${baseUrl}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${authString}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Midtrans API error ${response.status}: ${errorBody}`);
  }

  return response.json() as Promise<MidtransSnapResponse>;
}

/**
 * Verifikasi signature dari webhook Midtrans.
 * signature_key = SHA512(order_id + status_code + gross_amount + SERVER_KEY)
 */
export async function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): Promise<boolean> {
  const { serverKey } = getCredentials();

  const raw = `${orderId}${statusCode}${grossAmount}${serverKey}`;

  // Gunakan Web Crypto API (tersedia di Node.js 18+)
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex === signatureKey;
}

/**
 * Dapatkan Midtrans client key untuk digunakan di frontend Snap.
 */
export function getMidtransClientKey(): string {
  const { clientKey } = getCredentials();
  return clientKey ?? "";
}

export function getMidtransSnapScriptUrl(isProduction: boolean): string {
  return isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}
