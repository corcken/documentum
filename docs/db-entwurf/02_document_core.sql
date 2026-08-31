-- Datei: 02_document_core.sql
-- Teil 2: Dokumentenkern & Metadaten

CREATE TABLE tbl_document_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    requires_training BOOLEAN NOT NULL DEFAULT FALSE 
);

CREATE TABLE tbl_document (
    id SERIAL PRIMARY KEY,
    document_number VARCHAR(50) UNIQUE NOT NULL, 
    document_type_id INT REFERENCES tbl_document_type(id),
    owner_id INT REFERENCES tbl_user(id), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_document_version (
    id SERIAL PRIMARY KEY,
    document_id INT REFERENCES tbl_document(id) ON DELETE CASCADE,
    version_number VARCHAR(10) NOT NULL, 
    title VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL, 
    status VARCHAR(50) CHECK (status IN ('Draft', 'In_Review', 'In_Approval', 'Released', 'Archived')),
    effective_date DATE, 
    obsolete_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES tbl_user(id)
);
