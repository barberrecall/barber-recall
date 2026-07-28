CREATE INDEX "barbershop_user_idx" ON "barbershop" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clients_barbershop_idx" ON "clients" USING btree ("barbershop_id");--> statement-breakpoint
CREATE INDEX "clients_barbershop_ativo_idx" ON "clients" USING btree ("barbershop_id","ativo");--> statement-breakpoint
CREATE INDEX "barbers_barbershop_idx" ON "barbers" USING btree ("barbershop_id");--> statement-breakpoint
CREATE INDEX "services_barbershop_idx" ON "services" USING btree ("barbershop_id");--> statement-breakpoint
CREATE INDEX "appointments_barbershop_data_idx" ON "appointments" USING btree ("barbershop_id","data");--> statement-breakpoint
CREATE INDEX "appointments_cliente_idx" ON "appointments" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "coupons_barbershop_idx" ON "coupons" USING btree ("barbershop_id");--> statement-breakpoint
CREATE INDEX "campaigns_barbershop_idx" ON "campaigns" USING btree ("barbershop_id");--> statement-breakpoint
CREATE INDEX "notifications_barbershop_idx" ON "notifications" USING btree ("barbershop_id");--> statement-breakpoint
CREATE INDEX "notifications_campaign_idx" ON "notifications" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "notifications_client_idx" ON "notifications" USING btree ("client_id");