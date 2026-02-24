-- Add ai_description column to clothing_items table
ALTER TABLE clothing_items ADD COLUMN IF NOT EXISTS ai_description TEXT;
