-- =============================================
-- CHECK COLUMNS SCRIPT
-- Run this in Supabase > SQL Editor
-- =============================================

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pickers';
