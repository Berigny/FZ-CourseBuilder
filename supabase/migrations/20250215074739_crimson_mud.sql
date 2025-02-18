/*
  # Update lessons table status constraint

  1. Changes
    - Add 'needs_refinement' to the allowed status values for lessons
  
  2. Security
    - Maintains existing RLS policies
    - Only updates the check constraint
*/

-- Drop existing check constraint
ALTER TABLE lessons 
DROP CONSTRAINT IF EXISTS lessons_status_check;

-- Add updated check constraint with new status
ALTER TABLE lessons 
ADD CONSTRAINT lessons_status_check 
CHECK (status IN ('processing', 'complete', 'failed', 'needs_refinement'));