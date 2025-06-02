CREATE TYPE "public"."habit_direction" AS ENUM('positive', 'negative', 'both');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('trivial', 'easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('habit', 'daily', 'todo');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"task_type" "task_type" NOT NULL,
	"task_id" integer NOT NULL,
	"action" text NOT NULL,
	"value" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dailies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"priority" "task_priority" DEFAULT 'easy' NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"repeat" json DEFAULT '[true,true,true,true,true,true,true]'::json NOT NULL,
	"icon" text DEFAULT 'CheckCircle',
	"duration" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"last_completed" timestamp,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"priority" "task_priority" DEFAULT 'easy' NOT NULL,
	"direction" "habit_direction" DEFAULT 'both' NOT NULL,
	"strength" integer DEFAULT 0 NOT NULL,
	"positive" boolean DEFAULT true NOT NULL,
	"negative" boolean DEFAULT true NOT NULL,
	"counter_up" integer DEFAULT 0 NOT NULL,
	"counter_down" integer DEFAULT 0 NOT NULL,
	"duration" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_vida" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"type" "task_type" NOT NULL,
	"priority" "task_priority" DEFAULT 'easy' NOT NULL,
	"completed" boolean DEFAULT false,
	"due_date" timestamp,
	"repeat" boolean[] DEFAULT '{true,true,true,true,true,true,true}' NOT NULL,
	"direction" "habit_direction",
	"positive" boolean,
	"negative" boolean,
	"counter_up" integer DEFAULT 0,
	"counter_down" integer DEFAULT 0,
	"streak" integer DEFAULT 0,
	"strength" integer DEFAULT 0,
	"duration" integer DEFAULT 0,
	"last_completed" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"priority" "task_priority" DEFAULT 'easy' NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"due_date" timestamp,
	"duration" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"avatar" text,
	"auth_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dailies" ADD CONSTRAINT "dailies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;