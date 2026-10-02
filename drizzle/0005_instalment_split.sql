ALTER TABLE "loan_instalments" ADD COLUMN "paid_late_fee" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_instalments" ADD COLUMN "paid_interest" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_instalments" ADD COLUMN "paid_principal" bigint DEFAULT 0 NOT NULL;