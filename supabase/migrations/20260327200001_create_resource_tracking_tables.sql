-- ============================================================
-- Resource Returns table
-- Records each resource return after an event with condition
-- ============================================================
CREATE TABLE IF NOT EXISTS resource_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_resource_id uuid REFERENCES event_resources(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id),
  resource_type_id uuid REFERENCES resource_types(id),
  quantity_returned integer NOT NULL DEFAULT 0,
  condition text NOT NULL DEFAULT 'good',
  notes text,
  returned_by uuid,
  returned_at timestamptz DEFAULT now()
);

-- ============================================================
-- Resource Audit Log table
-- Tracks all allocation, deallocation, and return actions
-- ============================================================
CREATE TABLE IF NOT EXISTS resource_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id),
  resource_type_id uuid REFERENCES resource_types(id),
  action text NOT NULL,
  quantity integer,
  condition text,
  performed_by uuid,
  performed_at timestamptz DEFAULT now(),
  notes text
);

-- Enable Row Level Security
ALTER TABLE resource_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Allow authenticated read on resource_returns"
  ON resource_returns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on resource_audit_log"
  ON resource_audit_log FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to insert
CREATE POLICY "Allow authenticated insert on resource_returns"
  ON resource_returns FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated insert on resource_audit_log"
  ON resource_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
