-- Datei: 04_training_management.sql
-- Teil 4: Schulungsmanagement

CREATE TABLE tbl_training_record (
    id SERIAL PRIMARY KEY,
    document_version_id INT REFERENCES tbl_document_version(id) ON DELETE CASCADE,
    user_id INT REFERENCES tbl_user(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('Assigned', 'Completed', 'Overdue')),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE NOT NULL,
    completed_at TIMESTAMP,
    electronic_signature VARCHAR(255) 
);
