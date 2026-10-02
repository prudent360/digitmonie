CREATE TABLE "kyc_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"kind" text NOT NULL,
	"mime_type" text NOT NULL,
	"data" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_profiles" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"bvn_encrypted" text,
	"bvn_hash" text,
	"bvn_last4" text,
	"nin_encrypted" text,
	"nin_hash" text,
	"nin_last4" text,
	"legal_first_name" text,
	"legal_middle_name" text,
	"legal_last_name" text,
	"date_of_birth" text,
	"gender" text,
	"address_line" text,
	"city" text,
	"state" text,
	"consent_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kyc_profiles_bvn_hash_unique" UNIQUE("bvn_hash"),
	CONSTRAINT "kyc_profiles_nin_hash_unique" UNIQUE("nin_hash")
);
--> statement-breakpoint
CREATE TABLE "kyc_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tier" integer NOT NULL,
	"status" text NOT NULL,
	"decided_by" text,
	"checks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reason" text,
	"reviewed_by_id" integer,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_submission_id_kyc_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."kyc_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_profiles" ADD CONSTRAINT "kyc_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kyc_documents_submission_idx" ON "kyc_documents" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "kyc_submissions_status_idx" ON "kyc_submissions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "kyc_submissions_user_idx" ON "kyc_submissions" USING btree ("user_id");