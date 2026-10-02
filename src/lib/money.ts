// src/lib/money.ts
// Utilitas format mata uang Rupiah (IDR)
// Semua nilai uang disimpan sebagai Int (rupiah, tanpa desimal)

const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Format angka ke string Rupiah, contoh: 150000 → "Rp 150.000"
 */
export function formatRupiah(amount: number): string {
  return formatter.format(amount);
}

/**
 * Parse string Rupiah ke angka integer
 * "150.000" → 150000
 */
export function parseRupiah(value: string): number {
  return parseInt(value.replace(/\D/g, ""), 10) || 0;
}
