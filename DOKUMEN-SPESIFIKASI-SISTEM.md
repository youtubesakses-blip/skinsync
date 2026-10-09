# DOKUMEN SPESIFIKASI SISTEM — SKINSYNC (E-Commerce Skincare DTC)

> **Status:** Draf bahan dokumen spesifikasi — disusun dari **bedah kode aktual** (`prisma/schema.prisma`, `prisma/seed.ts`, `src/proxy.ts`, `src/lib/*`, `src/server/services/*`, `src/app/api/**`, halaman & komponen), bukan sekadar ringkasan `plan.md`.
> **Tujuan dokumen ini:** menjadi fondasi untuk dokumen spesifikasi formal (SRS / SKPL / proposal / dokumentasi teknis). Semua klaim di bawah merujuk pada implementasi yang ada di repo.
> **Bahasa UI / mata uang / zona waktu:** Indonesia, IDR (Int, tanpa desimal), simpan UTC → tampil Asia/Jakarta (WIB).

---

## DAFTAR ISI

1. [Identifikasi & Ringkasan Sistem](#1-identifikasi--ringkasan-sistem)
2. [Tujuan, Ruang Lingkup & Batasan](#2-tujuan-ruang-lingkup--batasan)
3. [Pemangku Kepentingan & Peran Pengguna](#3-pemangku-kepentingan--peran-pengguna)
4. [Arsitektur & Tech Stack Aktual](#4-arsitektur--tech-stack-aktual)
5. [Struktur Folder & Modul](#5-struktur-folder--modul)
6. [Model Data (Skema Aktual)](#6-model-data-skema-aktual)
7. [Alur Bisnis End-to-End](#7-alur-bisnis-end-to-end)
8. [Spesifikasi API](#8-spesifikasi-api)
9. [Spesifikasi Halaman & UI](#9-spesifikasi-halaman--ui)
10. [Validasi, Keamanan & Audit](#10-validasi-keamanan--audit)
11. [Notifikasi WhatsApp (Fonnte)](#11-notifikasi-whatsapp-fonnte)
12. [Gambar & Storage](#12-gambar--storage)
13. [Cron, Health & Operasional](#13-cron-health--operasional)
14. [Environment & Deployment](#14-environment--deployment)
15. [Kesenjangan Implementasi vs `plan.md`](#15-kesenjangan-implementasi-vs-planmd)
16. [Definition of Done & Risiko](#16-definition-of-done--risiko)
17. [Lampiran untuk Dokumen Formal](#17-lampiran-untuk-dokumen-formal)

---

## 1. Identifikasi & Ringkasan Sistem

| Atribut | Isi |
|---|---|
| Nama sistem | **SkinSync** — website e-commerce direct-to-consumer satu brand skincare |
| Pasar | Indonesia (Bahasa Indonesia, IDR) |
| Jenis aplikasi | Next.js App Router monolit (frontend + backend satu repo) |
| Versi acuan | Next.js `16.3.8`, React `19.2.8`, Prisma `7.10.0`, `package.json` scripts: `dev`, `build: prisma generate && next build`, `start: prisma migrate deploy && next start`, `lint`, `db:seed: tsx prisma/seed.ts` |
| Prinsip arsitektur | Logika bisnis di `src/server/services/*`; akses DB tunggal via `src/lib/db.ts`; mutasi via Route Handlers; validasi Zod di server; uang `Int` rupiah; waktu UTC di DB |
| Aturan keras | (1) Checkout & keranjang **wajib login** — tidak ada guest checkout. (2) Voucher hanya untuk user login. (3) Notifikasi **hanya WhatsApp (Fonnte)**, tanpa email. (4) Tanpa flash sale. (5) Ongkir **flat per zona** (admin), resi manual, tanpa API kurir. (6) Tanpa loyalty/wishlist/retur/blog/referral/multi-bahasa. |

**Alur nilai utama (happy path):**

```
Lihat katalog (guest boleh)
  → Tambah keranjang (wajib login, jika guest → /login?next=...)
  → Checkout 3 langkah (alamat → zona+voucher → bayar)
  → createOrder transaksional (lock stok, hitung total, reserve stok, buat Payment)
  → Bayar via Midtrans Snap
  → Webhook verifikasi → PAID → admin PROCESSING → SHIPPED (+resi, WA) → COMPLETED (manual / cron 7 hari)
  → Pelanggan tulis ulasan (moderasi admin) → rating produk ter-update
```

---

## 2. Tujuan, Ruang Lingkup & Batasan

### 2.1 Tujuan

1. Menyediakan kanal penjualan DTC yang sederhana dan andal untuk satu brand skincare.
2. Menjamin konsistensi stok/pesanan/pembayaran lewat transaksi database dan webhook idempoten.
3. Mengurangi operasional manual lewat WA otomatis, cron kedaluwarsa/auto-complete, dan dashboard admin.

### 2.2 Ruang lingkup (IN SCOPE — sesuai kode aktual)

- Katalog publik: pencarian, filter (kategori, jenis/masalah kulit, brand, harga), sort, pagination, detail produk + BPOM + ulasan approved.
- Auth OTP WhatsApp (login = registrasi), sesi cookie JWT 30 hari.
- Keranjang per-user, buku alamat, checkout, voucher, ongkir flat pilihan zona.
- Pembayaran Midtrans Snap + webhook + tombol bayar ulang.
- Fulfilment admin: ubah status, input kurir/resi, catatan, riwayat WA.
- Ulasan terverifikasi + moderasi + agregat rating.
- Admin: produk/varian/gambar, stok + movement, shipping zone, voucher, ulasan, laporan + ekspor CSV, kelola admin, pengaturan + template WA.
- Infra: healthcheck, 3 cron (expire, retry-notif, complete), image upload/proxy, audit log.

### 2.3 Batasan / OUT OF SCOPE

- Tidak ada guest checkout, tidak ada email, tidak ada integrasi kurir, tidak ada flash sale.
- Ongkir bukan hasil matching alamat otomatis — **user memilih `shippingZoneId` manual** dari daftar aktif (penyederhanaan dari rencana awal di `plan.md`).
- Tidak ada modul Banner (telah dihapus via migrasi `remove_banner_module`); beranda memakai hero statis + rel produk.
- Storage aktual memakai **Supabase Storage (public URL)**, bukan Railway Bucket S3 privat (lihat §12, §15).

---

## 3. Pemangku Kepentingan & Peran Pengguna

| Peran (`Role`) | Hak akses |
|---|---|
| `CUSTOMER` | Belanja, keranjang, checkout, pesanan sendiri, alamat, profil kulit, ulasan |
| `ADMIN` | Semua operasional: produk, stok, pesanan, ongkir, voucher, ulasan, laporan, upload gambar, retry notif |
| `SUPER_ADMIN` | Semua hak `ADMIN` + `/admin/users` (tambah/blokir/hapus admin) + `/admin/settings` (template WA, info toko) |
| Guest (bukan peran DB) | Hanya lihat katalog/FAQ/kebijakan; aksi beli diarahkan ke login |

**Penegakan akses (dua lapis):**

1. **Halaman** — `src/proxy.ts` (`export function proxy`, pengganti `middleware.ts` di Next 16):
   - `/admin/users`, `/admin/settings` → hanya `SUPER_ADMIN` (tanpa sesi → `/login?next=`, non-super → `/admin`).
   - `/admin/*` → `ADMIN` atau `SUPER_ADMIN` (tanpa sesi → login; `CUSTOMER` → `/`).
   - `/checkout`, `/cart`, `/account/*` → wajib login.
   - `/login` + sudah login → `/`.
   - Matcher mengecualikan `_next/static`, `_next/image`, `favicon.ico`, `api/images`, `public`.
2. **API** — `requireSession` (401), `requireAdmin` (403 bila bukan ADMIN/SUPER), `requireSuperAdmin` di semua `/api/admin/*` yang sensitif. Cart/order/voucher/review/account memakai `getSession()`.

Sesi: cookie httpOnly `skinsync_session`, JWT HS256 (`jose`), `maxAge` 30 hari, `secure` di produksi, `sameSite=lax`. `SESSION_SECRET` wajib ≥32 char. `UserStatus BLOCKED` tidak bisa login.

---

## 4. Arsitektur & Tech Stack Aktual

| Lapisan | Implementasi aktual |
|---|---|
| Framework | Next.js `16.3.8` App Router + TypeScript strict, React 19 |
| DB / ORM | PostgreSQL + Prisma `7.10.0` via `@prisma/adapter-pg` + `pg.Pool` (`src/lib/db.ts`, cache global saat dev) |
| Validasi | Zod `4.6.5` (`src/lib/validators/*` + inline di route) |
| Auth | Custom OTP WA + JWT cookie (`src/lib/auth.ts`, `src/server/services/auth.ts`) |
| Payment | `midtrans-client` + `fetch` Snap langsung (`src/lib/midtrans.ts`); `order_id = orderNumber` |
| WA | Fonnte `POST https://api.fonnte.com/send` (`src/lib/fonnte.ts`), header `Authorization: <TOKEN>` (tanpa Bearer), `delay: "2"` |
| Gambar | Supabase Storage (`@supabase/supabase-js`) + `sharp` (`src/lib/storage.ts`, `src/lib/image.ts`, `src/lib/image-url.ts`); `@aws-sdk/client-s3` terinstal tapi **tidak dipakai** |
| Styling | Tailwind v4 (tema editorial custom "Aurelle"; tidak terlihat pemakaian `shadcn/ui`) |
| Util | `phone.ts` (normalisasi `62…`), `money.ts` (`Intl id-ID`), `rate-limit.ts` (in-memory fixed window), `image-url.ts` (client-safe) |

**Catatan arsitektur penting untuk dokumen formal:**

- Semua operasi stok/pesanan/pembayaran memakai `prisma.$transaction`; perebutan stok dicegah dengan `SELECT ... FOR UPDATE` (`$queryRawUnsafe` di `order.ts`).
- Kegagalan WA **tidak menggagalkan** transaksi utama — dicatat `FAILED` dan bisa retry.
- `Payment` selalu dibuat (walau Snap gagal, tanpa token) agar bisa retry dari halaman pesanan.
- Rate limit OTP per-IP + aturan bisnis per-nomor (lihat §7.1).

---

## 5. Struktur Folder & Modul

```
prisma/
  schema.prisma          # 21 model, 8 enum (tanpa Banner)
  seed.ts                # super admin, master kulit/kategori/brand, zona, setting+template WA, voucher, 4 produk contoh
  migrations/            # termasuk 20261003082322_remove_banner_module
src/
  proxy.ts               # guard rute (pengganti middleware)
  lib/
    db.ts, auth.ts, phone.ts, money.ts, midtrans.ts, fonnte.ts,
    storage.ts, image.ts, image-url.ts, rate-limit.ts
    validators/auth.ts, order.ts, product.ts
  server/services/
    auth.ts              # requestOtp / verifyOtp
    cart.ts              # getOrCreateCart / add / update / remove
    order.ts             # generateOrderNumber, createOrder, expireOverdueOrders, autoCompleteOrders
    voucher.ts           # validateVoucher, rollbackVoucher
    notification.ts      # sendWhatsApp, retryFailedNotifications, renderTemplate
  app/
    (shop)/              # page.tsx (beranda), products/, products/[slug]/, categories/[slug]/, faq/, kebijakan/[slug]/
    (auth)/login/        # 2 langkah HP → OTP
    cart/, checkout/
    account/             # profil, addresses, orders/, orders/[orderNumber]/
    admin/               # dashboard, products, stock, orders, shipping-zones, vouchers, reviews, users*, settings*
    api/
      auth/request-otp, verify-otp, logout
      cart/items, cart/items/[id]
      orders/create, orders/[orderNumber]/pay
      webhooks/midtrans
      vouchers/validate
      reviews
      account/addresses, account/profile
      admin/products, products/[id], upload, stock/adjust, orders/[id]/status,
            shipping-zones(+[id]), vouchers(+[id]), reviews/[id], users(+[id]),
            settings, reports/orders/export, notifications/[id]/retry
      cron/expire-orders, retry-notifications, complete-orders
      images/[...key]    # redirect 307 ke Supabase (kompatibilitas lama)
      health/
  components/
    shop/                # ShopNavbar, ProductRail, ProductIndexList, ProductDetailClient, AurelleChoreo, CheckoutClient, CartViewClient
    account/             # AccountNav, ProfileFormClient, AddressManagerClient, OrderDetailClient
    admin/               # AdminNav, AdminOrderStatusManager, ProductForm/EditForm, StockTable/AdjustModal, dst.
```

---

## 6. Model Data (Skema Aktual)

> Tipe uang = `Int` (IDR). Waktu = `DateTime` UTC. Di bawah ini ringkasan normatif; skema penuh di `prisma/schema.prisma` (421 baris).

### 6.1 Enum

| Enum | Nilai |
|---|---|
| `Role` | `CUSTOMER`, `ADMIN`, `SUPER_ADMIN` |
| `UserStatus` | `ACTIVE`, `BLOCKED` |
| `OrderStatus` | `PENDING_PAYMENT`, `PAID`, `PROCESSING`, `SHIPPED`, `COMPLETED`, `EXPIRED`, `CANCELLED` |
| `PaymentStatus` | `PENDING`, `PAID`, `EXPIRED`, `FAILED` |
| `VoucherType` | `PERCENT`, `FIXED`, `FREE_SHIPPING` |
| `StockMovementType` | `IN`, `OUT`, `ADJUST`, `RESERVE`, `RELEASE` |
| `ReviewStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `NotifStatus` | `QUEUED`, `SENT`, `FAILED` |

### 6.2 Entitas inti

**Identitas & alamat**

- `User{id, name, phone@unique (format 62…), role=CUSTOMER, status=ACTIVE, skinTypeId?, allergies?, createdAt, updatedAt}` → `skinType?, addresses[], orders[], reviews[], cart?, auditLogs[]`.
- `Address{id, userId→Cascade, label, recipientName, phone, province, city, district, postalCode, addressLine, isDefault}`.
- `OtpCode{id, phone, codeHash (SHA256 hex), expiresAt, attempts=0, usedAt?, createdAt}` + index `[phone, createdAt]`.

**Katalog**

- `Brand{id, name, slug@unique, logoKey? (key bucket)}`.
- `Category{id, name, slug@unique, sortOrder=0, isActive}`.
- `SkinType{id, name, slug@unique}` ←→ `Product[]`, `User[]`; `SkinConcern{id, name, slug@unique}` ←→ `Product[]` (M-N implisit).
- `Product{id, brandId, categoryId, name, slug@unique, description, ingredients, howToUse, bpomNumber, avgRating=0, reviewCount=0, isActive, deletedAt?, createdAt, updatedAt}` + index `[categoryId, isActive]`.
- `ProductVariant{id, productId→Cascade, sku@unique, name ("30 ml"), price, comparePrice?, weightGram=0, stock=0, minStock=5, isActive}`.
- `ProductImage{id, productId→Cascade, key ("products/<uuid>.webp"), altText?, sortOrder}`.
- `StockMovement{id, variantId, type, qty, referenceType? ("order"|"manual"), referenceId?, note?, createdBy?, createdAt}`.

**Keranjang & ongkir & voucher**

- `Cart{id, userId@unique, updatedAt}` + `CartItem{id, cartId→Cascade, variantId, qty}` + unik `[cartId, variantId]`.
- `ShippingZone{id, name, province, city? (null = seluruh provinsi), cost, estimatedDays?, isActive}`.
- `Voucher{id, code@unique (uppercase), type, value (persen 1–100 / nominal; 0 untuk FREE_SHIPPING), maxDiscount?, minPurchase=0, quota? (null = unlimited), usedCount=0, perUserLimit=1, startsAt, endsAt, isActive}`.
- `VoucherUsage{id, voucherId, userId, orderId@unique, createdAt}`.

**Pesanan & pembayaran**

- `Order{id, orderNumber@unique (SKN-YYYYMMDD-XXXX), userId (wajib), status=PENDING_PAYMENT, subtotal, discountTotal=0, shippingCost, grandTotal, voucherId?, shippingZoneId, snapshot alamat (recipientName/Phone, shipProvince/City/District/PostalCode/Address), customerNote?, adminNote?, courierName?, trackingNumber?, shippedAt?, completedAt?, expiresAt, createdAt, updatedAt}` + index `[userId,status]`, `[status,expiresAt]`.
- `OrderItem{id, orderId, variantId, productName, variantName, sku, price, qty, subtotal}` → `review?`.
- `OrderStatusHistory{id, orderId, fromStatus?, toStatus, note?, changedBy? (null = sistem), createdAt}`.
- `Payment{id, orderId, midtransOrderId@unique (= orderNumber), snapToken?, redirectUrl?, paymentType?, amount, status=PENDING, paidAt?, expiresAt, rawResponse?}`.
- `PaymentWebhookLog{id, eventKey@unique (= order_id:transaction_status:transaction_id), payload, isValid, processedAt?, createdAt}`.

**Konten, notifikasi, sistem**

- `Review{id, productId, userId, orderItemId@unique (satu ulasan per item), rating 1–5, body?, status=PENDING}`.
- `NotificationLog{id, orderId?, recipient (WA), templateKey, message, status=QUEUED, attempts=0, providerResponse?, sentAt?}` + index `[status, attempts]`.
- `Setting{id, key@unique, value:Json}` — dipakai untuk `order_expiry_hours`, `store_name`, `store_cs_phone`, `wa_template:*`.
- `AuditLog{id, userId, action, entityType, entityId?, oldValues?, newValues?, createdAt}`.

### 6.3 Data awal (`prisma/seed.ts`, idempoten via upsert/findFirst)

- Super admin dari `SEED_SUPER_ADMIN_PHONE` (default `628123456789`).
- 5 `SkinType`, 5 `SkinConcern`, 6 `Category`, 1 `Brand` (SkinSync Labs).
- 5 zona flat: Jatim Rp10.000, Jateng&DIY Rp12.000, Jabar Rp15.000, DKI Rp18.000, Luar Jawa Rp30.000.
- 8 `Setting` (termasuk 5 template WA — lihat §11).
- 2 voucher: `WELCOME10` (PERCENT 10% max 25rb, min 100rb, kuota 500), `GRATISONGKIR` (FREE_SHIPPING, min 150rb, kuota 200), berlaku +60 hari.
- 4 produk contoh (cleanser 89rb, serum 2 varian 125rb/219rb, moisturizer 139rb, sunscreen 119rb; stok 25–60).

---

## 7. Alur Bisnis End-to-End

### 7.1 Autentikasi OTP WhatsApp

**Aturan (ditegakkan di `services/auth.ts` + `api/auth/*` + `validators/auth.ts`):**

- Satu alur untuk login & registrasi. Input HP → normalisasi (`phone.ts`: strip non-digit; `0…` → `62…`; `8…` → `62…`; valid `/^62[0-9]{8,13}$/`) → kirim OTP 6-digit (100000–999999) via WA.
- OTP disimpan sebagai **hash SHA256**, berlaku **5 menit**, maks **5 percobaan salah** (lebih → terkunci), cooldown kirim ulang **60 detik**, maks **5 OTP/nomor/jam**.
- Rate limit per-IP: request-OTP `20/menit`, verify-OTP `30/menit` (429 bila lewat).
- Nomor baru → buat `User{CUSTOMER, ACTIVE, name:"Pengguna Baru"}` + flag `isNewUser` → diminta isi nama. `BLOCKED` ditolak login.
- Sesi dibuat di route verify (bukan service) via `setSessionCookie`.

**Sequence:**

```
Client /login → POST /api/auth/request-otp {phone}
  → 429 bila rate-limit / cooldown (beserta cooldownSeconds)
  → simpan OtpCode + sendWhatsApp(otp_login) [gagal WA tidak menggagalkan, log FAILED]
Client → POST /api/auth/verify-otp {phone, otp}
  → salah: attempts++ + sisa percobaan; benar: usedAt=now, get/create user
  → set cookie skinsync_session → {isNewUser, user}
  → isNewUser ? /account?welcome=1 : next
```

### 7.2 Katalog (publik, tanpa login)

- Daftar: query `q, category, skinType, skinConcern, brand, sort (newest|rating|price-asc|price-desc), page (12/halaman)`; filter `contains` insensitive; sort harga in-memory setelah fetch.
- Detail: galeri, pilih varian, harga, stok, deskripsi/komposisi/cara pakai, **BPOM wajib tampil**, ulasan `APPROVED` saja, produk terkait, tombol WA CS (`store_cs_phone`), JSON-LD `Product/Offer`, metadata `title: name — BPOM:x`.
- Guest klik beli → `router.push(/login?next=...)` (`ProductDetailClient`, `ProductRail`).

### 7.3 Keranjang (wajib login)

- Satu keranjang per user (`Cart.userId unique`). API: `GET /api/cart/items`, `POST {variantId, qty}`, `PATCH [id] {qty (0 = hapus)}`, `DELETE [id]` — semua cek kepemilikan.
- Penolakan: varian/produk nonaktif atau terhapus, `qty > stock`, `qty ≤ 0 → hapus`.

### 7.4 Checkout — `createOrder` (inti, transaksional)

**UI 3 langkah (`CheckoutClient`):** (1) pilih/tambah alamat (`POST /api/account/addresses`), (2) pilih zona flat + voucher (`POST /api/vouchers/validate`) + catatan, (3) ringkasan `grandTotal` → `POST /api/orders/create` → `window.snap.pay(token)` → redirect `/account/orders/<n>`; bila `midtransError` tanpa token → ke detail untuk retry.

**Server `services/order.ts → createOrder({userId, address, shippingZone, voucherCode?, customerNote?})`:**

1. Baca `Setting order_expiry_hours` (number, default 24).
2. Dalam **satu `$transaction`:**
   - Ambil cart + items; kunci varian: `SELECT id,stock,"isActive",name,price FROM "ProductVariant" WHERE id=ANY($1) FOR UPDATE`.
   - Validasi aktif + stok cukup; `subtotal = Σ price×qty`.
   - `shippingCost = zone.cost` (zona dipilih manual, sudah divalidasi `isActive` di route).
   - Validasi voucher (§7.5) → `discountTotal`.
   - `grandTotal = max(0, subtotal − discount + shipping)`.
   - `expiresAt = now + expiryHours`; `orderNumber = SKN-YYYYMMDD-XXXX` (tanggal UTC + random 1000–8999).
   - `order.create` (`PENDING_PAYMENT` + `OrderItem` snapshot nama/SKU/harga + `OrderStatusHistory null→PENDING_PAYMENT`).
   - Per item: `stock decrement` + `StockMovement RESERVE (reference order)`.
   - Bila voucher: `VoucherUsage.create` + `usedCount++`.
   - Kosongkan cart (`deleteMany cartItem`).
3. Di luar transaksi: `createSnapTransaction({order_id=orderNumber, gross_amount=grandTotal, customer_details{first_name≤20, phone}, expiry{start_time=now "+0700", unit hour, duration 24}})` — **tanpa `item_details`** (disengaja agar tidak mismatch gross/nama panjang).
   - Sukses → `Payment PENDING + snapToken/redirectUrl`; gagal → log + `Payment PENDING` tanpa token (bisa retry via `POST /api/orders/[orderNumber]/pay` yang memakai ulang token bila masih ada).
4. `sendWhatsApp(order_created, {name, orderNumber, total, expiresAt WIB, paymentUrl})`. Return `{order, snapToken, redirectUrl, midtransError?}`.

### 7.5 Voucher (`services/voucher.ts`)

Valid bila **semua**: `isActive`, `now ∈ [startsAt, endsAt]`, `subtotal ≥ minPurchase`, `usedCount < quota` (bila ada), `count(voucherId,userId) < perUserLimit`. Kode disimpan **uppercase**, perbandingan case-insensitive.

| Tipe | Rumus `discountAmount` |
|---|---|
| `PERCENT` | `floor(subtotal × value / 100)`, dibatasi `maxDiscount` bila ada |
| `FIXED` | `min(value, subtotal)` |
| `FREE_SHIPPING` | `= shippingCost` (masuk `discountTotal`) |

Rollback (order `EXPIRED`/`CANCELLED`): `deleteMany VoucherUsage(orderId)` + `usedCount decrement` — wajib memakai transaksi yang sama (`tx`) bila dipanggil di dalam transaction.

### 7.6 Pembayaran & Webhook Midtrans

- `POST /api/webhooks/midtrans` (publik): verifikasi `signature_key = SHA512(order_id + status_code + gross_amount + SERVER_KEY)` (`crypto.subtle`); tidak cocok / tanpa signature → catat `isValid:false`, 403.
- Idempotensi: `eventKey = order_id:transaction_status:transaction_id` unik; sudah ada → `{already_processed}` tanpa efek ganda.
- Cocokkan `gross_amount == Payment.amount` (400 bila beda).
- Pemetaan: `settlement`/`capture(accept)` → Order `PAID` + Payment `PAID`; `pending` → tetap `PENDING`; `expire` → Order `EXPIRED` + Payment `EXPIRED`; `cancel`/`deny`/`failure` → Order `CANCELLED` + Payment `FAILED`; selain itu diabaikan.
- **Anti-downgrade:** `Order` hanya ditransisikan bila status saat ini `PENDING_PAYMENT`; `Payment` selalu diupdate (`status, paymentType, paidAt?, rawResponse`). Kembalian stok (`RELEASE`) + `rollbackVoucher` hanya saat transisi ke `EXPIRED`/`CANCELLED` dari `PENDING`.
- WA hanya saat transisi: `payment_received` (→PAID), `order_expired` (→EXPIRED). Semua dalam satu transaksi; `processedAt=now`.

### 7.7 Siklus status pesanan & fulfilment

**Matriks transisi admin (`PATCH /api/admin/orders/[id]/status`):**

```
PENDING_PAYMENT → PAID | CANCELLED | EXPIRED
PAID            → PROCESSING | CANCELLED
PROCESSING      → SHIPPED | CANCELLED
SHIPPED         → COMPLETED
```

- Selain matriks → 400. `SHIPPED` wajib `courierName + trackingNumber` → WA `order_shipped`.
- `CANCELLED` dari `PENDING/PAID/PROCESSING` (dengan catatan; refund manual di dashboard Midtrans): kembalikan stok (`RELEASE`), rollback voucher, `AuditLog`.
- `COMPLETED`: manual admin atau **otomatis 7 hari setelah `shippedAt`** via cron `complete-orders`.
- `EXPIRED`: otomatis via cron `expire-orders` (lihat §7.8) atau dari webhook `expire`.

### 7.8 Kedaluwarsa otomatis

`GET /api/cron/expire-orders` (auth `Bearer CRON_SECRET`): ambil ≤50 `PENDING_PAYMENT` dengan `expiresAt < now` → per order dalam transaksi: status → `EXPIRED` + history, stok `increment` + `RELEASE`, `rollbackVoucher(tx)`, Payment `PENDING → EXPIRED` → WA `order_expired`.

### 7.9 Ulasan

- Syarat: `OrderItem` milik sendiri pada order `COMPLETED`, satu ulasan per `orderItemId` (`POST /api/reviews {orderItemId, rating 1–5, body ≤1000}`) → status awal `PENDING`.
- Publik hanya `APPROVED`. Moderasi (`PATCH /api/admin/reviews/[id] {APPROVED|REJECTED}`) memicu agregat `avg/count APPROVED → product.avgRating/reviewCount` + `AuditLog`.

---

## 8. Spesifikasi API

> Konvensi: `401` = tanpa sesi; `403` = sesi ada tapi peran kurang (admin/super); `400` = validasi/bisnis; `429` = rate-limit/cooldown; `404` = tidak ada / bukan milik sendiri.

### 8.1 Auth & sesi

| Method & Path | Auth | Input | Output / Efek |
|---|---|---|---|
| `POST /api/auth/request-otp` | publik (+RL IP 20/mnt) | `{phone: 62…}` (zod) | Buat `OtpCode` + WA `otp_login`; `429 + cooldownSeconds` bila cooldown/limit |
| `POST /api/auth/verify-otp` | publik (+RL IP 30/mnt) | `{phone, otp: 6 digit}` | `usedAt`, get/create `User`; set cookie; `{isNewUser, user}` / `401` |
| `POST /api/auth/logout` | — | — | `clearSession()` → `{success:true}` |

### 8.2 Keranjang

| Method & Path | Auth | Keterangan |
|---|---|---|
| `GET /api/cart/items` | login | Kembalikan cart + items + varian + produk + 1 gambar |
| `POST /api/cart/items` | login | `{variantId, qty}` → `addItemToCart` (cek aktif & stok) |
| `PATCH /api/cart/items/[id]` | login | `{qty ≥ 0}` (0 = hapus), cek kepemilikan & stok |
| `DELETE /api/cart/items/[id]` | login | Hapus bila milik sendiri |

### 8.3 Pesanan, pembayaran, voucher, ulasan pelanggan

| Method & Path | Auth | Keterangan |
|---|---|---|
| `POST /api/orders/create` | login | `{addressId, shippingZoneId, voucherCode?, customerNote?}` → `createOrder` → `{orderNumber, snapToken?, redirectUrl?, midtransError?}` |
| `POST /api/orders/[orderNumber]/pay` | login (milik sendiri) | Tolak bila bukan `PENDING`; pakai ulang token bila ada (`reused:true`); else buat Snap baru |
| `POST /api/webhooks/midtrans` | publik (signature) | Verifikasi + idempoten + anti-downgrade (§7.6) |
| `POST /api/vouchers/validate` | login | `{code, subtotal, shippingCost}` → `{valid, voucher{id,code,type,value}, discountAmount}` |
| `POST /api/reviews` | login | `{orderItemId, rating, body?}` → `PENDING`; syarat `COMPLETED` + milik sendiri + belum ada |

### 8.4 Akun

| Method & Path | Auth | Keterangan |
|---|---|---|
| `GET /api/account/addresses` | login | List `isDefault desc, id desc` |
| `POST /api/account/addresses` | login | Zod `addressSchema`; reset default lama; auto-default bila pertama |
| `PATCH /api/account/profile` | login | `{name, skinTypeId?, allergies?}` → update + refresh cookie JWT |

### 8.5 Admin (produk, stok, pesanan, master, laporan)

Semua di bawah memakai `requireAdmin`, kecuali Users & Settings memakai `requireSuperAdmin`.

| Method & Path | Keterangan |
|---|---|
| `POST /api/admin/products` | Zod `productSchema`; cek slug; tx create + connect kulit + varian + `imageKeys[]` + `AuditLog CREATE_PRODUCT` |
| `PATCH /api/admin/products/[id]` | Sinkron varian (hapus bila tak bertransaksi else nonaktifkan; tolak SKU dup; `ADJUST` movement bila stok berubah via edit) + sinkron images penuh (maks 8, hapus bucket best effort) + `AuditLog` |
| `DELETE /api/admin/products/[id]` | Soft delete (`deletedAt + isActive=false`, hapus bucket best effort, `SOFT_DELETE_PRODUCT`) |
| `POST /api/admin/stock/adjust` | `{variantId, qty, type: IN\|OUT\|ADJUST}`; `IN=old+\|qty\|`, `OUT=max(0,old−\|qty\|)`, `ADJUST=max(0,qty)` + movement `manual` + `AuditLog` |
| `PATCH /api/admin/orders/[id]/status` | Matriks §7.7; `SHIPPED` wajib kurir+resi; `CANCELLED` → `RELEASE` + rollback voucher; WA `order_shipped` |
| `GET/POST /api/admin/shipping-zones`, `PATCH/DELETE /api/admin/shipping-zones/[id]` | CRUD zona; `DELETE` ditolak bila dipakai order |
| `POST /api/admin/vouchers`, `PATCH/DELETE /api/admin/vouchers/[id]` | `code` upper; `PATCH` hanya value/max/min/quota/limit/dates/isActive (code/type immutable); `DELETE` ditolak bila `usedCount/orders/usages > 0` |
| `PATCH /api/admin/reviews/[id]` | `{APPROVED\|REJECTED}` → agregat rating + `AuditLog` |
| `POST /api/admin/users`, `PATCH/DELETE /api/admin/users/[id]` (SUPER) | Buat `ADMIN` `{name, phone}`; ubah `ACTIVE\|BLOCKED` (tolak self); hapus (tolak self & `SUPER_ADMIN`) |
| `POST /api/admin/settings` (SUPER) | `{settings:[{key, value}]}` upsert loop + `AuditLog` |
| `POST /api/admin/upload` | Multipart `file + type=product\|brand`; maks 5 MB; `sharp → WebP`; `key=<prefix>/<uuid>.webp`; return `{key, url}` |
| `GET /api/admin/reports/orders/export` | CSV 18 kolom (ID, tanggal WIB, status, pelanggan, penerima, alamat, subtotal/ongkir/diskon/grand, voucher, kurir/resi, rincian item); `pesanan-skinsync-YYYY-MM-DD.csv` |
| `POST /api/admin/notifications/[id]/retry` | Kirim ulang satu log via Fonnte → `SENT`/`FAILED` |

### 8.6 Infra

| Method & Path | Keterangan |
|---|---|
| `GET /api/health` | `SELECT 1` → `{status:ok, timestamp, database:connected}` / `503` |
| `GET /api/images/[...key]` | Validasi `isValidKey` else 404 → `307` ke Supabase public URL (kompatibilitas lama) |
| `GET /api/cron/expire-orders` | `Bearer CRON_SECRET` → `expireOverdueOrders()` → `{success, count, timestamp}` |
| `GET /api/cron/retry-notifications` | → `retryFailedNotifications()` (hanya `FAILED, attempts<3`, jeda 1,5 dtk) |
| `GET /api/cron/complete-orders` | → `autoCompleteOrders()` (SHIPPED > 7 hari) |

---

## 9. Spesifikasi Halaman & UI

### 9.1 Publik (`src/app/(shop)/`, layout navbar+footer)

| Halaman | Spesifikasi |
|---|---|
| `/` Beranda | Hero statis `/assets/hero.jpeg` + animasi scroll `AurelleChoreo`; rel 5 produk (`avgRating desc`); 8 kategori; FAQ statis; fetch paralel `categories + featured + session` |
| `/products` | Filter + sort + pagination (§7.2); komponen `ProductIndexList` |
| `/products/[slug]` | `generateMetadata`; produk + ulasan `APPROVED` + terkait (kategori sama, 4) + `store_cs_phone`; `ProductDetailClient{name, bpom, variants, images, isLoggedIn, csPhone}`; JSON-LD |
| `/categories/[slug]` | Pola sama dengan katalog terfilter kategori |
| `/faq`, `/kebijakan/[slug]` | Statis (privasi, pengiriman, retur) |
| `sitemap.ts` | `force-dynamic` + try/catch DB: statis + kategori + produk |

### 9.2 Auth / belanja / akun

| Halaman | Spesifikasi |
|---|---|
| `/login` | Client 2 langkah; prefix `62`; validasi `isValidPhone`; timer cooldown; `POST request-otp/verify-otp`; `isNewUser → /account?welcome=1` else `next`; `router.refresh()` |
| `/cart` | Server guard (`getSession` else `redirect /login?next=/cart`) + `getOrCreateCart` → `CartViewClient(initialCart)` (PATCH/DELETE) |
| `/checkout` | Guard + `cart kosong → /cart`; paralel cart+addresses+zones + `snapScriptUrl+clientKey` → `CheckoutClient` 3 langkah (§7.4) |
| `/account` | Guard + `AccountNav`; `ProfileFormClient → PATCH profile` |
| `/account/addresses` | `AddressManagerClient` (CRUD via API) |
| `/account/orders`, `/account/orders/[orderNumber]` | Guard + kepemilikan; `Script snap.js lazyOnload`; `OrderDetailClient{orderNumber, status, snapToken, redirectUrl, items{id,name,variant,hasReview}}`; tombol Bayar (`POST …/pay` + `snap.pay`); form ulasan bila `COMPLETED` & belum review; tampil resi bila `SHIPPED/COMPLETED`; histori WIB |

### 9.3 Admin (`src/app/admin/`, layout guard + `AdminNav`)

| Halaman | Spesifikasi |
|---|---|
| `/admin` Dashboard | Agregat order lunas (`PAID,PROCESSING,SHIPPED,COMPLETED`): hari ini/kemarin/bulan ini/bulan lalu/total; `groupBy status`; `newCustomers` (CUSTOMER bulan ini); 6 terbaru; top-5 produk by qty lunas; grafik SVG 14 hari; link ekspor CSV |
| `/admin/orders`, `/admin/orders/[id]` | Filter `?status&q&page(15)`; detail + `AdminOrderStatusManager → PATCH status` + kurir/resi/note |
| `/admin/products`, `/new`, `/[id]/edit` | `ProductFormClient → POST`, `ProductEditFormClient → PATCH`, `ProductRowActions` (soft delete) |
| `/admin/stock` | Varian `stock asc`; flag `stock ≤ minStock`; `StockTableClient + StockAdjustModal → POST adjust`; 10 movement terakhir |
| `/admin/shipping-zones`, `/vouchers`, `/reviews` | Manager client masing-masing; moderasi → `PATCH` |
| `/admin/users`, `/admin/settings` (SUPER) | `AdminUsersManagerClient`, `AdminSettingsClient → POST settings` |

---

## 10. Validasi, Keamanan & Audit

**Validator Zod (`src/lib/validators/`):**

- `auth.ts`: `requestOtpSchema{phone /^62\d{8,13}$/}`, `verifyOtpSchema{phone, otp 6 digit}`, `updateProfileSchema{name 2–100, skinTypeId? nullable, allergies ≤500}`.
- `order.ts`: `addressSchema{label 2–50, recipientName 2–100, phone 9–15, province/city/district ≥3, postalCode 5–10, addressLine 10–500, isDefault=false}`, `checkoutSchema{addressId+, shippingZoneId+, voucherCode?, customerNote ≤500}`, `updateOrderStatusSchema` (ada di kode, route admin memakai parsing manual + matriks §7.7).
- `product.ts`: `productSchema{brandId+, categoryId+, name 3–200, slug /^[a-z0-9-]+$/, description ≥10, ingredients/howToUse ≥5, bpom ≥5, isActive, skinTypeIds[], skinConcernIds[]}`, `productVariantSchema{sku 3–50, name 1–100, price>0, comparePrice?, weightGram≥0, stock≥0, minStock=5, isActive}`, `stockAdjustSchema{variantId, qty int, type IN/OUT/ADJUST, note ≤500}`.

**Keamanan:**

- Semua input client divalidasi di server; secret tidak bocor ke client (kunci publik hanya `NEXT_PUBLIC_SUPABASE_URL/BUCKET`, Midtrans client key, Snap script URL).
- Webhook: verifikasi signature + cek amount + idempoten + anti-downgrade.
- Upload: hanya admin; cek isi via `sharp` (bukan ekstensi); tolak non-gambar; path traversal dicegah (`isValidKey`).
- `AuditLog` pada semua mutasi admin: `CREATE/UPDATE/SOFT_DELETE_PRODUCT`, `UPDATE_ORDER_STATUS`, `ADJUST_STOCK`, `CREATE/UPDATE/DELETE_VOUCHER`, `CREATE/UPDATE/DELETE_SHIPPING_ZONE`, `MODERATE_REVIEW_*`, `CREATE_ADMIN/CHANGE_STATUS/DELETE_ADMIN`, `UPDATE_SYSTEM_SETTINGS` — berisi `userId, action, entityType, entityId, old/newValues`.

---

## 11. Notifikasi WhatsApp (Fonnte)

Satu pintu: `sendWhatsApp(recipient, templateKey, vars, orderId?)` di `services/notification.ts` — render template → simpan `QUEUED` → kirim → `SENT`/`FAILED` (tidak throw). `retryFailedNotifications`: ambil ≤20 `FAILED, attempts<3`, jeda 1,5 dtk antar kirim.

| `templateKey` | Pemicu | Variabel utama |
|---|---|---|
| `otp_login` | Minta OTP | `{{otp}}` (5 menit, jangan dibagikan) |
| `order_created` | Order dibuat | `{{name}}, {{orderNumber}}, {{total}}, {{expiresAt}} (WIB), {{paymentUrl}}` |
| `payment_received` | → `PAID` | `{{orderNumber}}` (+ ucapan terima kasih) |
| `order_shipped` | → `SHIPPED` | `{{courier}}, {{trackingNumber}}` |
| `order_expired` | → `EXPIRED` | `{{orderNumber}}` (batal otomatis) |

Template tersimpan di `Setting` (`wa_template:<key>`), dapat diedit Super Admin; bila kosong dipakai `DEFAULT_TEMPLATES` di kode. Render: substitusi `{{key}}`. Default `otp_login`: `*SkinSync* Kode OTP…`; dst. sesuai `seed.ts` / `notification.ts`.

---

## 12. Gambar & Storage

**Implementasi aktual = Supabase Storage (bukan S3):**

- Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` (server) + `NEXT_PUBLIC_SUPABASE_URL/BUCKET` (client).
- Whitelist prefix: `products/`, `brands/` (tidak ada `banners/`). `isValidKey`: tolak `..`, `//`, regex `^[a-zA-Z0-9/_\-.]+$`, wajib prefix.
- **Upload** `POST /api/admin/upload` (ADMIN, multipart `file + type=product|brand`): maks **5 MB**; `sharp`: pastikan jpeg/png/webp, `rotate()`, buang EXIF, resize (`product` lebar maks 1200, `brand` 400, tanpa pembesaran), `webp quality 80`; key acak `products|<uuid>.webp`; `putObject(upsert:true)`; return `{key, url: getPublicUrl}`. Hapus saat gambar/produk dihapus: best effort (gagal hanya di-log).
- **Penyajian:** `imageUrl(key)` langsung ke `https://<supabase>/storage/v1/object/public/<bucket>/<key>`; kosong → `/images/placeholder.webp`; fallback lama `/api/images/<key>` bila env publik tidak ada. Route `GET /api/images/[...key]` hanya validasi → `307 redirect` ke public URL (bukan stream + bukan ETag/Cache kustom).
- Batas form: maks 8 gambar per produk.

---

## 13. Cron, Health & Operasional

| Endpoint | Auth | Jadwal terdokumentasi | Fungsi |
|---|---|---|---|
| `GET /api/cron/expire-orders` | `Authorization: Bearer CRON_SECRET` | tiap 5 menit | `expireOverdueOrders()` |
| `GET /api/cron/retry-notifications` | sama | tiap 10 menit | `retryFailedNotifications()` |
| `GET /api/cron/complete-orders` | sama | harian | `autoCompleteOrders()` (SHIPPED > 7 hari → COMPLETED) |
| `GET /api/health` | publik | — (healthcheck) | `SELECT 1` → `ok/connected` atau `503` |

Cron dijalankan service terpisah (mis. `curl -fsS` dengan header) — lihat §14.

---

## 14. Environment & Deployment

### 14.1 Environment variables (aktual)

```env
DATABASE_URL=postgresql://user:pass@host:5432/skincare
APP_URL=http://localhost:3000
SESSION_SECRET=            # >=32 char
CRON_SECRET=

MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false

FONNTE_TOKEN=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=skin-sync
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_BUCKET=skin-sync

SEED_SUPER_ADMIN_PHONE=
SEED_SUPER_ADMIN_NAME=
```

Tidak ada `S3_*` di kode aktual (masih disebut di `plan.md` namun tidak dipakai).

### 14.2 Deployment (Railway — sesuai rencana + penyesuaian aktual)

- Satu project: service Next.js (dari GitHub) + PostgreSQL + Supabase Storage (eksternal). Secret hanya di Railway Variables.
- Build: `prisma generate && next build`. Pre-start: `prisma migrate deploy`. Start: `next start`. `next.config.ts` aktual kosong (gambar via public URL + `unoptimized`; healthcheck `/api/health`).
- Domain custom HTTPS → set `APP_URL`; Notification URL Midtrans = `${APP_URL}/api/webhooks/midtrans`.
- Cron: service terpisah panggil endpoint dengan `Authorization: Bearer $CRON_SECRET` (expire 5 mnt, retry 10 mnt, complete harian).
- Env terpisah staging (Midtrans Sandbox) vs production. Backup PostgreSQL / `pg_dump` berkala.

---

## 15. Kesenjangan Implementasi vs `plan.md`

> Bagian ini wajib dibaca sebelum menulis dokumen formal — agar spesifikasi tidak mengklaim hal yang tidak ada di kode.

| # | `plan.md` | Kode aktual | Dampak ke dokumen |
|---|---|---|---|
| 1 | Model + CRUD `Banner`, prefix `banners/`, banner di beranda | Dihapus (`remove_banner_module`); beranda hero statis | Jangan spek Banner |
| 2 | Railway Bucket S3 privat (`S3_*`, proxy stream + ETag/Cache) | Supabase Storage public URL; `/api/images` hanya 307 | Spek storage = Supabase |
| 3 | `sharp`: produk 1200 / banner 1600 / logo 400 | Hanya `product:1200, brand:400` | Sesuaikan angka |
| 4 | `middleware.ts` | `src/proxy.ts` (`export proxy`, Next 16) | Rujuk `proxy.ts` |
| 5 | Ongkir auto-match `province+city → fallback city=null` | Pilih `shippingZoneId` manual | Spek checkout = pilih zona |
| 6 | Sertakan `item_details` Midtrans | Sengaja tanpa `item_details` | Jangan wajibkan item_details |
| 7 | `cancel/deny/failure → FAILED` (payment) | Order → `CANCELLED`, payment → `FAILED` + anti-downgrade | Pakai pemetaan aktual §7.6 |
| 8 | `EXPIRED/CANCELLED` hanya dari `PENDING` (admin boleh cancel dari `PAID/PROCESSING`) | Matriks §7.7 (tanpa `PENDING→…` langsung ke `PAID` oleh admin? admin: `PENDING→PAID/CANCELLED/EXPIRED`) | Pakai matriks aktual |
| 9 | Struktur cron hanya expire+retry (complete disebut naratif) | 3 route + `autoCompleteOrders` 7 hari | Spek 3 cron |
| 10 | `eventKey` = order+status; `VoucherUsage` relasi penuh; `shadcn/ui` | `eventKey` + `transaction_id`; `VoucherUsage` hanya relasi `voucher`; styling custom | Ikuti kode |

---

## 16. Definition of Done & Risiko

### 16.1 Kriteria selesai (teruji end-to-end, Sandbox)

- Guest tidak bisa akses cart/checkout/account/admin sesuai peran; tombol beli guest → login.
- Alur: cari → keranjang → checkout (±voucher) → Snap Sandbox → status & stok ter-update → admin resi → WA resi diterima.
- Webhook ganda tidak berefek ganda; `gross_amount` mismatch ditolak.
- Pesanan tak dibayar kedaluwarsa otomatis; stok & voucher kembali.
- Tidak ada overselling saat checkout bersamaan (uji stok terakhir; kunci `FOR UPDATE`).
- Gagal Fonnte tidak menggagalkan order/bayar; retry berhasil.
- Semua input tervalidasi Zod di server; secret tidak ke client.
- Upload hanya admin; non-gambar ditolak; gambar tampil publik.
- Deploy: migrasi otomatis, cron jalan, webhook produksi diterima, gambar persisten setelah redeploy/restart.

### 16.2 Risiko

- **Fonnte non-resmi:** nomor bisa diblokir — gunakan nomor khusus, hanya transaksional, beri jeda; siapkan bantuan manual OTP; pertimbangkan WA Business API resmi saat skala naik.
- **Ongkir flat** tidak akurat — tinjau tarif berkala.
- **Verifikasi bisnis Midtrans** lama — ajukan sejak awal.
- **Rate-limit in-memory** hanya untuk single-instance — butuh Redis bila multi-instance.

---

## 17. Lampiran untuk Dokumen Formal

Untuk mengubah draf ini menjadi SRS/SKPL formal, tambahkan:

1. **Use-case diagram + deskripsi per use case** (dari §7–§9): aktor Guest/Customer/Admin/SuperAdmin/Midtrans/Cron.
2. **Activity/sequence diagram** untuk: OTP, `createOrder`, webhook, expire, fulfilment, review, upload gambar.
3. **ERD** dari §6 (21 entitas; tandai unik/index; hilangkan Banner).
4. **Matriks hak akses** halaman × API (dari §3 + §8).
5. **Spesifikasi template WA** per `templateKey` (ID + EN bila perlu) + variabel + contoh pesan.
6. **Kamus data** (tipe, batas, contoh) dari validator Zod + seed.
7. **Rencana pengujian** (UAT checklist dari §16.1 + uji beban checkout bersamaan + uji webhook ganda).
8. **SOP operasional:** seed super admin, kelola zona/voucher/template, ekspor CSV, retry notif, refund manual Midtrans, backup DB, rotasi secret.

---

*Disusun dari kode aktual pada repo `skin-sync`. Jika kode berubah (khususnya storage, ongkir, atau matriks status), perbarui §7, §8, §12, dan §15 terlebih dahulu sebelum mengesahkan dokumen formal.*
