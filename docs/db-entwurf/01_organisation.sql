-- Datei: 01_organisation.sql
-- Teil 1: Organisation & Benutzerverwaltung

CREATE TABLE tbl_department (
    id SERIAL PRIMARY KEY,
    parent_department_id INT REFERENCES tbl_department(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(10),
    description TEXT
);

CREATE TABLE tbl_job_role (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE tbl_system_role (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE tbl_user (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    department_id INT REFERENCES tbl_department(id),
    job_role_id INT REFERENCES tbl_job_role(id),
    system_role_id INT REFERENCES tbl_system_role(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
