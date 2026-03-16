-- Ensure password_reset_tokens and platform_config exist (may be missing in some Neon states).
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'password_reset_tokens_token_key') THEN
    CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'password_reset_tokens_user_id_fkey' AND table_name = 'password_reset_tokens') THEN
    ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "platform_config" (
  "id" TEXT NOT NULL,
  "config_json" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);
