// src/lib/phone.ts
// Normalisasi nomor HP ke format 62xxxxxxxxxx

/**
 * Normalisasi nomor HP ke format internasional Indonesia: 62xxxxxxxxxx
 * Input: 08123456789, +628123456789, 628123456789 → 628123456789
 */
export function normalizePhone(phone: string): string {
  // Hapus semua karakter non-digit
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("62")) {
    return digits;
  } else if (digits.startsWith("0")) {
    return "62" + digits.slice(1);
  } else if (digits.startsWith("8")) {
    return "62" + digits;
  }

  // Kembalikan apa adanya jika format tidak dikenali
  return digits;
}

/**
 * Validasi apakah nomor sudah dalam format 62xxxxxxxxxx
 * Panjang minimal 10 digit, maksimal 15 digit (standar internasional)
 */
export function isValidPhone(phone: string): boolean {
  return /^62[0-9]{8,13}$/.test(phone);
}

/**
 * Format nomor ke tampilan lokal: 628123456789 → 0812-3456-789
 */
export function displayPhone(phone: string): string {
  // Ganti 62 dengan 0
  const local = "0" + phone.slice(2);
  // Format: 0812-3456-7890 (4-4-4 atau 4-4-3)
  return local.replace(/^(\d{4})(\d{4})(\d{3,4})$/, "$1-$2-$3");
}
