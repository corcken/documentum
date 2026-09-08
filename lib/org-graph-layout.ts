import { type OrgUnitNode } from "@/lib/org-tree"

export interface LayoutNode {
  id: string
  name: string
  abbreviation: string | null
  description?: string | null
  depth: number
  x: number
  y: number
  width: number
  height: number
  hasChildren: boolean
  isExpanded: boolean
  childCount: number
  children: LayoutNode[]
}

export interface GraphEdge {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface GraphLayoutResult {
  nodes: LayoutNode[]
  edges: GraphEdge[]
  totalWidth: number
  totalHeight: number
}

export const GRAPH_BOX_WIDTH = 224
export const GRAPH_LEVEL_GAP = 36
export const GRAPH_SIBLING_GAP = 8
export const GRAPH_PADDING_X = 24
export const GRAPH_PADDING_Y = 24

export function estimateNodeHeight(node: OrgUnitNode): number {
  const hasAbbr = Boolean(node.abbreviation)
  const nameLen = node.name.length
  let lines = 1
  if (nameLen > 52) lines = 3
  else if (nameLen > 24) lines = 2

  const baseTextHeight = lines * 16
  const abbrHeight = hasAbbr ? 16 : 0
  const paddingHeight = 16 + 2 // py-2 (16px) + border (2px)

  return Math.max(48, baseTextHeight + abbrHeight + paddingHeight)
}

function shiftSubtree(node: LayoutNode, shiftY: number) {
  node.y += shiftY
  for (const child of node.children) {
    shiftSubtree(child, shiftY)
  }
}

function layoutSubtree(
  node: OrgUnitNode,
  depth: number,
  startY: number,
  expandedIds: Set<string>
): { layoutNode: LayoutNode; nextY: number } {
  const width = GRAPH_BOX_WIDTH
  const height = estimateNodeHeight(node)
  const x = GRAPH_PADDING_X + depth * (GRAPH_BOX_WIDTH + GRAPH_LEVEL_GAP)
  const isExpanded = expandedIds.has(node.id)
  const hasChildren = node.children.length > 0

  if (!hasChildren || !isExpanded) {
    const layoutNode: LayoutNode = {
      id: node.id,
      name: node.name,
      abbreviation: node.abbreviation,
      description: node.description,
      depth,
      x,
      y: startY,
      width,
      height,
      hasChildren,
      isExpanded,
      childCount: node.children.length,
      children: [],
    }
    return { layoutNode, nextY: startY + height + GRAPH_SIBLING_GAP }
  }

  let childY = startY
  const layoutChildren: LayoutNode[] = []
  for (const child of node.children) {
    const res = layoutSubtree(child, depth + 1, childY, expandedIds)
    layoutChildren.push(res.layoutNode)
    childY = res.nextY
  }

  const firstChild = layoutChildren[0]
  const lastChild = layoutChildren[layoutChildren.length - 1]
  const firstChildMid = firstChild.y + firstChild.height / 2
  const lastChildMid = lastChild.y + lastChild.height / 2
  const childrenCenterY = (firstChildMid + lastChildMid) / 2

  let parentY = Math.round(childrenCenterY - height / 2)

  if (parentY < startY) {
    const shift = startY - parentY
    for (const ch of layoutChildren) {
      shiftSubtree(ch, shift)
    }
    childY += shift
    parentY = startY
  }

  const totalBottom = Math.max(parentY + height + GRAPH_SIBLING_GAP, childY)

  const layoutNode: LayoutNode = {
    id: node.id,
    name: node.name,
    abbreviation: node.abbreviation,
    description: node.description,
    depth,
    x,
    y: parentY,
    width,
    height,
    hasChildren,
    isExpanded,
    childCount: node.children.length,
    children: layoutChildren,
  }

  return { layoutNode, nextY: totalBottom }
}

function collectNodesAndEdges(roots: LayoutNode[]): GraphLayoutResult {
  const nodes: LayoutNode[] = []
  const edges: GraphEdge[] = []

  function walk(node: LayoutNode) {
    nodes.push(node)
    for (const child of node.children) {
      edges.push({
        id: `${node.id}->${child.id}`,
        x1: node.x + node.width,
        y1: Math.round(node.y + node.height / 2),
        x2: child.x,
        y2: Math.round(child.y + child.height / 2),
      })
      walk(child)
    }
  }

  for (const r of roots) {
    walk(r)
  }

  let maxX = 0
  let maxY = 0
  for (const n of nodes) {
    if (n.x + n.width > maxX) maxX = n.x + n.width
    if (n.y + n.height > maxY) maxY = n.y + n.height
  }

  return {
    nodes,
    edges,
    totalWidth: maxX + GRAPH_PADDING_X,
    totalHeight: maxY + GRAPH_PADDING_Y,
  }
}

/**
 * Berechnet das kompakte Left-to-Right-Layout für das Organigramm.
 * Post-Order: Kinder werden vertikal gestapelt, Eltern werden vertikal zentriert.
 */
export function computeGraphLayout(tree: OrgUnitNode[], expandedIds: Set<string>): GraphLayoutResult {
  let currentY = GRAPH_PADDING_Y
  const rootLayoutNodes: LayoutNode[] = []
  for (const root of tree) {
    const res = layoutSubtree(root, 0, currentY, expandedIds)
    rootLayoutNodes.push(res.layoutNode)
    currentY = res.nextY
  }
  return collectNodesAndEdges(rootLayoutNodes)
}
