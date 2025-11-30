-- CreateTable
CREATE TABLE "auth_users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "password" TEXT NOT NULL,
    "subscription_status" VARCHAR(20) NOT NULL DEFAULT 'incomplete',
    "stripe_customer_id" VARCHAR(255),
    "stripe_subscription_id" VARCHAR(255),
    "subscription_tier" TEXT NOT NULL DEFAULT 'free',
    "subscription_ends_at" TIMESTAMPTZ(6),
    "trial_start" TIMESTAMPTZ(6),
    "trial_end" TIMESTAMPTZ(6),
    "referral_code" TEXT,
    "referred_by" TEXT,
    "early_adopter" BOOLEAN NOT NULL DEFAULT false,
    "lifetime_discount" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "merchant_name" VARCHAR(255) NOT NULL,
    "receipt_date" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "note" TEXT,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "is_duplicate" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DECIMAL(3,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "title" VARCHAR(255),
    "total_amount" DECIMAL(10,2) NOT NULL,
    "receipt_count" INTEGER NOT NULL DEFAULT 0,
    "pdf_url" TEXT,
    "csv_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "address_line_1" VARCHAR(255),
    "address_line_2" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(50),
    "zip_code" VARCHAR(20),
    "country" VARCHAR(100) NOT NULL DEFAULT 'United States',
    "approver_name" VARCHAR(255),
    "approver_email" VARCHAR(255),
    "department" VARCHAR(100),
    "cost_center" VARCHAR(100),
    "notes" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "event_type" VARCHAR(100) NOT NULL,
    "event_data" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts_items" (
    "id" SERIAL NOT NULL,
    "receipt_id" INTEGER NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_usage" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "feature" TEXT NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "reset_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reset_day" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_events" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "old_tier" TEXT,
    "new_tier" TEXT,
    "old_status" TEXT,
    "new_status" TEXT,
    "stripe_event_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_tracking" (
    "id" SERIAL NOT NULL,
    "referrer_id" INTEGER NOT NULL,
    "referred_id" INTEGER NOT NULL,
    "referral_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reward_type" TEXT,
    "reward_value" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "referral_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_tiers" (
    "id" SERIAL NOT NULL,
    "tier_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "monthly_price_cents" INTEGER NOT NULL,
    "yearly_price_cents" INTEGER NOT NULL,
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "max_receipts" INTEGER,
    "max_reports" INTEGER,
    "features" JSONB NOT NULL,
    "stripe_price_id_monthly" TEXT,
    "stripe_price_id_yearly" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_users_email_key" ON "auth_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_users_referral_code_key" ON "auth_users"("referral_code");

-- CreateIndex
CREATE INDEX "idx_auth_users_subscription_tier" ON "auth_users"("subscription_tier");

-- CreateIndex
CREATE INDEX "idx_auth_users_subscription_status" ON "auth_users"("subscription_status");

-- CreateIndex
CREATE INDEX "idx_auth_users_stripe_customer_id" ON "auth_users"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "idx_auth_users_stripe_subscription_id" ON "auth_users"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "idx_receipts_user_id" ON "receipts"("user_id");

-- CreateIndex
CREATE INDEX "idx_receipts_date" ON "receipts"("receipt_date");

-- CreateIndex
CREATE INDEX "idx_receipts_category" ON "receipts"("category");

-- CreateIndex
CREATE INDEX "idx_receipts_merchant" ON "receipts"("merchant_name");

-- CreateIndex
CREATE INDEX "idx_receipts_created_at" ON "receipts"("created_at");

-- CreateIndex
CREATE INDEX "idx_receipts_user_date" ON "receipts"("user_id", "receipt_date" DESC);

-- CreateIndex
CREATE INDEX "idx_receipts_user_category" ON "receipts"("user_id", "category");

-- CreateIndex
CREATE INDEX "idx_receipts_duplicate_check" ON "receipts"("user_id", "merchant_name", "amount", "receipt_date");

-- CreateIndex
CREATE INDEX "idx_reports_user_id" ON "reports"("user_id");

-- CreateIndex
CREATE INDEX "idx_reports_period" ON "reports"("period_start", "period_end");

-- CreateIndex
CREATE INDEX "idx_reports_created_at" ON "reports"("created_at");

-- CreateIndex
CREATE INDEX "idx_company_settings_user_id" ON "company_settings"("user_id");

-- CreateIndex
CREATE INDEX "idx_company_settings_default" ON "company_settings"("user_id", "is_default");

-- CreateIndex
CREATE INDEX "idx_audit_log_user_id" ON "audit_log"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_event_type" ON "audit_log"("event_type");

-- CreateIndex
CREATE INDEX "idx_audit_log_created_at" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "idx_receipts_items_receipt_id" ON "receipts_items"("receipt_id");

-- CreateIndex
CREATE INDEX "idx_subscription_usage_user_id" ON "subscription_usage"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_usage_user_feature_day_key" ON "subscription_usage"("user_id", "feature", "reset_day");

-- CreateIndex
CREATE INDEX "idx_subscription_events_user_id" ON "subscription_events"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_tracking_referred_id_key" ON "referral_tracking"("referred_id");

-- CreateIndex
CREATE INDEX "idx_referral_tracking_referrer_id" ON "referral_tracking"("referrer_id");

-- CreateIndex
CREATE INDEX "idx_referral_tracking_referred_id" ON "referral_tracking"("referred_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_tiers_tier_name_key" ON "subscription_tiers"("tier_name");

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts_items" ADD CONSTRAINT "receipts_items_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_usage" ADD CONSTRAINT "subscription_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_tracking" ADD CONSTRAINT "referral_tracking_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_tracking" ADD CONSTRAINT "referral_tracking_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
