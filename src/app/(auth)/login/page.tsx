// src/app/(auth)/login/page.tsx
// Halaman login OTP: input nomor HP → input OTP
// Dua langkah dalam satu halaman dengan state management client-side

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isValidPhone } from "@/lib/phone";

type Step = "phone" | "otp";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";

  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const phone = `62${phoneNumber}`;

  // Hitung mundur cooldown
  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        cooldownSeconds?: number;
      };

      if (!res.ok) {
        setError(data.error ?? "Gagal mengirim OTP");
        if (data.cooldownSeconds) startCooldown(data.cooldownSeconds);
        return;
      }

      setStep("otp");
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        isNewUser?: boolean;
      };

      if (!res.ok) {
        setError(data.error ?? "OTP tidak valid");
        return;
      }

      // Jika user baru, arahkan ke halaman profil untuk isi nama
      if (data.isNewUser) {
        router.push("/account?welcome=1");
      } else {
        router.push(nextPath);
      }

      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        cooldownSeconds?: number;
      };

      if (!res.ok) {
        setError(data.error ?? "Gagal kirim ulang OTP");
        if (data.cooldownSeconds) startCooldown(data.cooldownSeconds);
      } else {
        startCooldown(60);
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4] text-[#070707] py-12 px-4">
      <div className="max-w-md w-full">
        <p className="furniture text-[#070707]/50 text-center mb-4">Masuk — OTP WhatsApp</p>
        <h1 className="display-tight text-5xl font-medium text-center">SkinSync<em className="italic font-normal">.</em></h1>
          <p className="mt-3 italic text-center text-[#070707]/60">
            {step === "phone"
              ? "Masukkan nomor WhatsApp Anda"
              : "Masukkan kode OTP dari WhatsApp"}
          </p>

        <div className="mt-8 border-y border-[#070707] py-8">
          {step === "phone" ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nomor WhatsApp
                </label>
                <div className="flex">
                  <span
                    aria-hidden="true"
                    className="inline-flex items-center px-3 border border-r-0 border-[#070707] bg-[#F1F1ED]"
                  >
                    62
                  </span>
                  <input
                    id="phone"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{8,13}"
                    maxLength={13}
                    value={phoneNumber}
                    onChange={(e) =>
                      setPhoneNumber(
                        e.target.value.replace(/\D/g, "").replace(/^0+/, "")
                      )
                    }
                    placeholder="8123456789"
                    required
                    aria-describedby="phone-hint"
                    className="w-full px-3 py-2 border border-[#070707] bg-transparent focus:outline-none focus:border-[#EF6F79]"
                  />
                </div>
                <p id="phone-hint" className="mt-1 text-xs text-gray-500">
                  Masukkan nomor setelah 62, tanpa angka 0 di depan.
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !isValidPhone(phone)}
                className="w-full flex justify-center py-3 px-4 furniture text-white bg-[#EF6F79] hover:bg-[#070707] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Mengirim..." : "Kirim OTP via WhatsApp"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  OTP dikirim ke{" "}
                  <span className="font-semibold">{phone}</span>.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                      setError("");
                    }}
                    className="text-indigo-600 hover:underline"
                  >
                    Ganti nomor
                  </button>
                </p>
                <label
                  htmlFor="otp"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Kode OTP (6 digit)
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  required
                  autoFocus
                  className="w-full px-3 py-2 border border-[#070707] bg-transparent focus:outline-none focus:border-[#EF6F79] text-center text-2xl tracking-widest"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full flex justify-center py-3 px-4 furniture text-white bg-[#EF6F79] hover:bg-[#070707] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Memverifikasi..." : "Verifikasi OTP"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || loading}
                  className="text-sm text-indigo-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                >
                  {cooldown > 0
                    ? `Kirim ulang dalam ${cooldown}s`
                    : "Kirim ulang OTP"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-500">
          Dengan masuk, Anda menyetujui Kebijakan Privasi dan Syarat & Ketentuan
          SkinSync.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-500">Memuat...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
