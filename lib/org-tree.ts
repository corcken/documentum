/**
 * Organisationseinheiten — Baum-Helfer.
 * Die Einheiten sind bewusst semantik-frei: kein festes Level-Konzept
 * (kein "Ebene 1 = Abteilung, Ebene 2 = Team"), nur Eltern-Kind-Beziehung,
 * beliebig tief.
 */

export type OrgUnitFlat = {
  id: string
  name: string
  parentId: string | null
  abbreviation: string | null
}

export type OrgUnitNode = OrgUnitFlat & { children: OrgUnitNode[] }

/** Baut aus einer flachen Liste einen (verschachtelten) Baum. */
export function buildOrgTree(units: OrgUnitFlat[]): OrgUnitNode[] {
  const map = new Map<string, OrgUnitNode>()
  for (const u of units) map.set(u.id, { ...u, children: [] })
  const roots: OrgUnitNode[] = []
  for (const u of units) {
    const node = map.get(u.id)!
    if (u.parentId && map.has(u.parentId)) map.get(u.parentId)!.children.push(node)
    else roots.push(node)
  }
  return roots
}

/** Flache Liste mit Tiefe (für Auswahlfelder mit Einrückung). */
export function flattenOrgUnits(units: OrgUnitFlat[]): { id: string; name: string; depth: number }[] {
  const out: { id: string; name: string; depth: number }[] = []
  function walk(parentId: string | null, depth: number) {
    for (const u of units.filter((x) => x.parentId === parentId)) {
      out.push({ id: u.id, name: u.name, depth })
      walk(u.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}
