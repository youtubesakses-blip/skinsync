// src/lib/fonnte.ts
// Wrapper Fonnte API untuk kirim pesan WhatsApp

const FONNTE_API_URL = "https://api.fonnte.com/send";

export interface FonnteResponse {
  status: boolean;
  message?: string;
  [key: string]: unknown;
}

/**
 * Kirim pesan WhatsApp via Fonnte API.
 * @param target Nomor tujuan format 62xxxxxxxxxx
 * @param message Isi pesan
 * @returns Response JSON dari Fonnte
 */
export async function sendFonnteMessage(
  target: string,
  message: string
): Promise<FonnteResponse> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    throw new Error("FONNTE_TOKEN tidak diisi di environment variables");
  }

  const response = await fetch(FONNTE_API_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target,
      message,
      delay: "2", // jeda minimal 2 detik sesuai aturan bisnis
    }),
  });

  if (!response.ok) {
    throw new Error(`Fonnte API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<FonnteResponse>;
}
