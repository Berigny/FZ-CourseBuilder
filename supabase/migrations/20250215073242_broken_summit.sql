/*
  # Improve lessons table structure

  1. Changes
    - Make user_id column NOT NULL
    - Add index on user_id for better query performance
    - Add index on (user_id, created_at) for efficient user-specific sorting
*/

-- Make user_id NOT NULL
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lessons' 
    AND column_name = 'user_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE lessons 
    ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Add index on user_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'lessons' 
    AND indexname = 'lessons_user_id_idx'
  ) THEN
    CREATE INDEX lessons_user_id_idx ON lessons(user_id);
  END IF;
END $$;

-- Add compound index for user-specific sorting if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'lessons' 
    AND indexname = 'lessons_user_id_created_at_idx'
  ) THEN
    CREATE INDEX lessons_user_id_created_at_idx ON lessons(user_id, created_at DESC);
  END IF;
END $$;