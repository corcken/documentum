-- Datei: 06_training_trigger.sql
-- Teil 6: Schulungs-Trigger (Rekursive CTE Logik)

-- Diese Query dient als Konzept/Voransicht, wie die Schulungen inkl. Unterabteilungen
-- nach der Freigabe im Backend (oder per weiterem Trigger) zugewiesen werden.

/*
WITH RECURSIVE DepartmentTree AS (
    SELECT department_id 
    FROM tbl_scope_department 
    WHERE document_version_id = 12345
    
    UNION
    
    SELECT d.id
    FROM tbl_department d
    INNER JOIN DepartmentTree dt ON d.parent_department_id = dt.department_id
)
INSERT INTO tbl_training_record (document_version_id, user_id, status, due_date)
SELECT DISTINCT 
    12345 AS document_version_id,
    u.id AS user_id,
    'Assigned' AS status,
    CURRENT_DATE + INTERVAL '30 days' AS due_date
FROM tbl_user u
LEFT JOIN DepartmentTree dt ON u.department_id = dt.department_id
LEFT JOIN tbl_scope_job_role sr ON sr.document_version_id = 12345 AND u.job_role_id = sr.job_role_id
WHERE (dt.department_id IS NOT NULL OR sr.job_role_id IS NOT NULL)
  AND u.is_active = TRUE;
*/
