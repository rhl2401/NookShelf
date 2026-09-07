"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { CustomFieldsForm } from "@/components/assets/custom-fields-form";
import type { AssetFieldDef, AssetFieldType } from "@/lib/asset-fields";

function defaultLockedValue(type: AssetFieldType): AssetFieldDef["lockedValue"] {
  switch (type) {
    case "BOOLEAN":
      return false;
    case "NUMBER":
      return 0;
    case "MULTISELECT":
      return [];
    case "UNIT_NUMBER":
      return { value: 0, unit: "" };
    default:
      return "";
  }
}

const FIELD_TYPES: AssetFieldType[] = [
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "DATE",
  "SELECT",
  "MULTISELECT",
  "UNIT_NUMBER",
];

function slugify(label: string) {
  return label
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "f_$1");
}

export function FieldSchemaEditor({
  value,
  onChange,
}: {
  value: AssetFieldDef[];
  onChange: (next: AssetFieldDef[]) => void;
}) {
  function update(index: number, patch: Partial<AssetFieldDef>) {
    const next = value.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function addField() {
    onChange([...value, { key: "", label: "", type: "TEXT" }]);
  }

  function removeField(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {value.map((field, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-start gap-2">
            <div className="grid flex-1 grid-cols-2 gap-2">
              <Input
                placeholder="Label (e.g. Connector A)"
                value={field.label}
                onChange={(e) => {
                  const label = e.target.value;
                  const autoKey = field.key === "" || field.key === slugify(field.label);
                  update(index, { label, key: autoKey ? slugify(label) : field.key });
                }}
              />
              <Input
                placeholder="key_name"
                className="font-mono text-xs"
                value={field.key}
                onChange={(e) => update(index, { key: e.target.value })}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeField(index)}>
              <Trash2 className="size-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={field.type}
              onValueChange={(v) => update(index, { type: (v as AssetFieldType) ?? "TEXT" })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {field.lockedValue === undefined && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(field.required)}
                  onCheckedChange={(checked) => update(index, { required: Boolean(checked) })}
                />
                Required
              </label>
            )}

            {(field.type === "SELECT" || field.type === "MULTISELECT") && (
              <OptionsInput
                key={field.key || index}
                options={field.options ?? []}
                onChange={(options) => update(index, { options })}
              />
            )}

            {field.type === "UNIT_NUMBER" && (
              <Input
                placeholder="Unit (e.g. m, V, Gbps)"
                className="w-40"
                value={field.unit ?? ""}
                onChange={(e) => update(index, { unit: e.target.value })}
              />
            )}

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={field.lockedValue !== undefined}
                onCheckedChange={(checked) =>
                  update(index, {
                    lockedValue: checked ? defaultLockedValue(field.type) : undefined,
                    required: checked ? undefined : field.required,
                  })
                }
              />
              Fixed value
            </label>
          </div>

          {field.lockedValue !== undefined && (
            <div className="rounded-lg border border-dashed p-2">
              <CustomFieldsForm
                schema={[{ ...field, lockedValue: undefined, required: false }]}
                values={{ [field.key]: field.lockedValue }}
                onChange={(next) =>
                  update(index, {
                    lockedValue: next[field.key] as AssetFieldDef["lockedValue"],
                  })
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Every asset of this type gets this value automatically — it won&apos;t be shown as
                a field to fill in when creating one.
              </p>
            </div>
          )}
        </div>
      ))}

      <Button variant="outline" onClick={addField} className="self-start">
        <Plus /> Add field
      </Button>
    </div>
  );
}

// Kept as raw draft text, separate from the parsed `options` array — deriving
// the input's value from the array meant a trailing comma or space (about to
// start a new option) was immediately stripped by the split/trim/filter
// round-trip, so those keys visually appeared to do nothing.
function OptionsInput({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  const [text, setText] = useState(options.join(", "));

  return (
    <Input
      placeholder="Options, comma separated"
      className="min-w-56 flex-1"
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        onChange(
          next
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }}
    />
  );
}
