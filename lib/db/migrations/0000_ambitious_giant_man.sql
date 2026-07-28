CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"nome" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "barbershop" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"nome" text NOT NULL,
	"telefone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"cidade" text DEFAULT '' NOT NULL,
	"logo" text,
	"cor_primaria" text DEFAULT '#000000' NOT NULL,
	"cor_secundaria" text,
	"whatsapp" text,
	"instagram" text,
	"mensagem_padrao" text,
	"dias_retorno" integer DEFAULT 30 NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"plan_expires_at" timestamp with time zone,
	"trial_starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trial_notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbershop_id" integer NOT NULL,
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"email" text,
	"data_nascimento" date,
	"observacoes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"total_visitas" integer DEFAULT 0 NOT NULL,
	"ultimo_atendimento" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "barbers" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbershop_id" integer NOT NULL,
	"nome" text NOT NULL,
	"telefone" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"foto" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbershop_id" integer NOT NULL,
	"nome" text NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"duracao" integer DEFAULT 30 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbershop_id" integer NOT NULL,
	"cliente_id" integer NOT NULL,
	"barbeiro_id" integer,
	"servico_id" integer,
	"valor" numeric(10, 2) DEFAULT '0' NOT NULL,
	"desconto" numeric(10, 2) DEFAULT '0' NOT NULL,
	"valor_final" numeric(10, 2) DEFAULT '0' NOT NULL,
	"data" timestamp with time zone NOT NULL,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbershop_id" integer NOT NULL,
	"codigo" text NOT NULL,
	"tipo" text DEFAULT 'percent' NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"validade" date,
	"ativo" boolean DEFAULT true NOT NULL,
	"uso_maximo" integer,
	"uso_atual" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbershop_id" integer NOT NULL,
	"nome" text NOT NULL,
	"tipo" text DEFAULT 'return' NOT NULL,
	"dias" integer DEFAULT 30 NOT NULL,
	"mensagem" text NOT NULL,
	"cupom_id" integer,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbershop_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"campaign_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"sent_by" integer,
	"opened" boolean DEFAULT false NOT NULL,
	"clicked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"external_id" text NOT NULL,
	"barbershop_id" integer,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "barbershop" ADD CONSTRAINT "barbershop_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_barbershop_id_barbershop_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barbers" ADD CONSTRAINT "barbers_barbershop_id_barbershop_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_barbershop_id_barbershop_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barbershop_id_barbershop_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cliente_id_clients_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barbeiro_id_barbers_id_fk" FOREIGN KEY ("barbeiro_id") REFERENCES "public"."barbers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_servico_id_services_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_barbershop_id_barbershop_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_barbershop_id_barbershop_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_cupom_id_coupons_id_fk" FOREIGN KEY ("cupom_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_barbershop_id_barbershop_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_notifications" ADD CONSTRAINT "payment_notifications_barbershop_id_barbershop_id_fk" FOREIGN KEY ("barbershop_id") REFERENCES "public"."barbershop"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_notifications_tipo_external_id_idx" ON "payment_notifications" USING btree ("tipo","external_id");