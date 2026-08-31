"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssetFieldDef } from "@/lib/asset-fields";

export type CustomFieldValues = Record<string, unknown>;

export function CustomFieldsForm({
  schema,
  values,
  onChange,
}: {
  schema: AssetFieldDef[];
  values: CustomFieldValues;
  onChange: (next: CustomFieldValues) => void;
}) {
  if (schema.length === 0) return null;

  function set(key: string, value: unknown) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {schema.map((field) => (
        <div key={field.key} className="grid gap-1.5">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>

          {field.type === "TEXT" && (
            <Input
              value={(values[field.key] as string) ?? ""}
              onChange={(e) => set(field.key, e.target.value)}
            />
          )}

          {field.type === "NUMBER" && (
            <Input
              type="number"
              value={(values[field.key] as number) ?? ""}
              onChange={(e) => set(field.key, e.target.value ? Number(e.target.value) : "")}
            />
          )}

          {field.type === "DATE" && (
            <Input
              type="date"
              value={(values[field.key] as string) ?? ""}
              onChange={(e) => set(field.key, e.target.value)}
            />
          )}

          {field.type === "BOOLEAN" && (
            <div className="flex h-8 items-center">
              <Checkbox
                checked={Boolean(values[field.key])}
                onCheckedChange={(checked) => set(field.key, Boolean(checked))}
              />
            </div>
          )}

          {field.type === "SELECT" && (
            <Select
              value={(values[field.key] as string) ?? null}
              onValueChange={(v) => set(field.key, v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {(field.options ?? []).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {field.type === "MULTISELECT" && (
            <div className="flex flex-wrap gap-2 rounded-lg border p-2">
              {(field.options ?? []).map((opt) => {
                const selected = ((values[field.key] as string[]) ?? []).includes(opt);
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => {
                      const current = (values[field.key] as string[]) ?? [];
                      set(
                        field.key,
                        selected ? current.filter((v) => v !== opt) : [...current, opt],
                      );
                    }}
                    className={
                      "rounded-full border px-2.5 py-1 text-xs transition-colors " +
                      (selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-input hover:bg-muted")
                    }
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {field.type === "UNIT_NUMBER" && (
            <div className="flex gap-2">
              <Input
                type="number"
                className="flex-1"
                value={(values[field.key] as { value?: number })?.value ?? ""}
                onChange={(e) =>
                  set(field.key, {
                    value: e.target.value ? Number(e.target.value) : undefined,
                    unit:
                      (values[field.key] as { unit?: string })?.unit ?? field.unit ?? "",
                  })
                }
              />
              {field.unitOptions ? (
                <Select
                  value={(values[field.key] as { unit?: string })?.unit ?? field.unit ?? null}
                  onValueChange={(unit) =>
                    set(field.key, {
                      value: (values[field.key] as { value?: number })?.value,
                      unit,
                    })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.unitOptions.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="flex w-16 items-center text-sm text-muted-foreground">
                  {field.unit}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
