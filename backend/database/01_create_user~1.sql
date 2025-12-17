-- Create user for our application
CREATE USER s_db IDENTIFIED BY password123;

-- Grant necessary privileges
GRANT CONNECT, RESOURCE, DBA TO studio_db;

-- Allow unlimited storage
ALTER USER s_db QUOTA UNLIMITED ON USERS;

-- Grant create session
GRANT CREATE SESSION TO s_db;

-- Verify user creation
SELECT username FROM dba_users WHERE username = 'S_DB';

GRANT CREATE ANY TABLE TO s_db;
GRANT CREATE ANY INDEX TO s_db;
GRANT CREATE ANY TRIGGER TO s_db;
GRANT CREATE ANY SEQUENCE TO s_db;
GRANT DROP ANY TABLE TO s_db;
GRANT SELECT ANY TABLE TO s_db;
GRANT INSERT ANY TABLE TO s_db;
GRANT UPDATE ANY TABLE TO s_db;
GRANT DELETE ANY TABLE TO s_db;