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
  description?: string | null
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

/** Zählt alle Nachfahren eines Knotens rekursiv. */
export function countAllDescendants(node: OrgUnitNode): number {
  let count = node.children.length
  for (const child of node.children) {
    count += countAllDescendants(child)
  }
  return count
}

/** Ermittelt alle IDs von Knoten, die mindestens ein Kind haben. */
export function getAllNodeIdsWithChildren(tree: OrgUnitNode[]): string[] {
  const ids: string[] = []
  function walk(nodes: OrgUnitNode[]) {
    for (const n of nodes) {
      if (n.children.length > 0) {
        ids.push(n.id)
        walk(n.children)
      }
    }
  }
  walk(tree)
  return ids
}

/** Ermittelt alle IDs im gesamten Baum. */
export function getAllNodeIds(tree: OrgUnitNode[]): string[] {
  const ids: string[] = []
  function walk(nodes: OrgUnitNode[]) {
    for (const n of nodes) {
      ids.push(n.id)
      if (n.children.length > 0) {
        walk(n.children)
      }
    }
  }
  walk(tree)
  return ids
}

/** Zählt alle Knoten im gesamten Baum. */
export function countTotalNodes(tree: OrgUnitNode[]): number {
  let count = 0
  function walk(nodes: OrgUnitNode[]) {
    count += nodes.length
    for (const n of nodes) {
      if (n.children.length > 0) {
        walk(n.children)
      }
    }
  }
  walk(tree)
  return count
}

