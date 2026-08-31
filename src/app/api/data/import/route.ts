import { auth } from "@/auth";
import { importBundle } from "@/lib/actions/data-import";
import { jsonToBundle } from "@/lib/data-io/json-format";
import { csvZipToBundle } from "@/lib/data-io/csv-format";
import { xlsxToBundle } from "@/lib/data-io/xlsx-format";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user.permissions.includes("settings:manage")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const format = String(formData.get("format") || "");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }

  try {
    const bundle = await (async () => {
      switch (format) {
        case "json":
          return jsonToBundle(await file.text());
        case "csv":
          return csvZipToBundle(Buffer.from(await file.arrayBuffer()));
        case "xlsx":
          return xlsxToBundle(Buffer.from(await file.arrayBuffer()));
        default:
          throw new Error("Unknown format. Use json, csv, or xlsx.");
      }
    })();

    const summary = await importBundle(bundle);
    return Response.json({ summary });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Import failed." },
      { status: 400 },
    );
  }
}
