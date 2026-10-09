# KUMPULAN DIAGRAM MERMAID — SKINSYNC

> Salin tiap blok ke [Mermaid Live Editor](https://mermaid.live) / blok ` ```mermaid ` di Markdown / Notion / GitHub untuk render.
> Semua diagram disusun dari **kode aktual** (`services/order.ts`, `services/notification.ts`, webhook Midtrans, cron, `proxy.ts`, storage Supabase).

---

## 1. State Diagram — Status Pesanan

```mermaid
stateDiagram-v2
    [*] --> PENDING_PAYMENT : createOrder()\nSKN-YYYYMMDD-XXXX
    PENDING_PAYMENT --> PAID : webhook settlement/capture\n+ admin manual
    PENDING_PAYMENT --> EXPIRED : webhook expire\n+ cron expire-orders
    PENDING_PAYMENT --> CANCELLED : webhook cancel/deny/failure\n+ admin cancel
    PAID --> PROCESSING : admin proses
    PAID --> CANCELLED : admin cancel\n(refund manual Midtrans)
    PROCESSING --> SHIPPED : admin input kurir+resi\nWA order_shipped
    PROCESSING --> CANCELLED : admin cancel
    SHIPPED --> COMPLETED : admin manual\n+ cron complete-orders\n(7 hari setelah shippedAt)
    PAID --> [*]
    PROCESSING --> [*]
    COMPLETED --> [*] : bisa diulas
    EXPIRED --> [*] : stok RELEASE\n+ voucher rollback
    CANCELLED --> [*] : stok RELEASE\n+ voucher rollback
    note right of PENDING_PAYMENT
        expiresAt = now + order_expiry_hours (default 24 jam)
        Payment = PENDING, stok = RESERVE
    end note
```

---

## 2. Sequence Diagram — Cron Kedaluwarsa Pesanan

```mermaid
sequenceDiagram
    autonumber
    participant CRON as Cron Service<br/>(Railway)
    participant API as GET /api/cron/expire-orders
    participant SVC as expireOverdueOrders()
    participant DB as PostgreSQL<br/>(Prisma tx)
    participant WA as sendWhatsApp<br/>(order_expired)

    CRON->>API: GET + Authorization: Bearer CRON_SECRET<br/>(tiap 5 menit)
    alt Secret salah
        API-->>CRON: 401 Unauthorized
    else Secret valid
        API->>SVC: expireOverdueOrders()
        SVC->>DB: findMany PENDING_PAYMENT<br/>WHERE expiresAt < now<br/>TAKE 50 + include items+user
        loop tiap order kedaluwarsa
            SVC->>DB: BEGIN $transaction
            DB->>DB: Order → EXPIRED + OrderStatusHistory
            DB->>DB: stock increment + StockMovement RELEASE<br/>(reference order)
            DB->>DB: rollbackVoucher: delete VoucherUsage<br/>+ usedCount decrement
            DB->>DB: Payment PENDING → EXPIRED
            SVC->>DB: COMMIT
            SVC->>WA: sendWhatsApp(order_expired)
            WA->>DB: NotificationLog QUEUED → SENT/FAILED
        end
        SVC-->>API: { success, count, timestamp }
        API-->>CRON: 200 { success, count }
    end
```

---

## 3. Sequence Diagram — Ulasan & Moderasi

```mermaid
sequenceDiagram
    autonumber
    participant C as Customer<br/>(OrderDetailClient)
    participant API1 as POST /api/reviews
    participant DB as PostgreSQL
    participant A as Admin<br/>(ReviewModerationClient)
    participant API2 as PATCH /api/admin/reviews/[id]
    participant PUB as Halaman Detail Produk

    C->>API1: POST { orderItemId, rating 1-5, body }
    API1->>DB: cek orderItem milik sendiri<br/>+ order.status == COMPLETED<br/>+ belum ada review
    alt Tidak memenuhi syarat
        API1-->>C: 400/404 (bukan COMPLETED / bukan milik / sudah ada)
    else Lolos
        API1->>DB: Review.create STATUS=PENDING
        API1-->>C: 201 { review PENDING }
    end
    A->>API2: PATCH { status: APPROVED | REJECTED }
    API2->>DB: BEGIN tx: Review → APPROVED/REJECTED
    API2->>DB: aggregate avg+count WHERE APPROVED
    API2->>DB: Product.avgRating + reviewCount update
    API2->>DB: AuditLog MODERATE_REVIEW_*
    API2-->>A: 200 { review, product stats }
    PUB->>DB: tampilkan hanya Review APPROVED
```

---

## 4. Sequence Diagram — Pengiriman Notifikasi & Retry

```mermaid
sequenceDiagram
    autonumber
    participant TRIG as Trigger<br/>(order/pay/ship/expire/OTP)
    participant SVC as sendWhatsApp()<br/>services/notification.ts
    participant DB as PostgreSQL
    participant FON as Fonnte API<br/>POST api.fonnte.com/send
    participant CRON as Cron retry-notifications<br/>(tiap 10 mnt)
    participant ADM as Admin<br/>(retry manual)

    TRIG->>SVC: sendWhatsApp(recipient, templateKey, vars, orderId?)
    SVC->>DB: Setting wa_template:key ?? DEFAULT_TEMPLATES
    SVC->>SVC: renderTemplate {{var}}
    SVC->>DB: NotificationLog.create QUEUED
    SVC->>FON: POST { target, message, delay:2 }<br/>Auth: FONNTE_TOKEN
    alt Fonnte OK
        FON-->>SVC: ok
        SVC->>DB: → SENT + attempts++ + sentAt
    else Fonnte gagal
        FON-->>SVC: error / !ok
        SVC->>DB: → FAILED + attempts++ (tidak throw)
    end
    Note over TRIG,FON: Kegagalan WA tidak menggagalkan order/pembayaran

    CRON->>SVC: retryFailedNotifications()
    SVC->>DB: findMany FAILED + attempts<3 TAKE 20
    loop tiap log
        SVC->>SVC: sleep 1500ms antar kirim
        SVC->>FON: kirim ulang log.message
        alt Berhasil
            SVC->>DB: → SENT
        else Gagal
            SVC->>DB: → FAILED + attempts++
        end
    end
    ADM->>SVC: POST /api/admin/notifications/[id]/retry
    SVC->>FON: kirim ulang satu log
    SVC->>DB: update SENT / FAILED
```

---

## 5. Diagram Deployment

```mermaid
flowchart TB
    subgraph DEV["Developer"]
        GH["GitHub Repo<br/>skin-sync"]
    end
    subgraph RW["Railway Project"]
        WEB["Next.js Service<br/>prisma generate + next build<br/>prisma migrate deploy + next start<br/>GET /api/health"]
        PG["PostgreSQL<br/>DATABASE_URL"]
        CRONJOB["Cron Service<br/>curl -fsS + Bearer CRON_SECRET"]
    end
    subgraph EXT["Layanan Eksternal"]
        SUPA["Supabase Storage<br/>bucket: skin-sync<br/>products/ brands/<br/>public URL"]
        MT["Midtrans<br/>Snap Sandbox/Production<br/>createSnapTransaction + webhook"]
        FN["Fonnte WA API<br/>api.fonnte.com/send"]
        DNS["Custom Domain + HTTPS<br/>APP_URL"]
    end
    subgraph CLIENT["Klien"]
        BRW["Browser Customer/Admin<br/>Next.js App Router"]
    end

    GH -->|push deploy| WEB
    WEB <-->|pg Pool + PrismaPg| PG
    WEB <-->|putObject/deleteObject<br/>getPublicUrl| SUPA
    WEB <-->|Snap token + redirect_url<br/>POST /api/webhooks/midtrans<br/>verify SHA512 + idempoten| MT
    WEB -->|POST target+message| FN
    CRONJOB -->|expire 5mnt<br/>retry 10mnt<br/>complete harian| WEB
    BRW <-->|HTTPS + snap.js + /api/images 307| DNS
    DNS <--> WEB
    MT -->|Notification URL| DNS
```

---

## 6. Flowchart Alur Nilai Utama — Katalog hingga Ulasan

```mermaid
flowchart TD
    A["Buka katalog /products<br/>(guest boleh)<br/>cari + filter + sort + page"] --> B{"Klik Beli /<br/>Tambah keranjang?"}
    B -->|Guest| L["Redirect /login?next=...<br/>OTP WA 6 digit"]
    B -->|Login| C["Keranjang<br/>cek aktif + stok"]
    L --> C
    C --> D["Checkout L1: pilih/tambah alamat"]
    D --> E["Checkout L2: pilih zona flat<br/>+ voucher validate"]
    E --> F["Checkout L3: ringkasan grandTotal<br/>= subtotal - diskon + ongkir"]
    F --> G["POST /api/orders/create<br/>tx: lock FOR UPDATE + RESERVE stok<br/>+ VoucherUsage + kosongkan cart"]
    G --> H{"Snap sukses?"}
    H -->|Ya| I["Payment PENDING + token/url<br/>WA order_created"]
    H -->|Tidak| J["Payment PENDING tanpa token<br/>WA order_created + retry di detail"]
    I --> K["Bayar di Snap<br/>window.snap.pay"]
    J --> K
    K --> M{"Webhook Midtrans"}
    M -->|settlement/capture| N["Order PAID + Payment PAID<br/>WA payment_received"]
    M -->|expire / tak bayar 24 jam| O["Order EXPIRED<br/>stok RELEASE + voucher rollback<br/>WA order_expired"]
    M -->|cancel/deny/failure| P["Order CANCELLED<br/>stok RELEASE + rollback"]
    N --> Q["Admin: PAID → PROCESSING → SHIPPED<br/>wajib kurir + resi<br/>WA order_shipped"]
    Q --> R["SHIPPED → COMPLETED<br/>manual / cron 7 hari"]
    R --> S["Customer tulis ulasan<br/>PENDING → admin APPROVED"]
    S --> T["Rating produk ter-update<br/>avgRating + reviewCount<br/>tampil di detail"]
    O --> Z(["Selesai - batal"])
    P --> Z
    T --> Z(["Selesai - lengkap"])
```

---

## 7. Diagram Arsitektur Sistem

```mermaid
flowchart TB
    subgraph CLIENT2["Klien - Browser"]
        PAGES["Pages App Router<br/>(shop) (auth) cart checkout<br/>account admin"]
        COMP["Components<br/>shop / account / admin<br/>CheckoutClient CartViewClient<br/>OrderDetailClient ProductForm"]
    end
    subgraph EDGE["Edge - Next.js"]
        PROXY["src/proxy.ts<br/>guard /admin /cart /checkout /account<br/>cookie skinsync_session"]
        ROUTES["Route Handlers /api/**<br/>auth cart orders webhooks<br/>reviews account admin cron<br/>images health"]
    end
    subgraph SVC2["Server - Logika Bisnis"]
        S_AUTH["services/auth<br/>requestOtp verifyOtp"]
        S_CART["services/cart<br/>getOrCreate add update remove"]
        S_ORDER["services/order<br/>createOrder expire autoComplete"]
        S_VOUCH["services/voucher<br/>validate rollback"]
        S_NOTIF["services/notification<br/>sendWhatsApp retry"]
    end
    subgraph LIB["Lib - Util & Integrasi"]
        L_DB["lib/db<br/>Prisma + pg Pool"]
        L_AUTH["lib/auth<br/>jose JWT cookie"]
        L_MT["lib/midtrans<br/>Snap + verify SHA512"]
        L_FN["lib/fonnte<br/>POST send"]
        L_ST["lib/storage + image<br/>Supabase + sharp WebP"]
        L_VAL["validators + phone<br/>money + rate-limit"]
    end
    subgraph DATA["Data & Eksternal"]
        PG2["PostgreSQL<br/>21 model 8 enum"]
        SUPA2["Supabase Storage"]
        MT2["Midtrans"]
        FN2["Fonnte"]
    end

    PAGES --- COMP
    COMP -->|fetch| ROUTES
    PROXY -.->|redirect /login /admin /| PAGES
    ROUTES --> S_AUTH & S_CART & S_ORDER & S_VOUCH & S_NOTIF
    S_AUTH & S_CART & S_ORDER & S_VOUCH & S_NOTIF --> L_DB
    S_AUTH --> L_FN
    S_ORDER --> L_MT
    S_ORDER & S_VOUCH --> L_VAL
    S_NOTIF --> L_FN
    ROUTES --> L_AUTH & L_ST & L_VAL
    L_DB <--> PG2
    L_ST <--> SUPA2
    L_MT <--> MT2
    L_FN <--> FN2
```
