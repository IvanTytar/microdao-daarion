-- Matrix Synapse PostgreSQL initialization
-- Run this on the existing dagi-postgres instance

-- Create synapse database
CREATE DATABASE synapse
  ENCODING 'UTF8'
  LC_COLLATE='C'
  LC_CTYPE='C'
  template=template0;

-- Create synapse user (password should be set via env variable)
CREATE USER synapse WITH ENCRYPTED PASSWORD 'CHANGE_ME_IN_PRODUCTION';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE synapse TO synapse;

-- Connect to synapse database and set up extensions
\c synapse

-- Required extensions for Synapse
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO synapse;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO synapse;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO synapse;

