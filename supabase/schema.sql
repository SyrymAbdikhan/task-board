
-- core tables

CREATE TABLE IF NOT EXISTS boards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title        TEXT NOT NULL,
  share_token  TEXT UNIQUE DEFAULT NULL,
  invite_token TEXT UNIQUE DEFAULT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS columns (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  title      TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6B7280',
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  column_id   UUID REFERENCES columns(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_members (
  board_id   UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role       TEXT NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (board_id, user_id)
);

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- enable RLS

ALTER TABLE boards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;

-- breaks the boards and board_members RLS recursion

CREATE OR REPLACE FUNCTION public.get_board_owner_id(bid uuid)
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT user_id FROM boards WHERE id = bid LIMIT 1;
$$;

-- drop all existing policies

DO $$ DECLARE r RECORD; BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('boards','columns','tasks','board_members','profiles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- RLS boards

CREATE POLICY "board_select" ON boards FOR SELECT
  USING (
    user_id = auth.uid()
    OR share_token  IS NOT NULL
    OR invite_token IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM board_members
      WHERE board_id = boards.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "board_insert" ON boards FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "board_update" ON boards FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM board_members
      WHERE board_id = boards.id AND user_id = auth.uid() AND role = 'editor'
    )
  );

CREATE POLICY "board_delete" ON boards FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS columns

CREATE POLICY "col_select" ON columns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE id = columns.board_id
        AND (
          user_id = auth.uid()
          OR share_token  IS NOT NULL
          OR invite_token IS NOT NULL
          OR EXISTS (
            SELECT 1 FROM board_members
            WHERE board_id = boards.id AND user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "col_insert" ON columns FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards
      WHERE id = columns.board_id
        AND (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM board_members
            WHERE board_id = boards.id AND user_id = auth.uid() AND role = 'editor'
          )
        )
    )
  );

CREATE POLICY "col_update" ON columns FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE id = columns.board_id
        AND (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM board_members
            WHERE board_id = boards.id AND user_id = auth.uid() AND role = 'editor'
          )
        )
    )
  );

CREATE POLICY "col_delete" ON columns FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE id = columns.board_id
        AND (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM board_members
            WHERE board_id = boards.id AND user_id = auth.uid() AND role = 'editor'
          )
        )
    )
  );

-- RLS tasks

CREATE POLICY "task_select" ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE id = tasks.board_id
        AND (
          user_id = auth.uid()
          OR share_token  IS NOT NULL
          OR invite_token IS NOT NULL
          OR EXISTS (
            SELECT 1 FROM board_members
            WHERE board_id = boards.id AND user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "task_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards
      WHERE id = tasks.board_id
        AND (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM board_members
            WHERE board_id = boards.id AND user_id = auth.uid() AND role = 'editor'
          )
        )
    )
  );

CREATE POLICY "task_update" ON tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE id = tasks.board_id
        AND (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM board_members
            WHERE board_id = boards.id AND user_id = auth.uid() AND role = 'editor'
          )
        )
    )
  );

CREATE POLICY "task_delete" ON tasks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE id = tasks.board_id
        AND (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM board_members
            WHERE board_id = boards.id AND user_id = auth.uid() AND role = 'editor'
          )
        )
    )
  );

-- RLS board_members

CREATE POLICY "members_owner_select" ON board_members FOR SELECT TO authenticated
  USING (get_board_owner_id(board_id) = auth.uid());

CREATE POLICY "members_owner_update" ON board_members FOR UPDATE TO authenticated
  USING     (get_board_owner_id(board_id) = auth.uid())
  WITH CHECK (get_board_owner_id(board_id) = auth.uid());

CREATE POLICY "members_owner_delete" ON board_members FOR DELETE TO authenticated
  USING (get_board_owner_id(board_id) = auth.uid());

CREATE POLICY "members_self_read" ON board_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "members_self_join" ON board_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "members_self_leave" ON board_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS profiles

CREATE POLICY "profiles_read" ON profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE TO authenticated
  USING     (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- auto create profile on signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email) VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- backfill profiles for existing users

INSERT INTO profiles (id, email)
  SELECT id, email FROM auth.users
  ON CONFLICT (id) DO NOTHING;
