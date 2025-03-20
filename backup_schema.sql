-- Function to backup the current schema state
CREATE OR REPLACE FUNCTION backup_schema_state() RETURNS void AS $$
BEGIN
    -- Create backup schema if it doesn't exist
    CREATE SCHEMA IF NOT EXISTS backup_schema;
    
    -- Backup bike_models if it exists
    DROP TABLE IF EXISTS backup_schema.bike_models CASCADE;
    CREATE TABLE IF EXISTS public.bike_models AS
    SELECT * FROM public.bike_models;
    
    -- Backup bills if it exists
    DROP TABLE IF EXISTS backup_schema.bills CASCADE;
    CREATE TABLE IF EXISTS public.bills AS
    SELECT * FROM public.bills;
END;
$$ LANGUAGE plpgsql; 