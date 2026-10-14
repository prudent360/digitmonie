ALTER TABLE "loans" ALTER COLUMN "terms_accepted_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "prepared_by_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "officer_id" integer;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_prepared_by_id_users_id_fk" FOREIGN KEY ("prepared_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_officer_idx" ON "users" USING btree ("officer_id");