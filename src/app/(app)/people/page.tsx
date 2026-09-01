import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreatePersonDialog } from "@/components/people/create-person-dialog";
import { EditRolesDialog } from "@/components/people/edit-roles-dialog";
import { MergePeopleDialog } from "@/components/people/merge-people-dialog";
import { ToggleActiveButton } from "@/components/people/toggle-active-button";

export default async function PeoplePage() {
  const session = await auth();
  if (!session?.user.permissions.includes("user:manage")) redirect("/dashboard");

  const [people, roles] = await Promise.all([
    prisma.person.findMany({
      where: { status: { not: "MERGED" } },
      include: { roles: { include: { role: true } }, user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  const mergeOptions = people.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    hasLogin: Boolean(p.userId),
  }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">People</h1>
          <p className="text-sm text-muted-foreground">
            Everyone who can be assigned assets or hold a login — whether they&apos;ve signed in
            yet or not.
          </p>
        </div>
        <div className="flex gap-2">
          <MergePeopleDialog people={mergeOptions} />
          <CreatePersonDialog />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {people.map((person) => {
          const active = person.user ? person.user.active : person.status === "ACTIVE";
          const initials = person.name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
          return (
            <Card key={person.id}>
              <CardContent className="flex items-center gap-4">
                <Avatar size="lg">
                  <AvatarImage
                    src={
                      person.avatarPath
                        ? `/api/avatars/${person.id}`
                        : (person.user?.image ?? undefined)
                    }
                    alt={person.name}
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-1 items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{person.name}</p>
                      {person.userId ? (
                        <Badge variant="secondary">Has login</Badge>
                      ) : (
                        <Badge variant="outline">No login yet</Badge>
                      )}
                      {!active && <Badge variant="destructive">Inactive</Badge>}
                    </div>
                    {person.email && (
                      <p className="text-sm text-muted-foreground">{person.email}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {person.roles.map((r) => (
                        <Badge key={r.roleId} variant="outline">
                          {r.role.name}
                        </Badge>
                      ))}
                      {person.roles.length === 0 && (
                        <span className="text-xs text-muted-foreground">No roles</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <EditRolesDialog
                      personId={person.id}
                      personName={person.name}
                      allRoles={roles}
                      currentRoleIds={person.roles.map((r) => r.roleId)}
                    />
                    <ToggleActiveButton personId={person.id} active={active} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
