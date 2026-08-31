-- Datei: 05_revision_logic.sql
-- Teil 5: Revisions-Automatisierung

-- Trigger-Funktion: Archiviert alte Versionen automatisch
CREATE OR REPLACE FUNCTION archive_superseded_versions()
RETURNS TRIGGER AS $$
BEGIN
    -- Prüfen: Hat sich der Status der aktuellen Version auf 'Released' geändert?
    IF NEW.status = 'Released' AND OLD.status != 'Released' THEN
        
        -- Setze alle anderen freigegebenen Versionen DIESES Dokuments auf 'Archived'
        UPDATE tbl_document_version
        SET status = 'Archived',
            obsolete_date = CURRENT_DATE
        WHERE document_id = NEW.document_id
          AND id != NEW.id
          AND status = 'Released';
          
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger an die Tabelle binden
CREATE TRIGGER trg_archive_superseded_versions
AFTER UPDATE OF status ON tbl_document_version
FOR EACH ROW
EXECUTE FUNCTION archive_superseded_versions();
