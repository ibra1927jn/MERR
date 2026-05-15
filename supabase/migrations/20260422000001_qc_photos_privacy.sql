-- ============================================================================
-- qc-photos bucket privacy hardening
-- Audit refs: audits/2026_04_22/02_rls_auth_security.md CRIT-5
--             audits/2026_04_22/12_secrets_env_config.md HIGH-01
--
-- Problem (pre-existing in 2026021300_create_qc_photos_bucket.sql):
--   - Bucket was public: getPublicUrl() leaked MPI compliance evidence (QC
--     photos) to anyone with a URL guess or a referrer leak.
--   - DELETE policy permitted any authenticated user to delete any photo,
--     allowing evidence tampering.
--
-- Fix:
--   1. Flip bucket to private (public = false). Reads must use signed URLs.
--   2. Drop the permissive SELECT/INSERT/DELETE policies and recreate them:
--      - INSERT: only qc_inspector/admin may upload, and the first folder
--        must equal the caller's orchard_id.
--      - SELECT: only authenticated users whose role is qc_inspector, admin,
--        manager, team_leader AND whose orchard_id matches the first path
--        segment (upload path layout is {orchard_id}/{YYYY-MM-DD}/{uuid}.webp).
--      - DELETE: the original uploader (storage.objects.owner = auth.uid())
--        within their orchard, qc_inspector within their orchard (curate),
--        or admin anywhere.
--   3. Keep allowed_mime_types/size limit untouched (defined in the original
--      migration, which we must not modify).
--
-- Path layout contract (src/hooks/useQC.ts):
--   {orchardId}/{YYYY-MM-DD}/{uuid}.webp
-- First folder is orchard_id. We use storage.foldername(name)[1] to enforce it.
-- ============================================================================

-- 1. Flip bucket to private.
UPDATE storage.buckets
   SET public = false
 WHERE id = 'qc-photos';

-- 2. Drop all prior qc-photos policies (idempotent; names from the original
--    migration 2026021300_create_qc_photos_bucket.sql).
DROP POLICY IF EXISTS "Authenticated users can upload QC photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view QC photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own QC photos" ON storage.objects;

-- Also drop any policies created by this migration on re-run.
DROP POLICY IF EXISTS "qc_photos_insert_inspectors" ON storage.objects;
DROP POLICY IF EXISTS "qc_photos_select_same_orchard" ON storage.objects;
DROP POLICY IF EXISTS "qc_photos_delete_owner_or_admin" ON storage.objects;

-- 3. INSERT policy: only qc_inspector or admin may upload, and the first
--    folder must be the caller's orchard_id (prevents uploading into another
--    orchard's evidence tree).
CREATE POLICY "qc_photos_insert_inspectors"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'qc-photos'
        AND EXISTS (
            SELECT 1 FROM public.users u
             WHERE u.id = auth.uid()
               AND u.role IN ('qc_inspector','admin')
        )
        AND (storage.foldername(name))[1] = public.get_my_orchard_id()::text
    );

-- 4. SELECT policy: authenticated users with a QC-relevant role AND whose
--    orchard matches the photo path. admin bypasses the orchard check so
--    cross-orchard investigations/audits remain possible.
CREATE POLICY "qc_photos_select_same_orchard"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'qc-photos'
        AND EXISTS (
            SELECT 1 FROM public.users u
             WHERE u.id = auth.uid()
               AND u.role IN ('qc_inspector','admin','manager','team_leader')
        )
        AND (
            EXISTS (
                SELECT 1 FROM public.users u
                 WHERE u.id = auth.uid()
                   AND u.role = 'admin'
            )
            OR (storage.foldername(name))[1] = public.get_my_orchard_id()::text
        )
    );

-- 5. DELETE policy: the uploader (owner = auth.uid()) within their orchard,
--    qc_inspector within their orchard (so QC leads can curate evidence),
--    or admin anywhere.
CREATE POLICY "qc_photos_delete_owner_or_admin"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'qc-photos'
        AND (
            EXISTS (
                SELECT 1 FROM public.users u
                 WHERE u.id = auth.uid()
                   AND u.role = 'admin'
            )
            OR (
                (storage.foldername(name))[1] = public.get_my_orchard_id()::text
                AND (
                    owner = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.users u
                         WHERE u.id = auth.uid()
                           AND u.role = 'qc_inspector'
                    )
                )
            )
        )
    );

COMMENT ON POLICY "qc_photos_insert_inspectors" ON storage.objects IS
    'qc-photos bucket: only qc_inspector/admin, path must start with caller orchard_id.';
COMMENT ON POLICY "qc_photos_select_same_orchard" ON storage.objects IS
    'qc-photos bucket: qc_inspector/admin/manager/team_leader, scoped to orchard (admin bypass).';
COMMENT ON POLICY "qc_photos_delete_owner_or_admin" ON storage.objects IS
    'qc-photos bucket: uploader or qc_inspector within orchard, or admin anywhere.';
