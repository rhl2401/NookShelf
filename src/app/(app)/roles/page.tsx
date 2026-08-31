import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RoleFormDialog } from "@/components/roles/role-form-dialog";
import { DeleteRoleButton } from "@/components/roles/delete-role-button";
import { Plus } from "lucide-react";

export default async function RolesPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("role:manage")) redirect("/dashboard");

  const roles = await prisma.role.findMany({
    include: { _count: { select: { assignments: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Roles are named sets of permissions you can assign to people.
          </p>
        </div>
        <RoleFormDialog
          trigger={
            <Button>
              <Plus /> New role
            </Button>
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{role.name}</p>
                  {role.isSystem && <Badge variant="outline">Built-in</Badge>}
                  <Badge variant="secondary">{role._count.assignments} people</Badge>
                </div>
                {role.description && (
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {role.permissions.map((p) => (
                    <Badge key={p} variant="outline" className="font-mono text-[10px]">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <RoleFormDialog
                  role={role}
                  trigger={<Button variant="outline">Edit</Button>}
                />
                {!role.isSystem && <DeleteRoleButton roleId={role.id} />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
