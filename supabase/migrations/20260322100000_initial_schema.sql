-- Despatch Tracker: Initial Schema
-- Trucks table: primary identifier is reg_no
CREATE TABLE IF NOT EXISTS trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reg_no text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Slips table: one slip per unscanned tyre
CREATE TABLE IF NOT EXISTS slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
  job_number text NOT NULL,
  cs_number text,
  customer text,
  service_type text,
  tyre_make text,
  tyre_size text,
  serial text,
  photo_url text,
  invoice_number text,
  notes text,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slips_truck_id ON slips(truck_id);
CREATE INDEX IF NOT EXISTS idx_slips_scanned_at ON slips(scanned_at);
CREATE INDEX IF NOT EXISTS idx_slips_job_number ON slips(job_number);

-- RLS: single-user app, allow all operations for anon role
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE slips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_trucks" ON trucks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_slips" ON slips FOR ALL USING (true) WITH CHECK (true);

-- Storage policies for the 'images' bucket (created via dashboard)
-- Allow anon to upload
CREATE POLICY "anon_upload_images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'images');

-- Allow anon to update their uploads
CREATE POLICY "anon_update_images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'images') WITH CHECK (bucket_id = 'images');

-- Allow anon to delete
CREATE POLICY "anon_delete_images" ON storage.objects
  FOR DELETE USING (bucket_id = 'images');

-- Allow public read (bucket is already public, but for completeness)
CREATE POLICY "public_read_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');
