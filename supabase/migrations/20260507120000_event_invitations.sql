-- ============================================================
-- Event Invitations & Contact Lists
-- ============================================================

-- Table: event_invitations
CREATE TABLE IF NOT EXISTS public.event_invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_name  text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'declined')),
  personal_note   text,
  invited_at      timestamptz NOT NULL DEFAULT now(),
  responded_at    timestamptz
);

ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;

-- Admins see all; senders see their own
CREATE POLICY "event_invitations_select" ON public.event_invitations
  FOR SELECT USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "event_invitations_insert" ON public.event_invitations
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "event_invitations_update" ON public.event_invitations
  FOR UPDATE USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "event_invitations_delete" ON public.event_invitations
  FOR DELETE USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Table: invitation_contact_lists
CREATE TABLE IF NOT EXISTS public.invitation_contact_lists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  name       text NOT NULL,
  contacts   jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invitation_contact_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_lists_owner_all" ON public.invitation_contact_lists
  FOR ALL USING (owner_id = auth.uid());

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_invitations_event_id   ON public.event_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_sender_id  ON public.event_invitations(sender_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_status     ON public.event_invitations(status);
CREATE INDEX IF NOT EXISTS idx_contact_lists_owner_id       ON public.invitation_contact_lists(owner_id);
