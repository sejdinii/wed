CREATE TABLE "auth_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"status" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"confirmation_code" text NOT NULL,
	"venue_id" text NOT NULL,
	"user_id" uuid,
	"event_date" date NOT NULL,
	"guest_count" integer NOT NULL,
	"menu_tier_id" text NOT NULL,
	"hall_id" text,
	"estimated_total_mkd" integer NOT NULL,
	"kapar_mkd" integer NOT NULL,
	"balance_due_mkd" integer NOT NULL,
	"status" text DEFAULT 'pending_kapar' NOT NULL,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"special_requests" text,
	"pay_by" date,
	"kapar_paid_at" timestamp with time zone,
	"refund_percent" integer,
	"refund_amount_mkd" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_confirmation_code_unique" UNIQUE("confirmation_code")
);
--> statement-breakpoint
CREATE TABLE "halls" (
	"id" text NOT NULL,
	"venue_id" text NOT NULL,
	"name" jsonb NOT NULL,
	"capacity_min" integer NOT NULL,
	"capacity_max" integer NOT NULL,
	"indoor" boolean NOT NULL,
	"area_m2" integer NOT NULL,
	"price_per_guest_adj_mkd" integer DEFAULT 0 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "halls_venue_id_id_pk" PRIMARY KEY("venue_id","id")
);
--> statement-breakpoint
CREATE TABLE "menu_tiers" (
	"id" text NOT NULL,
	"venue_id" text NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"price_per_guest_mkd" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "menu_tiers_venue_id_id_pk" PRIMARY KEY("venue_id","id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"author" text NOT NULL,
	"score" real NOT NULL,
	"event_date" date NOT NULL,
	"guest_count" integer NOT NULL,
	"positive" text NOT NULL,
	"negative" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"phone" text,
	"name" text,
	"role" text DEFAULT 'couple' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"venue_type" text NOT NULL,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"photos" jsonb NOT NULL,
	"capacity_min" integer NOT NULL,
	"capacity_max" integer NOT NULL,
	"amenities" jsonb NOT NULL,
	"included" jsonb NOT NULL,
	"food_options" jsonb NOT NULL,
	"scores" jsonb NOT NULL,
	"house_rules" jsonb NOT NULL,
	"coords" jsonb NOT NULL,
	"nearby" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"rating" real NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"response_time_hours" integer DEFAULT 24 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"kapar_policy" jsonb NOT NULL,
	"booked_dates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "halls" ADD CONSTRAINT "halls_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_tiers" ADD CONSTRAINT "menu_tiers_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_booking_per_venue_date" ON "bookings" USING btree ("venue_id","event_date") WHERE status IN ('pending_kapar', 'reserved', 'confirmed');