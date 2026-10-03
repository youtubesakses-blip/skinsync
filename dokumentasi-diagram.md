# Dokumentasi Diagram Sistem — SkinSync (Skincare E-Commerce)

> Proyek: Website penjualan skincare DTC, pasar Indonesia (IDR).
> Stack: Next.js App Router + TypeScript + PostgreSQL + Prisma + Midtrans Snap + Fonnte WA + Railway Bucket.
> Aturan inti: checkout wajib login, voucher wajib login, notifikasi hanya WA, ongkir flat per zona, resi manual, tanpa flash sale.
> File ini memakai [Mermaid](https://mermaid.js.org/) agar langsung render di GitHub / VS Code Preview.

Sumber kebenaran: `plan.md` (Bagian 3 Peran, Bagian 5 Skema, Bagian 6 Aturan Bisnis) dan `prisma/schema.prisma`.

---

## Daftar Isi

1. [Use Case Diagram](#1-use-case-diagram)
2. [UML Class Diagram](#2-uml-class-diagram)
3. [UML Sequence Diagram](#3-uml-sequence-diagram)
4. [Flowchart](#4-flowchart)
5. [ERD (Entity Relationship Diagram)](#5-erd-entity-relationship-diagram)
6. [State Diagram Status Pesanan](#6-state-diagram-status-pesanan)
7. [Cara Render](#7-cara-render)

---

## 1. Use Case Diagram

### 1.1 Daftar Aktor

| Aktor | Keterangan |
|---|---|
| Guest | Belum login. Bukan role di DB. Hanya browsing. |
| Customer | `User.role = CUSTOMER`. Belanja, checkout, ulasan. |
| Admin | `User.role = ADMIN`. Kelola katalog, stok, pesanan, ongkir, voucher, banner, ulasan, laporan. |
| Super Admin | `User.role = SUPER_ADMIN`. Semua hak Admin + kelola akun admin + pengaturan sistem/template WA. |
| Midtrans | Sistem eksternal pembayaran (Snap + webhook). |
| Fonnte | Sistem eksternal pengirim WhatsApp. |
| Cron Railway | Job terjadwal (`expire-orders`, `retry-notifications`, `complete-orders`). |

### 1.2 Diagram

```mermaid
flowchart LR
    subgraph Aktor
        G((Guest))
        C((Customer))
        A((Admin))
        S((Super Admin))
        M[(Midtrans)]
        F[(Fonnte WA)]
        CR[(Cron Railway)]
    end

    subgraph UC_Publik["Use Case - Publik"]
        UC1([Lihat beranda, produk, detail, FAQ])
        UC2([Cari / filter / sortir produk])
    end

    subgraph UC_Auth["Use Case - Auth OTP"]
        UC3([Login / Register via No. HP + OTP WA])
        UC4([Kelola profil kulit & alamat])
    end

    subgraph UC_Belanja["Use Case - Belanja"]
        UC5([Kelola keranjang])
        UC6([Checkout 3 langkah: alamat - ringkasan+voucher+ongkir - bayar])
        UC7([Bayar via Midtrans Snap])
        UC8([Lihat status & riwayat pesanan])
        UC9([Tulis ulasan - hanya order COMPLETED])
    end

    subgraph UC_Admin["Use Case - Admin"]
        UC10([CRUD produk, varian, gambar, brand, kategori])
        UC11([Kelola stok + StockMovement])
        UC12([Kelola pesanan: ubah status, input kurir+resi, catatan])
        UC13([CRUD ShippingZone])
        UC14([CRUD Voucher & Banner])
        UC15([Moderasi ulasan])
        UC16([Dashboard laporan + ekspor CSV])
        UC17([Kirim ulang notifikasi WA])
    end

    subgraph UC_Super["Use Case - Super Admin"]
        UC18([Kelola akun Admin: tambah / blokir / hapus])
        UC19([Edit template WA & pengaturan toko])
    end

    subgraph UC_Sistem["Use Case - Sistem / Webhook"]
        UC20([Webhook Midtrans: verifikasi signature + idempoten])
        UC21([Auto-expire order PENDING_PAYMENT])
        UC22([Auto-complete order 7 hari setelah SHIPPED])
        UC23([Retry notifikasi FAILED])
    end

    G --> UC1
    G --> UC2
    G --> UC3
    G -.->|klik keranjang/checkout diarahkan| UC3

    C --> UC1
    C --> UC2
    C --> UC3
    C --> UC4
    C --> UC5
    C --> UC6
    C --> UC7
    C --> UC8
    C --> UC9

    A --> UC10
    A --> UC11
    A --> UC12
    A --> UC13
    A --> UC14
    A --> UC15
    A --> UC16
    A --> UC17

    S --> UC10
    S --> UC11
    S --> UC12
    S --> UC13
    S --> UC14
    S --> UC15
    S --> UC16
    S --> UC17
    S --> UC18
    S --> UC19

    UC7 <--> M
    UC20 <--> M
    UC3 <--> F
    UC6 --> F
    UC20 --> F
    UC12 --> F
    CR --> UC21
    CR --> UC22
    CR --> UC23
```

### 1.3 Skenario Use Case Utama

| UC | Precondition | Main Flow | Alternatif |
|---|---|---|---|
| UC3 Login OTP | Nomor HP format `62xxx` | 1. Input HP → 2. Sistem kirim OTP (hash, 5 mnt, max 5x salah, cooldown 60 dtk) → 3. Input OTP benar → sesi cookie httpOnly | Nomor diblokir → tolak. Nomor baru → buat `User CUSTOMER` + minta nama. |
| UC6 Checkout | Login, keranjang tidak kosong | 1. Pilih alamat → 2. Hitung subtotal + ongkir zona + validasi voucher → 3. Transaksi DB (lock stok, buat Order, kurangi stok RESERVE, pakai voucher, kosongkan cart) → 4. Buat Snap Midtrans → 5. Kirim WA `order_created` | Stok kurang → gagal. Zona tidak ketemu → tolak. Voucher invalid → tolak. |
| UC20 Webhook | Signature valid | Verifikasi `SHA512(order_id+status_code+gross_amount+SERVER_KEY)` → cek idempoten `eventKey` → mapping status → update dalam transaksi | Signature salah → 403 + `isValid=false`. Duplikat → 200 tanpa proses. |

---

## 2. UML Class Diagram

Versi ringkas (atribut penting saja). Relasi many-to-many `Product <-> SkinType` dan `Product <-> SkinConcern` memakai tabel implisit Prisma.

```mermaid
classDiagram
    class User {
        +Int id
        +String name
        +String phone
        +Role role
        +UserStatus status
        +Int? skinTypeId
    }
    class Address {
        +Int id
        +Int userId
        +String label
        +String recipientName
        +String province
        +String city
        +Boolean isDefault
    }
    class OtpCode {
        +Int id
        +String phone
        +String codeHash
        +DateTime expiresAt
        +Int attempts
    }
    class Brand {
        +Int id
        +String name
        +String slug
        +String? logoKey
    }
    class Category {
        +Int id
        +String name
        +String slug
    }
    class SkinType {
        +Int id
        +String name
        +String slug
    }
    class SkinConcern {
        +Int id
        +String name
        +String slug
    }
    class Product {
        +Int id
        +String name
        +String slug
        +String bpomNumber
        +Float avgRating
        +Int reviewCount
        +Boolean isActive
    }
    class ProductVariant {
        +Int id
        +String sku
        +String name
        +Int price
        +Int? comparePrice
        +Int stock
        +Int minStock
    }
    class ProductImage {
        +Int id
        +String key
        +Int sortOrder
    }
    class StockMovement {
        +Int id
        +StockMovementType type
        +Int qty
        +String? referenceType
    }
    class Cart {
        +Int id
        +Int userId
    }
    class CartItem {
        +Int id
        +Int qty
    }
    class ShippingZone {
        +Int id
        +String province
        +String? city
        +Int cost
    }
    class Voucher {
        +Int id
        +String code
        +VoucherType type
        +Int value
        +Int? maxDiscount
        +Int minPurchase
        +Int? quota
        +Int usedCount
    }
    class VoucherUsage {
        +Int id
        +Int voucherId
        +Int userId
        +Int orderId
    }
    class Order {
        +Int id
        +String orderNumber
        +OrderStatus status
        +Int subtotal
        +Int discountTotal
        +Int shippingCost
        +Int grandTotal
        +DateTime expiresAt
    }
    class OrderItem {
        +Int id
        +String productName
        +String variantName
        +Int price
        +Int qty
        +Int subtotal
    }
    class OrderStatusHistory {
        +Int id
        +OrderStatus? fromStatus
        +OrderStatus toStatus
    }
    class Payment {
        +Int id
        +String midtransOrderId
        +String? snapToken
        +Int amount
        +PaymentStatus status
    }
    class PaymentWebhookLog {
        +Int id
        +String eventKey
        +Boolean isValid
    }
    class Review {
        +Int id
        +Int rating
        +ReviewStatus status
    }
    class Banner {
        +Int id
        +String title
        +String imageKey
    }
    class NotificationLog {
        +Int id
        +String recipient
        +String templateKey
        +NotifStatus status
    }
    class Setting {
        +Int id
        +String key
        +Json value
    }
    class AuditLog {
        +Int id
        +String action
        +String entityType
    }

    User "1" --> "0..1" SkinType : skinType
    User "1" --> "*" Address : addresses
    User "1" --> "*" Order : orders
    User "1" --> "*" Review : reviews
    User "1" --> "0..1" Cart : cart
    User "1" --> "*" AuditLog : auditLogs

    Brand "1" --> "*" Product : products
    Category "1" --> "*" Product : products
    Product "*" --> "*" SkinType : skinTypes
    Product "*" --> "*" SkinConcern : skinConcerns
    Product "1" --> "*" ProductVariant : variants
    Product "1" --> "*" ProductImage : images
    Product "1" --> "*" Review : reviews

    ProductVariant "1" --> "*" StockMovement : movements
    ProductVariant "1" --> "*" CartItem : cartItems
    ProductVariant "1" --> "*" OrderItem : orderItems

    Cart "1" --> "*" CartItem : items
    CartItem "*" --> "1" ProductVariant : variant

    ShippingZone "1" --> "*" Order : orders
    Voucher "1" --> "*" Order : orders
    Voucher "1" --> "*" VoucherUsage : usages

    Order "1" --> "*" OrderItem : items
    Order "1" --> "*" Payment : payments
    Order "1" --> "*" OrderStatusHistory : histories
    Order "1" --> "*" NotificationLog : notifications
    Order "*" --> "1" User : user
    OrderItem "1" --> "0..1" Review : review
    Review "*" --> "1" User : user
    Review "*" --> "1" OrderItem : orderItem
```

---

## 3. UML Sequence Diagram

### 3.1 Login / Register OTP via WhatsApp

```mermaid
sequenceDiagram
    actor U as Customer / Admin
    participant FE as Next.js Page /login
    participant BE as Auth Service
    participant DB as PostgreSQL
    participant WA as Fonnte API

    U->>FE: Input nomor HP
    FE->>BE: POST request-otp (Zod validasi, normalisasi 62xxx)
    BE->>DB: Cek rate limit (max 5 OTP/jam) + cooldown 60 dtk
    alt Rate limit terlampaui
        BE-->>FE: 429 Terlalu sering
    else Lolos
        BE->>BE: Generate OTP 6 digit, simpan hash (expired 5 mnt)
        BE->>DB: Simpan OtpCode + NotificationLog QUEUED
        BE->>WA: POST /send otp_login
        WA-->>BE: OK / gagal
        BE->>DB: Update NotificationLog SENT/FAILED
        BE-->>FE: OTP terkirim
    end
    U->>FE: Input OTP
    FE->>BE: POST verify-otp
    BE->>DB: Cek hash, expiresAt, attempts max 5x
    alt OTP salah / expired / user BLOCKED
        BE-->>FE: 401/403
    else OTP benar
        BE->>DB: Jika phone baru → create User CUSTOMER
        BE->>BE: Buat sesi (cookie httpOnly)
        BE-->>FE: Login sukses + redirect next
    end
```

### 3.2 Checkout + Pembayaran (createOrder transaksional)

```mermaid
sequenceDiagram
    actor C as Customer (login)
    participant FE as /checkout
    participant SVC as Order Service
    participant DB as PostgreSQL (transaction)
    participant MT as Midtrans Snap
    participant WA as Fonnte

    C->>FE: Pilih alamat + voucher + klik Bayar
    FE->>SVC: createOrder(cartId, addressId, voucherCode?)
    SVC->>DB: BEGIN transaction + SELECT variant FOR UPDATE
    DB-->>SVC: Stok terkunci
    SVC->>SVC: Cek stok, cari ShippingZone (province+city → fallback city=null), validasi voucher
    alt Stok kurang / zona tak ada / voucher invalid
        SVC->>DB: ROLLBACK
        SVC-->>FE: 400 Gagal checkout
    else Valid
        SVC->>DB: Insert Order PENDING_PAYMENT + OrderItem + History + StockMovement RESERVE + VoucherUsage + clear Cart
        SVC->>DB: COMMIT
        SVC->>MT: Create Snap (order_id=orderNumber, gross_amount=grandTotal)
        MT-->>SVC: snapToken + redirectUrl
        SVC->>DB: Insert Payment PENDING
        SVC->>WA: Kirim order_created (async, best-effort)
        SVC-->>FE: Snap token → tampilkan popup bayar
    end
```

### 3.3 Webhook Midtrans (idempoten)

```mermaid
sequenceDiagram
    participant MT as Midtrans
    participant WH as /api/webhooks/midtrans
    participant DB as PostgreSQL
    participant WA as Fonnte

    MT->>WH: POST notification (order_id, status_code, gross_amount, signature_key)
    WH->>WH: Verifikasi SHA512(order_id+status_code+gross_amount+SERVER_KEY)
    alt Signature tidak cocok
        WH->>DB: Insert PaymentWebhookLog isValid=false
        WH-->>MT: 403
    else Signature cocok
        WH->>DB: Cek eventKey sudah ada?
        alt Duplikat
            WH-->>MT: 200 (abaikan)
        else Baru
            WH->>DB: Insert WebhookLog isValid=true
            WH->>DB: BEGIN transaction
            alt settlement/capture-accept → PAID
                WH->>DB: Payment→PAID, Order→PAID + history
                WH->>WA: payment_received (async)
            else expire → EXPIRED / cancel,deny,failure → FAILED
                WH->>DB: Order→EXPIRED/CANCELLED, stok RELEASE, rollback voucher, Payment update
                WH->>WA: order_expired (async)
            end
            WH->>DB: COMMIT
            WH-->>MT: 200 OK
        end
    end
```

### 3.4 Admin Ubah Status + Input Resi

```mermaid
sequenceDiagram
    actor A as Admin
    participant FE as /admin/orders
    participant SVC as Order Service
    participant DB as PostgreSQL
    participant WA as Fonnte

    A->>FE: Ubah status (mis. PROCESSING → SHIPPED) + courier + resi
    FE->>SVC: updateOrderStatus()
    SVC->>SVC: Validasi transisi diizinkan
    alt Transisi invalid / SHIPPED tanpa kurir+resi
        SVC-->>FE: 400 Ditolak
    else Valid
        SVC->>DB: Update Order + OrderStatusHistory + AuditLog
        SVC->>WA: order_shipped (kurir + resi)
        SVC-->>FE: Sukses
    end
```

---

## 4. Flowchart

### 4.1 Flowchart Login OTP (Guest → Customer)

```mermaid
flowchart TD
    S([Mulai: buka /login]) --> INP[/Input nomor HP/]
    INP --> NORM{Normalisasi ke 62xxx valid?}
    NORM -- Tidak --> E1[Error: nomor tidak valid]
    NORM -- Ya --> BL{User BLOCKED?}
    BL -- Ya --> E2[Error: akun diblokir]
    BL -- Tidak --> RL{Rate limit: >5 OTP/jam atau cooldown <60 dtk?}
    RL -- Ya --> E3[Tunggu + coba lagi]
    RL -- Tidak --> KIRIM[Kirim OTP via Fonnte + simpan hash, expired 5 mnt]
    KIRIM --> INPOTP[/Input OTP/]
    INPOTP --> CEK{OTP benar, belum expired, attempts <=5?}
    CEK -- Tidak --> E4[Gagal, attempts +1]
    CEK -- Ya --> BARU{Nomor sudah ada di User?}
    BARU -- Tidak --> BUAT[Buat User CUSTOMER baru + minta nama]
    BARU -- Ya --> SESI[Buat sesi cookie httpOnly]
    BUAT --> SESI
    SESI --> DONE([Login sukses → redirect next/cart/checkout/account])
```

### 4.2 Flowchart Keranjang → Checkout → Bayar

```mermaid
flowchart TD
    A([Guest lihat produk]) --> B{Klik Tambah ke keranjang?}
    B -- Belum login --> L[Redirect /login?next=...]
    L --> C
    B -- Sudah login --> C{Cek varian aktif & stok > 0?}
    C -- Tidak --> X1[Tolak: varian nonaktif / stok habis]
    C -- Ya --> D[Masuk CartItem, qty <= stok]
    D --> E([Buka /cart → /checkout])
    E --> F[/Pilih / isi alamat/]
    F --> G[/Ringkasan + pilih voucher + hitung ongkir flat zona/]
    G --> H{ShippingZone ketemu? province+city else fallback provinsi}
    H -- Tidak --> X2[Tolak checkout: zona belum tersedia]
    H -- Ya --> I{Voucher valid? isActive, periode, minPurchase, quota, perUserLimit}
    I -- Tidak --> X3[Tolak / abaikan voucher]
    I -- Ya --> J[Hitung grandTotal = subtotal - diskon + ongkir]
    J --> K[Transaksi DB: lock stok FOR UPDATE → buat Order PENDING_PAYMENT 24 jam + OrderItem + RESERVE stok + VoucherUsage + kosongkan cart]
    K --> K2{Transaksi sukses?}
    K2 -- Tidak --> X4[Rollback: stok/voucher/cart utuh]
    K2 -- Ya --> M[Buat Snap Midtrans + simpan Payment PENDING]
    M --> N[Kirim WA order_created link bayar]
    N --> O{C Bayar sebelum expiresAt?}
    O -- Ya via Snap --> P[Webhook PAID → Order PAID]
    O -- Tidak --> Q[Cron expire-orders → EXPIRED + stok RELEASE + rollback voucher + WA order_expired]
    P --> R([Admin proses → SHIPPED input resi → COMPLETED])
```

### 4.3 Flowchart Admin Kelola Pesanan

```mermaid
flowchart TD
    A1([Admin buka /admin/orders]) --> F1[/Filter by status/]
    F1 --> D1[/Buka detail order/]
    D1 --> V1{Transisi status valid?}
    V1 -- Tidak --> XX[Tolak + tampilkan error]
    V1 -- Ya --> C1{Status tujuan = SHIPPED?}
    C1 -- Ya --> C2{courierName + trackingNumber diisi?}
    C2 -- Tidak --> XX
    C2 -- Ya --> U1[Update Order + History + AuditLog + WA order_shipped]
    C1 -- Tidak --> U2[Update Order + History + AuditLog]
    U1 --> DONE([Selesai])
    U2 --> DONE
```

### 4.4 Flowchart Moderasi Ulasan

```mermaid
flowchart TD
    R1([Customer buka order COMPLETED]) --> R2[/Tulis rating 1-5 + body per OrderItem/]
    R2 --> R3{Sudah ada review untuk orderItemId?}
    R3 -- Ya --> RX[Tolak: 1 ulasan per item]
    R3 -- Tidak --> R4[Simpan Review PENDING]
    R4 --> M1([Admin /admin/reviews])
    M1 --> M2{Approve?}
    M2 -- Ya --> M3[Status APPROVED + hitung ulang avgRating & reviewCount]
    M2 -- Tidak --> M4[Status REJECTED]
    M3 --> PUB[Tampil di detail produk publik]
```

---

## 5. ERD (Entity Relationship Diagram)

> Lengkap sesuai `prisma/schema.prisma`. Uang = `Int` rupiah. Waktu UTC, tampil WIB. Gambar hanya simpan `key` bucket.

```mermaid
erDiagram
    User ||--o{ Address : "has"
    User ||--o{ Order : "places"
    User ||--o{ Review : "writes"
    User ||--o| Cart : "owns"
    User ||--o{ AuditLog : "audits"
    User }o--o| SkinType : "has skinType"

    Brand ||--o{ Product : "has"
    Category ||--o{ Product : "has"
    Product ||--o{ ProductVariant : "has"
    Product ||--o{ ProductImage : "has"
    Product ||--o{ Review : "receives"
    Product }o--o{ SkinType : "suitableFor"
    Product }o--o{ SkinConcern : "targets"

    ProductVariant ||--o{ StockMovement : "tracks"
    ProductVariant ||--o{ CartItem : "in"
    ProductVariant ||--o{ OrderItem : "orderedAs"

    Cart ||--o{ CartItem : "contains"
    Cart }o--|| User : "belongsTo"

    ShippingZone ||--o{ Order : "ships"

    Voucher ||--o{ Order : "appliedTo"
    Voucher ||--o{ VoucherUsage : "usedIn"

    Order ||--o{ OrderItem : "contains"
    Order ||--o{ Payment : "paidBy"
    Order ||--o{ OrderStatusHistory : "history"
    Order ||--o{ NotificationLog : "notifies"
    Order }o--|| User : "buyer"
    Order }o--o| Voucher : "uses"

    OrderItem ||--o| Review : "reviewedBy"

    Review }o--|| Product : "about"
    Review }o--|| User : "author"

    OtpCode {
        int id PK
        string phone
        string codeHash
        datetime expiresAt
        int attempts
    }
    User {
        int id PK
        string name
        string phone UK
        Role role
        UserStatus status
    }
    Address {
        int id PK
        int userId FK
        string label
        string recipientName
        string province
        string city
        string district
        string postalCode
        string addressLine
        boolean isDefault
    }
    Product {
        int id PK
        int brandId FK
        int categoryId FK
        string slug UK
        string bpomNumber
        float avgRating
        int reviewCount
    }
    ProductVariant {
        int id PK
        int productId FK
        string sku UK
        int price
        int stock
        int minStock
    }
    Order {
        int id PK
        string orderNumber UK
        int userId FK
        OrderStatus status
        int subtotal
        int discountTotal
        int shippingCost
        int grandTotal
        datetime expiresAt
    }
    Payment {
        int id PK
        int orderId FK
        string midtransOrderId UK
        int amount
        PaymentStatus status
    }
    PaymentWebhookLog {
        int id PK
        string eventKey UK
        boolean isValid
    }
    Voucher {
        int id PK
        string code UK
        VoucherType type
        int value
    }
    Review {
        int id PK
        int productId FK
        int userId FK
        int orderItemId FK_UK
        int rating
        ReviewStatus status
    }
    NotificationLog {
        int id PK
        int orderId FK_NULL
        string templateKey
        NotifStatus status
    }
```

### 5.1 Catatan Relasi & Constraint Penting

1. `Cart.userId @unique` — satu keranjang per user, wajib login. Guest tidak punya cart.
2. `CartItem @@unique([cartId, variantId])` — varian tidak duplikat dalam satu cart.
3. `VoucherUsage.orderId @unique` — satu order hanya pakai satu voucher sekali.
4. `Review.orderItemId @unique` — satu ulasan per item dibeli, hanya jika `Order COMPLETED`.
5. `Payment.midtransOrderId @unique = Order.orderNumber` — idempotensi pembayaran.
6. `PaymentWebhookLog.eventKey @unique = orderId+status+transaction_id` — webhook idempoten.
7. `Order @@index([userId,status])` dan `@@index([status,expiresAt])` — untuk daftar pesanan + cron expire.
8. `ShippingZone.city = null` berarti berlaku seluruh provinsi (fallback saat checkout).
9. Gambar (`ProductImage.key`, `Brand.logoKey`, `Banner.imageKey`) hanya simpan key bucket (`products/`, `brands/`, `banners/`), bukan URL.

---

## 6. State Diagram Status Pesanan

Aturan `plan.md` 6.6: `PENDING_PAYMENT → PAID → PROCESSING → SHIPPED → COMPLETED`, cabang `EXPIRED`/`CANCELLED` hanya dari `PENDING_PAYMENT` (kecuali admin boleh `CANCELLED` dari `PAID`/`PROCESSING` dengan catatan, refund manual via dashboard Midtrans).

```mermaid
stateDiagram-v2
    [*] --> PENDING_PAYMENT : createOrder
    PENDING_PAYMENT --> PAID : webhook settlement/capture
    PENDING_PAYMENT --> EXPIRED : cron / webhook expire\n+ RELEASE stok + rollback voucher
    PENDING_PAYMENT --> CANCELLED : admin cancel / webhook cancel,deny,failure
    PAID --> PROCESSING : admin proses
    PAID --> CANCELLED : admin cancel + catatan\n(refund manual Midtrans)
    PROCESSING --> SHIPPED : admin input kurir + resi\n+ WA order_shipped
    PROCESSING --> CANCELLED : admin cancel + catatan
    SHIPPED --> COMPLETED : cron 7 hari / admin manual
    COMPLETED --> [*]
    EXPIRED --> [*]
    CANCELLED --> [*]

    note right of PENDING_PAYMENT
        expiresAt = now + 24 jam
        Payment PENDING
        Stok RESERVE
    end note
```

---

## 7. Cara Render

1. Buka file ini di VS Code dengan extension **Markdown Preview Mermaid Support** / **Markdown Preview Enhanced**, atau push ke GitHub (otomatis render).
2. Atau paste tiap blok `mermaid` ke [mermaid.live](https://mermaid.live).
3. Untuk export PNG/SVG: gunakan `mmdc` (mermaid-cli):
   ```bash
   npx @mermaid-js/mermaid-cli -i dokumentasi-diagram.md -o docs.png
   ```
   Atau export per-diagram dari mermaid.live.

---
*Dibuat otomatis dari `plan.md` + `prisma/schema.prisma` SkinSync — sesuaikan jika skema berubah.*
