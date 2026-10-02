CREATE TABLE "credit_profiles" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"monthly_income" bigint,
	"employment_type" text,
	"employer" text,
	"limit_override" bigint,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"kind" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"data" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_instalments" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"n" integer NOT NULL,
	"due_date" text NOT NULL,
	"principal" bigint NOT NULL,
	"interest" bigint NOT NULL,
	"late_fee" bigint DEFAULT 0 NOT NULL,
	"paid" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"paid_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "loan_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"amount" bigint NOT NULL,
	"method" text NOT NULL,
	"reference" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"recorded_by_id" integer,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loan_payments_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "loan_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"min_amount" bigint NOT NULL,
	"max_amount" bigint NOT NULL,
	"tenors" jsonb NOT NULL,
	"monthly_rate_bps" integer NOT NULL,
	"interest_method" text DEFAULT 'reducing' NOT NULL,
	"processing_fee_bps" integer DEFAULT 0 NOT NULL,
	"late_fee_bps" integer DEFAULT 0 NOT NULL,
	"min_kyc_tier" integer DEFAULT 1 NOT NULL,
	"statement_above" bigint,
	"auto_approve_up_to" bigint,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"status" text NOT NULL,
	"principal" bigint NOT NULL,
	"tenor_months" integer NOT NULL,
	"monthly_rate_bps" integer NOT NULL,
	"interest_method" text NOT NULL,
	"processing_fee" bigint NOT NULL,
	"late_fee_bps" integer NOT NULL,
	"total_interest" bigint NOT NULL,
	"total_repayable" bigint NOT NULL,
	"instalment" bigint NOT NULL,
	"apr_bps" integer NOT NULL,
	"purpose" text NOT NULL,
	"payout_bank" text NOT NULL,
	"payout_account" text NOT NULL,
	"payout_name" text NOT NULL,
	"declared_income" bigint,
	"score" jsonb,
	"bureau" jsonb,
	"terms_accepted_at" timestamp with time zone NOT NULL,
	"reviewed_by_id" integer,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"approved_by_id" integer,
	"approved_at" timestamp with time zone,
	"auto_approved" boolean DEFAULT false NOT NULL,
	"declined_by_id" integer,
	"decline_reason" text,
	"disbursed_by_id" integer,
	"disbursed_at" timestamp with time zone,
	"disbursement_reference" text,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loans_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "credit_profiles" ADD CONSTRAINT "credit_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_documents" ADD CONSTRAINT "loan_documents_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_instalments" ADD CONSTRAINT "loan_instalments_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_product_id_loan_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."loan_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_declined_by_id_users_id_fk" FOREIGN KEY ("declined_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_disbursed_by_id_users_id_fk" FOREIGN KEY ("disbursed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "loan_instalments_loan_n_idx" ON "loan_instalments" USING btree ("loan_id","n");--> statement-breakpoint
CREATE INDEX "loan_instalments_due_idx" ON "loan_instalments" USING btree ("status","due_date");--> statement-breakpoint
CREATE INDEX "loan_payments_loan_idx" ON "loan_payments" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "loans_user_idx" ON "loans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "loans_status_idx" ON "loans" USING btree ("status","created_at");