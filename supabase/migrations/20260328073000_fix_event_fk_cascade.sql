-- Fix missing ON DELETE CASCADE on resource_returns.event_id
-- and resource_audit_log.event_id so that deleting an event
-- also removes its related resource return and audit records.

ALTER TABLE resource_returns
  DROP CONSTRAINT IF EXISTS resource_returns_event_id_fkey,
  ADD CONSTRAINT resource_returns_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE resource_audit_log
  DROP CONSTRAINT IF EXISTS resource_audit_log_event_id_fkey,
  ADD CONSTRAINT resource_audit_log_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
