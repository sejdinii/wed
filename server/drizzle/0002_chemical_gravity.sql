CREATE TABLE "blocked_dates" (
	"venue_id" text NOT NULL,
	"date" date NOT NULL,
	CONSTRAINT "blocked_dates_venue_id_date_pk" PRIMARY KEY("venue_id","date")
);
--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "owner_user_id" uuid;--> statement-breakpoint
ALTER TABLE "blocked_dates" ADD CONSTRAINT "blocked_dates_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;