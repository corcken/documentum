-- Datei: 03_scope_and_workflow.sql
-- Teil 3: Geltungsbereich & Workflow

CREATE TABLE tbl_scope_department (
    document_version_id INT REFERENCES tbl_document_version(id) ON DELETE CASCADE,
    department_id INT REFERENCES tbl_department(id) ON DELETE CASCADE,
    PRIMARY KEY (document_version_id, department_id)
);

CREATE TABLE tbl_scope_job_role (
    document_version_id INT REFERENCES tbl_document_version(id) ON DELETE CASCADE,
    job_role_id INT REFERENCES tbl_job_role(id) ON DELETE CASCADE,
    PRIMARY KEY (document_version_id, job_role_id)
);

CREATE TABLE tbl_workflow_task (
    id SERIAL PRIMARY KEY,
    document_version_id INT REFERENCES tbl_document_version(id) ON DELETE CASCADE,
    assigned_to INT REFERENCES tbl_user(id),
    task_type VARCHAR(20) CHECK (task_type IN ('Review', 'Approval')),
    status VARCHAR(20) CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    comments TEXT,
    completed_at TIMESTAMP
);
