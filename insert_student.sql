INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_super_admin
) VALUES (
  'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'student@test.com',
  '$2a$10$PL7GSj5AhjZq5C92wFJADuxuQ8Q4.NA6CoX3gW8LIuzFSqq21EVQe',
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Test Student", "department": "IT", "role": "student"}',
  now(),
  now(),
  false
) ON CONFLICT (id) DO NOTHING;
