-- PartnerProfile: Vision Latam commission per partner (override global when set)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'partner_profiles' AND column_name = 'vision_latam_commission_pct') THEN
    ALTER TABLE partner_profiles ADD COLUMN vision_latam_commission_pct DOUBLE PRECISION;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'partner_profiles' AND column_name = 'vision_latam_commission_fixed_usd') THEN
    ALTER TABLE partner_profiles ADD COLUMN vision_latam_commission_fixed_usd DOUBLE PRECISION;
  END IF;
END $$;

-- Quote: superadmin comment and reviewed_at for approval/rejection/modification
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'superadmin_comment') THEN
    ALTER TABLE quotes ADD COLUMN superadmin_comment TEXT;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'reviewed_at') THEN
    ALTER TABLE quotes ADD COLUMN reviewed_at TIMESTAMP(3) WITHOUT TIME ZONE;
  END IF;
END $$;
