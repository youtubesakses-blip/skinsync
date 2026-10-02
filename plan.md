# Spesifikasi Proyek — Website Penjualan Skincare

> Dokumen ini ditulis sebagai konteks untuk AI coding assistant (Claude Code, Cursor, dll.).
> Baca seluruh dokumen sebelum menulis kode. Kerjakan **bertahap sesuai urutan di Bagian 9**, jangan lompat fase.

---

## 1. Ringkasan Proyek

Website e-commerce direct-to-consumer untuk satu brand skincare. Pasar Indonesia (UI bahasa Indonesia, mata uang IDR).

**Aturan inti yang tidak boleh dilanggar:**
1. **Checkout hanya untuk pengguna yang sudah login.** Tidak ada guest checkout. Guest boleh melihat produk, tapi saat tambah ke keranjang/checkout diarahkan ke halaman login.
2. **Voucher hanya bisa dipakai oleh pengguna yang login** (otomatis, karena checkout wajib login).
3. **Notifikasi hanya lewat WhatsApp (Fonnte).** Jangan membuat fitur email sama sekali.
4. **Tidak ada flash sale.**
5. Ongkir = **tarif flat per zona** yang diatur admin. Nomor resi diinput manual oleh admin. Jangan integrasi API kurir.
6. Jangan menambah fitur di luar dokumen ini (tidak ada poin loyalitas, wishlist, retur, blog, referral, multi-bahasa).
7. **Gambar disimpan di Railway Storage Bucket.** Di database hanya disimpan *key* file. Jangan simpan file di PostgreSQL maupun di disk container (disk container tidak persisten).
8. Aplikasi di-deploy di **Railway** (lihat Bagian 8).

---

## 2. Tech Stack

| Komponen | Pilihan |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript, frontend & backend dalam satu proyek |
| Database | PostgreSQL |
| ORM | Prisma |
| Styling | Tailwind CSS (+ shadcn/ui untuk komponen dasar) |
| Validasi | Zod (semua input dari client wajib divalidasi di server) |
| Auth | Custom: login nomor HP + OTP WhatsApp, sesi via cookie httpOnly (JWT atau session tabel) |
| Pembayaran | Midtrans Snap + HTTP notification (webhook) |
| WhatsApp | Fonnte API |
| Penyimpanan gambar | Railway Storage Bucket (S3-compatible, privat) lewat `@aws-sdk/client-s3`; pemrosesan gambar dengan `sharp` |
| Job terjadwal | Endpoint cron `/api/cron/*` dilindungi `CRON_SECRET`, dipicu oleh cron Railway |
| Hosting | Railway (service Next.js + PostgreSQL + Bucket dalam satu project) |

**Konvensi kode:**
- TypeScript strict. Hindari `any`.
- Mutasi data memakai Server Actions atau Route Handlers; logika bisnis ditaruh di `src/server/services/*`, bukan di komponen UI.
- Uang disimpan sebagai **`Int` (rupiah, tanpa desimal)**.
- Semua query ke DB lewat satu instance Prisma di `src/lib/db.ts`.
- Operasi yang mengubah stok/pesanan/pembayaran **wajib dalam `prisma.$transaction`**.
- Nama tabel/field mengikuti skema Prisma di Bagian 5. Komentar kode dalam bahasa Indonesia atau Inggris, konsisten.
- Semua waktu disimpan **UTC** di database dan ditampilkan dalam zona **Asia/Jakarta (WIB)** di UI dan pesan WA.
- Akses storage hanya lewat `src/lib/storage.ts`; gambar ditampilkan lewat helper `imageUrl(key)` (lihat 6.10).

---

## 3. Peran Pengguna

| Peran (`Role`) | Hak akses |
| --- | --- |
| `CUSTOMER` | Belanja, checkout, lihat pesanan sendiri, tulis ulasan |
| `ADMIN` | Kelola produk, stok, pesanan, ongkir, voucher, banner, ulasan, laporan |
| `SUPER_ADMIN` | Semua hak `ADMIN` + kelola akun admin (tambah/hapus/blokir admin) dan pengaturan sistem |

Tidak ada peran staf/gudang/CS. Semua operasional dilakukan oleh `ADMIN`.
Guest = belum login, bukan peran di database.

Middleware: rute `/admin/*` hanya untuk `ADMIN` dan `SUPER_ADMIN`; `/admin/users` dan `/admin/settings` hanya `SUPER_ADMIN`; `/checkout`, `/cart`, `/account/*` wajib login.

---

## 4. Struktur Folder

```
prisma/
  schema.prisma
  seed.ts                  # super admin pertama, kategori, jenis kulit, contoh produk
src/
  app/
    (shop)/                # halaman publik
      page.tsx             # beranda (banner + produk)
      products/page.tsx
      products/[slug]/page.tsx
      categories/[slug]/page.tsx
      faq/page.tsx, kebijakan/[slug]/page.tsx
    (auth)/login/page.tsx  # input HP -> input OTP
    cart/page.tsx
    checkout/page.tsx
    account/
      page.tsx             # profil + profil kulit
      addresses/page.tsx
      orders/page.tsx, orders/[orderNumber]/page.tsx
    admin/
      page.tsx             # dashboard
      products/, orders/, shipping-zones/, vouchers/, banners/, reviews/
      users/               # khusus SUPER_ADMIN
      settings/            # khusus SUPER_ADMIN (template WA, info toko)
    api/
      webhooks/midtrans/route.ts
      cron/expire-orders/route.ts
      cron/retry-notifications/route.ts
      cron/complete-orders/route.ts
      images/[...key]/route.ts   # proxy gambar dari bucket (publik, di-cache)
      admin/upload/route.ts      # upload gambar (khusus ADMIN/SUPER_ADMIN)
      health/route.ts            # healthcheck Railway
  server/
    services/              # auth, cart, order, payment, voucher, stock, notification, report
  lib/
    db.ts, auth.ts, midtrans.ts, fonnte.ts, money.ts, storage.ts, image.ts, validators/
  components/
middleware.ts
```

---

## 5. Skema Database (Prisma)

Simpan sebagai `prisma/schema.prisma`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role              { CUSTOMER ADMIN SUPER_ADMIN }
enum UserStatus        { ACTIVE BLOCKED }
enum OrderStatus       { PENDING_PAYMENT PAID PROCESSING SHIPPED COMPLETED EXPIRED CANCELLED }
enum PaymentStatus     { PENDING PAID EXPIRED FAILED }
enum VoucherType       { PERCENT FIXED FREE_SHIPPING }
enum StockMovementType { IN OUT ADJUST RESERVE RELEASE }
enum ReviewStatus      { PENDING APPROVED REJECTED }
enum NotifStatus       { QUEUED SENT FAILED }

model User {
  id          Int        @id @default(autoincrement())
  name        String
  phone       String     @unique        // format 62xxxxxxxxxx
  role        Role       @default(CUSTOMER)
  status      UserStatus @default(ACTIVE)
  skinTypeId  Int?
  allergies   String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  skinType    SkinType?  @relation(fields: [skinTypeId], references: [id])
  addresses   Address[]
  orders      Order[]
  reviews     Review[]
  cart        Cart?
  auditLogs   AuditLog[]
}

model Address {
  id            Int     @id @default(autoincrement())
  userId        Int
  label         String
  recipientName String
  phone         String
  province      String
  city          String
  district      String
  postalCode    String
  addressLine   String
  isDefault     Boolean @default(false)

  user          User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model OtpCode {
  id        Int       @id @default(autoincrement())
  phone     String
  codeHash  String
  expiresAt DateTime
  attempts  Int       @default(0)
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([phone, createdAt])
}

model Brand {
  id       Int       @id @default(autoincrement())
  name     String
  slug     String    @unique
  logoKey  String?                // key di bucket
  products Product[]
}

model Category {
  id        Int       @id @default(autoincrement())
  name      String
  slug      String    @unique
  sortOrder Int       @default(0)
  isActive  Boolean   @default(true)
  products  Product[]
}

model SkinType {
  id       Int       @id @default(autoincrement())
  name     String
  slug     String    @unique
  products Product[]
  users    User[]
}

model SkinConcern {
  id       Int       @id @default(autoincrement())
  name     String
  slug     String    @unique
  products Product[]
}

model Product {
  id           Int              @id @default(autoincrement())
  brandId      Int
  categoryId   Int
  name         String
  slug         String           @unique
  description  String
  ingredients  String
  howToUse     String
  bpomNumber   String
  avgRating    Float            @default(0)
  reviewCount  Int              @default(0)
  isActive     Boolean          @default(true)
  deletedAt    DateTime?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  brand        Brand            @relation(fields: [brandId], references: [id])
  category     Category         @relation(fields: [categoryId], references: [id])
  variants     ProductVariant[]
  images       ProductImage[]
  reviews      Review[]
  skinTypes    SkinType[]
  skinConcerns SkinConcern[]

  @@index([categoryId, isActive])
}

model ProductVariant {
  id           Int      @id @default(autoincrement())
  productId    Int
  sku          String   @unique
  name         String                 // contoh: "30 ml"
  price        Int
  comparePrice Int?
  weightGram   Int      @default(0)
  stock        Int      @default(0)
  minStock     Int      @default(5)
  isActive     Boolean  @default(true)

  product      Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  stockMovements StockMovement[]
  cartItems    CartItem[]
  orderItems   OrderItem[]
}

model ProductImage {
  id        Int     @id @default(autoincrement())
  productId Int
  key       String                // key di bucket, contoh: products/<uuid>.webp
  altText   String?
  sortOrder Int     @default(0)

  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model StockMovement {
  id            Int               @id @default(autoincrement())
  variantId     Int
  type          StockMovementType
  qty           Int
  referenceType String?           // "order" | "manual"
  referenceId   Int?
  note          String?
  createdBy     Int?
  createdAt     DateTime          @default(now())

  variant       ProductVariant    @relation(fields: [variantId], references: [id])
}

model Cart {
  id        Int        @id @default(autoincrement())
  userId    Int        @unique          // satu keranjang per user, wajib login
  updatedAt DateTime   @updatedAt

  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     CartItem[]
}

model CartItem {
  id        Int            @id @default(autoincrement())
  cartId    Int
  variantId Int
  qty       Int

  cart      Cart           @relation(fields: [cartId], references: [id], onDelete: Cascade)
  variant   ProductVariant @relation(fields: [variantId], references: [id])

  @@unique([cartId, variantId])
}

model ShippingZone {
  id            Int     @id @default(autoincrement())
  name          String
  province      String
  city          String?               // null = berlaku seluruh provinsi
  cost          Int
  estimatedDays String?
  isActive      Boolean @default(true)
  orders        Order[]
}

model Voucher {
  id           Int         @id @default(autoincrement())
  code         String      @unique    // simpan uppercase
  type         VoucherType
  value        Int                    // persen (1-100) atau nominal rupiah; diabaikan utk FREE_SHIPPING
  maxDiscount  Int?
  minPurchase  Int         @default(0)
  quota        Int?                   // null = tanpa batas
  usedCount    Int         @default(0)
  perUserLimit Int         @default(1)
  startsAt     DateTime
  endsAt       DateTime
  isActive     Boolean     @default(true)

  orders       Order[]
  usages       VoucherUsage[]
}

model VoucherUsage {
  id        Int      @id @default(autoincrement())
  voucherId Int
  userId    Int
  orderId   Int      @unique
  createdAt DateTime @default(now())

  voucher   Voucher  @relation(fields: [voucherId], references: [id])
}

model Order {
  id             Int          @id @default(autoincrement())
  orderNumber    String       @unique      // format: SKN-YYYYMMDD-XXXX
  userId         Int                       // wajib, tidak ada guest checkout
  status         OrderStatus  @default(PENDING_PAYMENT)
  subtotal       Int
  discountTotal  Int          @default(0)
  shippingCost   Int
  grandTotal     Int
  voucherId      Int?
  shippingZoneId Int
  // snapshot alamat saat checkout
  recipientName  String
  recipientPhone String
  shipProvince   String
  shipCity       String
  shipDistrict   String
  shipPostalCode String
  shipAddress    String
  customerNote   String?
  adminNote      String?
  // pengiriman manual
  courierName    String?
  trackingNumber String?
  shippedAt      DateTime?
  completedAt    DateTime?
  expiresAt      DateTime                  // batas waktu bayar
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  user           User         @relation(fields: [userId], references: [id])
  voucher        Voucher?     @relation(fields: [voucherId], references: [id])
  shippingZone   ShippingZone @relation(fields: [shippingZoneId], references: [id])
  items          OrderItem[]
  payments       Payment[]
  histories      OrderStatusHistory[]
  notifications  NotificationLog[]

  @@index([userId, status])
  @@index([status, expiresAt])
}

model OrderItem {
  id          Int            @id @default(autoincrement())
  orderId     Int
  variantId   Int
  productName String
  variantName String
  sku         String
  price       Int
  qty         Int
  subtotal    Int

  order       Order          @relation(fields: [orderId], references: [id])
  variant     ProductVariant @relation(fields: [variantId], references: [id])
  review      Review?
}

model OrderStatusHistory {
  id         Int          @id @default(autoincrement())
  orderId    Int
  fromStatus OrderStatus?
  toStatus   OrderStatus
  note       String?
  changedBy  Int?                      // null = sistem
  createdAt  DateTime     @default(now())

  order      Order        @relation(fields: [orderId], references: [id])
}

model Payment {
  id              Int           @id @default(autoincrement())
  orderId         Int
  midtransOrderId String        @unique    // = orderNumber
  snapToken       String?
  redirectUrl     String?
  paymentType     String?
  amount          Int
  status          PaymentStatus @default(PENDING)
  paidAt          DateTime?
  expiresAt       DateTime
  rawResponse     Json?
  createdAt       DateTime      @default(now())

  order           Order         @relation(fields: [orderId], references: [id])
}

model PaymentWebhookLog {
  id          Int       @id @default(autoincrement())
  eventKey    String    @unique        // midtransOrderId + transaction_status + transaction_id
  payload     Json
  isValid     Boolean
  processedAt DateTime?
  createdAt   DateTime  @default(now())
}

model Review {
  id          Int          @id @default(autoincrement())
  productId   Int
  userId      Int
  orderItemId Int          @unique      // hanya pembeli terverifikasi
  rating      Int                       // 1-5
  body        String?
  status      ReviewStatus @default(PENDING)
  createdAt   DateTime     @default(now())

  product     Product      @relation(fields: [productId], references: [id])
  user        User         @relation(fields: [userId], references: [id])
  orderItem   OrderItem    @relation(fields: [orderItemId], references: [id])
}

model Banner {
  id        Int      @id @default(autoincrement())
  title     String
  imageKey  String                // key di bucket
  linkUrl   String?
  sortOrder Int      @default(0)
  startsAt  DateTime?
  endsAt    DateTime?
  isActive  Boolean  @default(true)
}

model NotificationLog {
  id               Int         @id @default(autoincrement())
  orderId          Int?
  recipient        String                  // nomor WA
  templateKey      String
  message          String
  status           NotifStatus @default(QUEUED)
  attempts         Int         @default(0)
  providerResponse Json?
  sentAt           DateTime?
  createdAt        DateTime    @default(now())

  order            Order?      @relation(fields: [orderId], references: [id])

  @@index([status, attempts])
}

model Setting {
  id    Int    @id @default(autoincrement())
  key   String @unique
  value Json
}

model AuditLog {
  id         Int      @id @default(autoincrement())
  userId     Int
  action     String
  entityType String
  entityId   Int?
  oldValues  Json?
  newValues  Json?
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id])
}
```

---

## 6. Aturan Bisnis

### 6.1 Autentikasi (OTP WhatsApp)
- Login & registrasi satu alur: user input nomor HP → sistem kirim OTP 6 digit via WA → user input OTP.
- Normalisasi nomor ke format `62xxxxxxxxxx` sebelum disimpan.
- OTP disimpan sebagai hash, berlaku **5 menit**, maksimal **5 percobaan salah**, kirim ulang dengan cooldown **60 detik**, maksimal **5 OTP per nomor per jam**.
- Jika nomor belum ada di database: buat `User` baru (`CUSTOMER`) dan minta isi nama setelah login pertama.
- Pengguna `BLOCKED` tidak bisa login.
- Admin dan Super Admin juga login dengan OTP WA (nomor mereka dibuat lewat seed / menu Super Admin).

### 6.2 Keranjang
- Hanya untuk user login. Guest menekan "Tambah ke keranjang" → redirect ke `/login?next=...`.
- Qty tidak boleh melebihi stok tersedia. Varian nonaktif/stok 0 tidak bisa ditambahkan.

### 6.3 Checkout (wajib login)
Langkah (maksimal 3 layar): **(1) pilih/isi alamat → (2) ringkasan + voucher + ongkir → (3) bayar**.

Proses `createOrder` dalam **satu transaksi database**:
1. Ambil item keranjang, kunci baris varian dengan `SELECT ... FOR UPDATE` (`$queryRaw`) lalu cek stok.
2. Hitung `subtotal`, cari `ShippingZone` (cocokkan `province` + `city`; jika tidak ada yang spesifik, pakai zona dengan `city = null` untuk provinsi tsb; jika tetap tidak ada, tolak checkout).
3. Validasi voucher (6.4) dan hitung diskon.
4. `grandTotal = subtotal - discountTotal + shippingCost` (tidak boleh < 0).
5. Buat `Order` (status `PENDING_PAYMENT`, `expiresAt = now + 24 jam`, nilai bisa diubah via `Setting`), `OrderItem` (salin nama, harga, SKU), `OrderStatusHistory`.
6. Kurangi stok varian dan catat `StockMovement` tipe `RESERVE`.
7. Jika ada voucher: buat `VoucherUsage`, naikkan `usedCount`.
8. Kosongkan keranjang.
Setelah transaksi: buat transaksi Midtrans Snap, simpan ke `Payment`, kirim WA link pembayaran.

### 6.4 Voucher
Voucher valid jika **semua** terpenuhi: `isActive`, `now` di antara `startsAt`–`endsAt`, `subtotal >= minPurchase`, `usedCount < quota` (jika quota ada), dan jumlah pemakaian user ini `< perUserLimit`.
- `PERCENT`: `diskon = min(subtotal * value / 100, maxDiscount ?? tak terbatas)`.
- `FIXED`: `diskon = min(value, subtotal)`.
- `FREE_SHIPPING`: `diskon = shippingCost` (disimpan di `discountTotal`).
- Kode voucher dibandingkan case-insensitive (simpan uppercase).
- Jika order `EXPIRED`/`CANCELLED`: hapus `VoucherUsage` dan kurangi `usedCount`.

### 6.5 Pembayaran (Midtrans Snap)
- `order_id` Midtrans = `orderNumber`. `gross_amount = grandTotal`. Sertakan `item_details` dan `customer_details` (nama, nomor HP). `expiry` sesuai `expiresAt`.
- Endpoint `POST /api/webhooks/midtrans`:
  1. Verifikasi `signature_key` = `SHA512(order_id + status_code + gross_amount + SERVER_KEY)`. Jika tidak cocok, catat `isValid=false`, balas 403.
  2. Buat `eventKey`; jika sudah ada di `PaymentWebhookLog`, balas 200 tanpa memproses ulang (idempoten).
  3. Cocokkan `gross_amount` dengan `Payment.amount`.
  4. Petakan status: `settlement`/`capture` (fraud accept) → `PAID`; `pending` → `PENDING`; `expire` → `EXPIRED`; `cancel`/`deny`/`failure` → `FAILED`.
  5. `PAID`: update `Payment` & `Order` ke `PAID`, catat history, kirim WA pembayaran diterima.
  6. `EXPIRED`/`FAILED`: jalankan prosedur pembatalan (6.7).
  7. Semua langkah dalam satu transaksi.

### 6.6 Alur Status Pesanan
`PENDING_PAYMENT → PAID → PROCESSING → SHIPPED → COMPLETED`; cabang `EXPIRED` dan `CANCELLED` hanya dari `PENDING_PAYMENT` (admin boleh `CANCELLED` dari `PAID`/`PROCESSING` dengan catatan, dan refund diurus manual di dashboard Midtrans).
- Transisi yang tidak valid harus ditolak oleh service.
- `SHIPPED` mewajibkan `courierName` dan `trackingNumber` → kirim WA resi.
- `COMPLETED` otomatis 7 hari setelah `SHIPPED` (cron) atau manual oleh admin; setelah itu pelanggan bisa menulis ulasan.

### 6.7 Pembatalan / Kedaluwarsa
Cron `GET /api/cron/expire-orders` (tiap 5–10 menit, header `Authorization: Bearer CRON_SECRET`): cari `Order` `PENDING_PAYMENT` dengan `expiresAt < now`. Untuk tiap order dalam transaksi: status → `EXPIRED`, kembalikan stok (`StockMovement` tipe `RELEASE`), rollback voucher, set `Payment` → `EXPIRED`, kirim WA pesanan kedaluwarsa.

### 6.8 Ulasan
- Hanya user yang punya `OrderItem` pada order `COMPLETED`, satu ulasan per `orderItemId`.
- Status awal `PENDING`; tampil di publik hanya jika `APPROVED`. Saat approve/reject, hitung ulang `avgRating` dan `reviewCount` produk.

### 6.9 Notifikasi WhatsApp (Fonnte)
Kirim via `POST https://api.fonnte.com/send` dengan header `Authorization: <FONNTE_TOKEN>` dan body `target`, `message`.
- Semua pengiriman lewat satu fungsi `sendWhatsApp(recipient, templateKey, vars)` di `src/server/services/notification.ts`: render template → simpan `NotificationLog` (`QUEUED`) → kirim → update `SENT`/`FAILED`.
- Kegagalan **tidak boleh** menggagalkan proses utama (order/pembayaran).
- Cron `/api/cron/retry-notifications`: kirim ulang `FAILED` dengan `attempts < 3`. Admin juga punya tombol "kirim ulang" per log.
- Beri jeda antar pengiriman (minimal ±1–2 detik) dan hanya kirim pesan transaksional.

| `templateKey` | Kapan | Isi utama |
| --- | --- | --- |
| `otp_login` | Minta OTP | Kode OTP, masa berlaku 5 menit, peringatan jangan dibagikan |
| `order_created` | Order dibuat | No. pesanan, total, link bayar, batas waktu |
| `payment_received` | Pembayaran PAID | No. pesanan, terima kasih, info sedang diproses |
| `order_shipped` | Status SHIPPED | Kurir, nomor resi |
| `order_expired` | Order EXPIRED | Info pesanan dibatalkan otomatis |

Template teks disimpan di tabel `Setting` (key `wa_template:<templateKey>`), bisa diedit Super Admin, dengan variabel seperti `{{name}}`, `{{orderNumber}}`, `{{total}}`, `{{paymentUrl}}`, `{{courier}}`, `{{trackingNumber}}`.

### 6.10 Penyimpanan Gambar (Railway Bucket)
Railway Bucket bersifat **privat** (tidak ada URL publik langsung), jadi gambar disajikan lewat route proxy di Next.js.

**Penyimpanan**
- Satu bucket untuk semua gambar. Prefix key: `products/`, `brands/`, `banners/`.
- Di database simpan **key** (bukan URL): `ProductImage.key`, `Brand.logoKey`, `Banner.imageKey`.
- `src/lib/storage.ts` membungkus S3 client (`putObject`, `getObject`, `deleteObject`) memakai env `S3_*` (Bagian 8). Ikuti dokumentasi Railway Buckets untuk gaya URL endpoint.

**Upload** (`POST /api/admin/upload`, multipart/form-data)
1. Hanya `ADMIN`/`SUPER_ADMIN` (cek sesi dan peran di server).
2. Validasi: tipe sebenarnya harus JPG/PNG/WebP (cek isi file lewat `sharp`, bukan ekstensi atau header klien), ukuran maksimal **5 MB**, maksimal 8 gambar per produk.
3. Proses dengan `sharp`: auto-rotate, hapus metadata EXIF, resize (produk maks lebar 1200 px, banner maks 1600 px, logo maks 400 px), konversi ke **WebP** kualitas ±80.
4. Simpan ke bucket dengan key acak: `products/<uuid>.webp` (jangan pakai nama file dari user).
5. Kembalikan `key`; form admin menyimpannya ke `ProductImage`/`Brand`/`Banner`.
6. Saat gambar atau produk dihapus, hapus juga objek di bucket (best effort, kegagalan hanya di-log).

**Penyajian** (`GET /api/images/[...key]`, publik)
- Hanya terima key dengan prefix whitelist (`products/`, `brands/`, `banners/`), tolak `..` dan karakter aneh (cegah path traversal).
- Ambil objek dari bucket dan stream ke client dengan `Content-Type` yang benar, `ETag`, dan `Cache-Control: public, max-age=31536000, immutable` (aman karena key unik dan tidak pernah ditimpa).
- Helper `imageUrl(key)` mengembalikan `/api/images/${key}`. Karena gambar sudah dioptimasi saat upload, boleh pakai `next/image` dengan `unoptimized`, atau daftarkan path lokal `/api/images/**` di `next.config`.
- Disarankan memasang Cloudflare (proxy) di depan domain agar gambar di-cache di CDN dan beban server Railway kecil.

---

## 7. Halaman & Fitur

### 7.1 Publik
- **Beranda:** banner aktif, kategori, produk unggulan.
- **Daftar produk:** pencarian (nama), filter (kategori, jenis kulit, masalah kulit, brand, rentang harga), urutkan (terbaru, harga, rating), pagination.
- **Detail produk:** galeri gambar, pilih varian, harga, stok, deskripsi, komposisi, cara pakai, **nomor BPOM (wajib tampil)**, ulasan approved, produk terkait. Tombol WhatsApp ke CS.
- **FAQ & kebijakan** (privasi, retur, pengiriman): konten statis.
- SEO: metadata per halaman, `sitemap.xml`, structured data `Product` dan `Review`.

### 7.2 Pelanggan (wajib login)
- Login OTP, profil (nama, jenis kulit, alergi), buku alamat.
- Keranjang, checkout, daftar & detail pesanan (status, riwayat, kurir + resi, tombol "Bayar sekarang" jika masih `PENDING_PAYMENT`).
- Form ulasan untuk item pada pesanan `COMPLETED`.

### 7.3 Admin (`ADMIN` & `SUPER_ADMIN`)
- **Produk:** CRUD produk, varian, upload gambar (lihat 6.10), relasi jenis/masalah kulit, aktif/nonaktif (soft delete).
- **Stok:** ubah stok manual (tercatat di `StockMovement` tipe `ADJUST`/`IN`), daftar varian stok menipis (`stock <= minStock`).
- **Pesanan:** daftar + filter status, detail, ubah status, input kurir & resi, catatan admin, riwayat WA.
- **Ongkir:** CRUD `ShippingZone`.
- **Voucher, Banner:** CRUD.
- **Ulasan:** moderasi (approve/reject).
- **Dashboard:** penjualan harian/bulanan (hanya order `PAID` ke atas), produk terlaris, pelanggan baru, jumlah pesanan per status. Ekspor CSV pesanan.
- Setiap perubahan data penting dicatat di `AuditLog`.

### 7.4 Super Admin (tambahan)
- Kelola akun `ADMIN` (tambah, blokir, hapus) di `/admin/users`.
- Edit template WA dan pengaturan toko (masa berlaku bayar, info toko) di `/admin/settings`.

---

## 8. Environment Variables & Deployment (Railway)

### 8.1 Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/skincare
APP_URL=http://localhost:3000
SESSION_SECRET=
CRON_SECRET=

MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false

FONNTE_TOKEN=

# Railway Bucket (isi lewat variable reference dari service Bucket)
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

Seed pertama: buat satu `SUPER_ADMIN` dengan nomor HP dari env `SEED_SUPER_ADMIN_PHONE`.

### 8.2 Deployment di Railway
- **Satu project, tiga resource:** service Next.js (dari repo GitHub), PostgreSQL, dan Bucket. Hubungkan lewat *variable reference* (`DATABASE_URL` dari Postgres, kredensial `S3_*` dari Bucket). Semua secret hanya di Railway Variables, jangan di repo.
- **Build:** `prisma generate && next build`. **Sebelum start:** jalankan `prisma migrate deploy` (Pre-deploy Command atau di start script). Start: `next start`. Pakai `output: "standalone"` bila ingin image lebih kecil.
- **Healthcheck:** path `/api/health` (balas 200 dan cek koneksi DB).
- **Domain:** pasang domain custom dengan HTTPS dan set `APP_URL`. Isi *Notification URL* di dashboard Midtrans dengan `${APP_URL}/api/webhooks/midtrans`.
- **Cron:** buat service cron terpisah yang memanggil endpoint dengan header `Authorization: Bearer $CRON_SECRET` (mis. lewat `curl -fsS`). Jadwal: `expire-orders` tiap 5 menit, `retry-notifications` tiap 10 menit, `complete-orders` harian. Cek batas interval minimum cron di dokumentasi Railway.
- **Backup:** aktifkan backup PostgreSQL atau jadwalkan `pg_dump` berkala, sesuai fitur paket Railway yang dipakai.
- **Lingkungan:** gunakan environment terpisah untuk *staging* (Midtrans Sandbox) dan *production* (Midtrans Production).

---

## 9. Urutan Pengerjaan (Build Order)

Kerjakan satu fase sampai berfungsi sebelum lanjut. Setelah tiap fase, pastikan `npm run build` dan lint lolos.

**Fase 0 — Fondasi**
- [ ] Init Next.js + TypeScript + Tailwind + shadcn/ui, Prisma, koneksi PostgreSQL
- [ ] Tempel skema Bagian 5, jalankan migrasi, buat `seed.ts`
- [ ] `lib/db.ts`, `lib/money.ts` (format Rupiah), util normalisasi nomor HP
- [ ] `lib/storage.ts` (S3 client ke Railway Bucket) dan `lib/image.ts` (pemrosesan `sharp`)
- [ ] `/api/health` dan konfigurasi deploy Railway dasar (Postgres + service Next.js)

**Fase 1 — Auth**
- [ ] `lib/fonnte.ts` + `sendWhatsApp()` + log notifikasi
- [ ] Alur OTP (request, verify, rate limit), sesi cookie, logout
- [ ] Middleware proteksi rute berdasarkan peran

**Fase 2 — Katalog (publik)**
- [ ] Daftar produk + pencarian + filter + urutan + pagination
- [ ] Detail produk (varian, BPOM, ulasan approved)
- [ ] Beranda dengan banner

**Fase 3 — Admin: produk & stok**
- [ ] `POST /api/admin/upload` (validasi, `sharp` -> WebP, simpan ke bucket) dan `GET /api/images/[...key]` (proxy + cache)
- [ ] CRUD brand, kategori, produk, varian, gambar (memakai upload di atas)
- [ ] Penyesuaian stok + `StockMovement`, daftar stok menipis

**Fase 4 — Keranjang & Checkout**
- [ ] Keranjang (wajib login, redirect guest ke login)
- [ ] Buku alamat, CRUD `ShippingZone` (admin), perhitungan ongkir
- [ ] Voucher: CRUD admin + validasi saat checkout
- [ ] `createOrder` transaksional dengan row lock stok

**Fase 5 — Pembayaran**
- [ ] Integrasi Midtrans Snap, simpan `Payment`
- [ ] Webhook dengan verifikasi signature + idempotensi
- [ ] Cron expire order + pengembalian stok & voucher
- [ ] WA: `order_created`, `payment_received`, `order_expired`

**Fase 6 — Fulfilment**
- [ ] Admin: daftar & detail pesanan, ubah status (validasi transisi), input kurir & resi
- [ ] WA `order_shipped`, auto-complete 7 hari
- [ ] Halaman pesanan pelanggan (status, riwayat, resi, bayar sekarang)

**Fase 7 — Ulasan, Konten, Laporan**
- [ ] Ulasan + moderasi + hitung ulang rating
- [ ] FAQ & kebijakan, tombol WA CS
- [ ] Dashboard laporan + ekspor CSV
- [ ] Super Admin: kelola admin, edit template WA, retry notifikasi

**Fase 8 — Penyelesaian**
- [ ] SEO (metadata, sitemap, structured data), optimasi gambar (`next/image`)
- [ ] Audit log, rate limiting, pengecekan keamanan dasar
- [ ] Uji alur end-to-end dengan Midtrans Sandbox
- [ ] Deploy ke Railway: Bucket, cron service, domain custom + HTTPS, Notification URL Midtrans
- [ ] Pastikan gambar tetap ada setelah redeploy dan restart service

---

## 10. Kriteria Selesai (Definition of Done)

- Guest tidak bisa checkout; semua rute terlindungi sesuai peran.
- Alur lengkap berjalan: cari produk → keranjang → checkout (dengan/tanpa voucher) → bayar di Midtrans Sandbox → status & stok terupdate otomatis → admin input resi → pelanggan menerima WA resi.
- Webhook yang dikirim dua kali tidak menggandakan efek (idempoten).
- Pesanan tak dibayar kedaluwarsa otomatis, stok dan voucher kembali.
- Tidak terjadi overselling saat dua checkout bersamaan pada stok terakhir.
- Kegagalan Fonnte tidak menggagalkan order/pembayaran dan bisa dikirim ulang.
- Semua input tervalidasi Zod di server; tidak ada secret yang bocor ke client.
- Upload gambar hanya bisa dilakukan admin, file non-gambar ditolak, dan gambar tampil publik lewat proxy dengan cache.
- Aplikasi berjalan di Railway: migrasi otomatis, cron berjalan, webhook Midtrans diterima di domain produksi.

---

## 11. Risiko yang Perlu Diingat

- **Fonnte bukan API resmi WhatsApp:** nomor bisa diblokir. Gunakan nomor khusus, hanya pesan transaksional, beri jeda kirim. Karena login bergantung pada OTP WA, siapkan cara bantuan manual untuk pelanggan yang tidak menerima OTP, dan pertimbangkan WhatsApp Business API resmi saat skala naik.
- **Ongkir flat** bisa tidak akurat; tinjau tarif zona berkala.
- **Verifikasi bisnis Midtrans** memakan waktu; ajukan sejak awal.
