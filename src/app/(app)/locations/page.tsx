import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LocationTree } from "@/components/locations/location-tree";
import { LocationFormDialog } from "@/components/locations/location-form-dialog";
import { buildLocationTree, flattenLocationTree } from "@/lib/locations";
import { Plus } from "lucide-react";

export default async function LocationsPage() {
  const session = await auth();
  const canManage = Boolean(session?.user.permissions.includes("location:manage"));

  const tree = await buildLocationTree();
  const flatLocations = flattenLocationTree(tree);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
          <p className="text-sm text-muted-foreground">
            Where your assets live — nest as deep as you need.
          </p>
        </div>
        {canManage && (
          <LocationFormDialog
            trigger={
              <Button>
                <Plus /> New location
              </Button>
            }
            flatLocations={flatLocations}
          />
        )}
      </div>

      <Card>
        <CardContent>
          <LocationTree nodes={tree} flatLocations={flatLocations} canManage={canManage} />
        </CardContent>
      </Card>
    </div>
  );
}
