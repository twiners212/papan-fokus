-- Aktifkan RLS hanya pada tabel yang membutuhkan proteksi Realtime WebSocket
ALTER TABLE "columns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

-- Kebijakan akses murni berfokus pada SELECT karena mutasi (INSERT, UPDATE, DELETE) 
-- ditangani secara eksklusif oleh Data Access Layer (DAL) via service role / bypass RLS di Drizzle.
-- Realtime WebSocket hanya perlu hak membaca (SELECT) untuk me-listen channel.

-- 1. Kebijakan untuk `columns`
CREATE POLICY "Enable real-time read access for workspace members on columns" 
ON "columns"
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "workspace_members"
    WHERE "workspace_members"."workspace_id" = "columns"."workspace_id"
    AND "workspace_members"."user_id" = auth.uid()
  )
);

-- 2. Kebijakan untuk `tasks`
CREATE POLICY "Enable real-time read access for workspace members on tasks" 
ON "tasks"
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "workspace_members"
    WHERE "workspace_members"."workspace_id" = "tasks"."workspace_id"
    AND "workspace_members"."user_id" = auth.uid()
  )
);

-- 3. Kebijakan untuk `activity_logs`
CREATE POLICY "Enable real-time read access for workspace members on activity_logs" 
ON "activity_logs"
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "workspace_members"
    WHERE "workspace_members"."workspace_id" = "activity_logs"."workspace_id"
    AND "workspace_members"."user_id" = auth.uid()
  )
);

-- 4. Kebijakan untuk `notifications`
CREATE POLICY "Enable real-time read access for owner on notifications" 
ON "notifications"
FOR SELECT 
TO authenticated
USING (
  "user_id" = auth.uid()
);