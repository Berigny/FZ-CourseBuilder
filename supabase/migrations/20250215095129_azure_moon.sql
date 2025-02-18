/*
  # Insert Topic Categories and Templates
  
  1. Data Changes
    - Insert predefined topic categories if they don't exist
    - Insert predefined topic templates for each category
  
  2. Notes
    - Uses safe inserts to avoid duplicates
    - Maintains data integrity with proper foreign key relationships
*/

DO $$
DECLARE
  category_name text;
  category_desc text;
  category_id uuid;
BEGIN
  -- Fundamentals
  SELECT id INTO category_id 
  FROM topic_categories 
  WHERE name = 'Fundamentals';
  
  IF category_id IS NULL THEN
    INSERT INTO topic_categories (name, description)
    VALUES ('Fundamentals', 'Core concepts and basic principles')
    RETURNING id INTO category_id;
    
    INSERT INTO topic_templates (category_id, title, description, learning_objectives)
    VALUES 
      (category_id, 
       'Introduction and Overview',
       'Basic introduction to the subject matter',
       '[
         "Understand key terminology",
         "Identify core concepts",
         "Recognize basic principles"
       ]'::jsonb),
      (category_id,
       'Core Concepts',
       'Essential concepts and principles',
       '[
         "Define fundamental terms",
         "Explain basic relationships",
         "Apply basic concepts"
       ]'::jsonb);
  END IF;

  -- Theory
  SELECT id INTO category_id 
  FROM topic_categories 
  WHERE name = 'Theory';
  
  IF category_id IS NULL THEN
    INSERT INTO topic_categories (name, description)
    VALUES ('Theory', 'Theoretical frameworks and concepts')
    RETURNING id INTO category_id;
    
    INSERT INTO topic_templates (category_id, title, description, learning_objectives)
    VALUES 
      (category_id,
       'Theoretical Framework',
       'Understanding the theoretical foundation',
       '[
         "Analyze theoretical models",
         "Compare different approaches",
         "Evaluate theoretical implications"
       ]'::jsonb);
  END IF;

  -- Practice
  SELECT id INTO category_id 
  FROM topic_categories 
  WHERE name = 'Practice';
  
  IF category_id IS NULL THEN
    INSERT INTO topic_categories (name, description)
    VALUES ('Practice', 'Hands-on exercises and practical applications')
    RETURNING id INTO category_id;
    
    INSERT INTO topic_templates (category_id, title, description, learning_objectives)
    VALUES 
      (category_id,
       'Practical Application',
       'Applying concepts in real-world scenarios',
       '[
         "Implement solutions",
         "Practice techniques",
         "Solve practical problems"
       ]'::jsonb);
  END IF;

  -- Advanced
  SELECT id INTO category_id 
  FROM topic_categories 
  WHERE name = 'Advanced';
  
  IF category_id IS NULL THEN
    INSERT INTO topic_categories (name, description)
    VALUES ('Advanced', 'Complex topics and specialized knowledge')
    RETURNING id INTO category_id;
    
    INSERT INTO topic_templates (category_id, title, description, learning_objectives)
    VALUES 
      (category_id,
       'Advanced Techniques',
       'Complex methods and specialized approaches',
       '[
         "Master advanced concepts",
         "Develop sophisticated solutions",
         "Optimize implementations"
       ]'::jsonb);
  END IF;

  -- Case Studies
  SELECT id INTO category_id 
  FROM topic_categories 
  WHERE name = 'Case Studies';
  
  IF category_id IS NULL THEN
    INSERT INTO topic_categories (name, description)
    VALUES ('Case Studies', 'Real-world examples and analysis')
    RETURNING id INTO category_id;
    
    INSERT INTO topic_templates (category_id, title, description, learning_objectives)
    VALUES 
      (category_id,
       'Case Analysis',
       'Detailed examination of real-world examples',
       '[
         "Analyze real cases",
         "Extract key learnings",
         "Apply findings"
       ]'::jsonb);
  END IF;

  -- Tools & Techniques
  SELECT id INTO category_id 
  FROM topic_categories 
  WHERE name = 'Tools & Techniques';
  
  IF category_id IS NULL THEN
    INSERT INTO topic_categories (name, description)
    VALUES ('Tools & Techniques', 'Methods, tools, and best practices')
    RETURNING id INTO category_id;
    
    INSERT INTO topic_templates (category_id, title, description, learning_objectives)
    VALUES 
      (category_id,
       'Best Practices',
       'Industry standards and recommended approaches',
       '[
         "Identify best practices",
         "Apply standard methods",
         "Use appropriate tools"
       ]'::jsonb);
  END IF;
END $$;