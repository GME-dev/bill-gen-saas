-- Start transaction
BEGIN;

-- Create backup function first
\i 'backup_schema.sql'

-- Run backup before changes
SELECT backup_schema_state();

-- Create main schema
\i 'supabase_migration.sql'

-- Create helper functions
\i 'helper_functions.sql'

-- Create reporting views
\i 'reporting_views.sql'

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create policies for Row Level Security
ALTER TABLE bike_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Allow read access to bike_models for all
CREATE POLICY "Allow read access to bike_models for all"
    ON bike_models FOR SELECT
    TO public
    USING (true);

-- Allow authenticated users to read all bills
CREATE POLICY "Allow authenticated users to read all bills"
    ON bills FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to create bills
CREATE POLICY "Allow authenticated users to create bills"
    ON bills FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update their own bills
CREATE POLICY "Allow authenticated users to update pending bills"
    ON bills FOR UPDATE
    TO authenticated
    USING (status = 'pending');

COMMIT; 