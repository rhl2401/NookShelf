import "server-only";
import { prisma } from "@/lib/prisma";

export type LocationTreeNode = {
  id: string;
  name: string;
  parentId: string | null;
  code: string | null;
  icon: string | null;
  iconColor: string | null;
  primaryPictureId: string | null;
  notes: string | null;
  directAssetCount: number;
  totalAssetCount: number;
  children: LocationTreeNode[];
};

/** Builds the full location tree with rolled-up (recursive) asset counts. */
export async function buildLocationTree(): Promise<LocationTreeNode[]> {
  const locations = await prisma.location.findMany({
    include: { _count: { select: { assets: true } } },
    orderBy: { name: "asc" },
  });

  const nodes = new Map<string, LocationTreeNode>();
  for (const loc of locations) {
    nodes.set(loc.id, {
      id: loc.id,
      name: loc.name,
      parentId: loc.parentId,
      code: loc.code,
      icon: loc.icon,
      iconColor: loc.iconColor,
      primaryPictureId: loc.primaryPictureId,
      notes: loc.notes,
      directAssetCount: loc._count.assets,
      totalAssetCount: loc._count.assets,
      children: [],
    });
  }

  const roots: LocationTreeNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function rollUp(node: LocationTreeNode): number {
    let total = node.directAssetCount;
    for (const child of node.children) total += rollUp(child);
    node.totalAssetCount = total;
    return total;
  }
  for (const root of roots) rollUp(root);

  return roots;
}

/** Flattens the tree into `{ id, label }` options with indentation for <select>-style pickers. */
export function flattenLocationTree(
  nodes: LocationTreeNode[],
  depth = 0,
): Array<{ id: string; label: string }> {
  const result: Array<{ id: string; label: string }> = [];
  for (const node of nodes) {
    result.push({ id: node.id, label: `${"— ".repeat(depth)}${node.name}` });
    result.push(...flattenLocationTree(node.children, depth + 1));
  }
  return result;
}

/** Returns [root, ..., self] for breadcrumbs. */
export async function getLocationPath(locationId: string) {
  const path: { id: string; name: string }[] = [];
  let currentId: string | null = locationId;
  while (currentId) {
    const loc: { id: string; name: string; parentId: string | null } | null =
      await prisma.location.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true },
      });
    if (!loc) break;
    path.unshift({ id: loc.id, name: loc.name });
    currentId = loc.parentId;
  }
  return path;
}

/** Returns this location's id plus every descendant's id (for "at or under" filtering). */
export async function getDescendantLocationIds(rootId: string): Promise<string[]> {
  const all = await prisma.location.findMany({ select: { id: true, parentId: true } });
  const childrenOf = new Map<string, string[]>();
  for (const loc of all) {
    if (!loc.parentId) continue;
    const list = childrenOf.get(loc.parentId) ?? [];
    list.push(loc.id);
    childrenOf.set(loc.parentId, list);
  }

  const result: string[] = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    for (const childId of childrenOf.get(id) ?? []) {
      result.push(childId);
      queue.push(childId);
    }
  }
  return result;
}

/** True if `candidateAncestorId` is `locationId` itself or one of its ancestors. */
export async function isAncestorOrSelf(candidateAncestorId: string, locationId: string) {
  let currentId: string | null = locationId;
  while (currentId) {
    if (currentId === candidateAncestorId) return true;
    const loc: { parentId: string | null } | null = await prisma.location.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = loc?.parentId ?? null;
  }
  return false;
}
