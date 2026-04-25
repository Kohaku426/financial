-- Add transportation_fee column to workplaces table
ALTER TABLE workplaces ADD COLUMN IF NOT EXISTS transportation_fee INTEGER DEFAULT 0;
