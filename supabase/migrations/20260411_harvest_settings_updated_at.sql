-- Migration: Add updated_at column to harvest_settings
-- Reason: Column existed in prod but was not in the original schema definition.
--         Required by 20260412_orchards_min_wage_floor.sql

ALTER TABLE public.harvest_settings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
