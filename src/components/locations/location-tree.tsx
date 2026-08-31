import Link from "next/link";
import { ChevronRight, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocationFormDialog, type FlatLocationOption } from "@/components/locations/location-form-dialog";
import { DeleteLocationDialog } from "@/components/locations/delete-location-dialog";
import { LocationRowActions } from "@/components/locations/location-row-actions";
import type { LocationTreeNode } from "@/lib/locations";

export function LocationTree({
  nodes,
  flatLocations,
  canManage,
}: {
  nodes: LocationTreeNode[];
  flatLocations: FlatLocationOption[];
  canManage: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      {nodes.map((node) => (
        <LocationNode
          key={node.id}
          node={node}
          flatLocations={flatLocations}
          canManage={canManage}
        />
      ))}
      {nodes.length === 0 && (
        <p className="text-sm text-muted-foreground">No locations yet.</p>
      )}
    </div>
  );
}

function LocationNode({
  node,
  flatLocations,
  canManage,
}: {
  node: LocationTreeNode;
  flatLocations: FlatLocationOption[];
  canManage: boolean;
}) {
  const hasChildren = node.children.length > 0;

  const row = (
    <div className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
      <Link href={`/locations/${node.id}`} className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate font-medium">{node.name}</span>
        <Badge variant="outline" className="shrink-0">
          {node.totalAssetCount}
        </Badge>
      </Link>
      {canManage && (
        <LocationRowActions>
          <LocationFormDialog
            trigger={
              <Button variant="ghost" size="icon-sm">
                <Plus className="size-3.5" />
              </Button>
            }
            flatLocations={flatLocations}
            defaultParentId={node.id}
          />
          <LocationFormDialog
            trigger={
              <Button variant="ghost" size="icon-sm">
                <Pencil className="size-3.5" />
              </Button>
            }
            flatLocations={flatLocations}
            location={{ id: node.id, name: node.name, parentId: node.parentId, notes: null }}
          />
          <DeleteLocationDialog
            locationId={node.id}
            hasChildren={hasChildren}
            assetCount={node.directAssetCount}
            flatLocations={flatLocations}
          />
        </LocationRowActions>
      )}
    </div>
  );

  if (!hasChildren) {
    return <div className="pl-1">{row}</div>;
  }

  return (
    <details className="group/details pl-1" open>
      <summary className="flex cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open/details:rotate-90" />
        <div className="flex-1">{row}</div>
      </summary>
      <div className="ml-4 flex flex-col gap-1 border-l pl-3">
        {node.children.map((child) => (
          <LocationNode
            key={child.id}
            node={child}
            flatLocations={flatLocations}
            canManage={canManage}
          />
        ))}
      </div>
    </details>
  );
}
