/**
 * Versionsmodell (Mone): Major.Minor
 * - Minor 0 (freigegeben): "2.0"
 * - Minor > 0 (Bearbeitungsstand): "2.045" (3-stellig)
 */
export function formatVersion(major: number, minor: number): string {
  return minor === 0 ? `${major}.0` : `${major}.${String(minor).padStart(3, "0")}`
}
