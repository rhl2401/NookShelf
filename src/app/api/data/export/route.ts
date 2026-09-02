import { auth } from "@/auth";
import { buildExportBundle } from "@/lib/data-io/build-bundle";
import { bundleToJson } from "@/lib/data-io/json-format";
import { bundleToCsvZip } from "@/lib/data-io/csv-format";
import { bundleToXlsx } from "@/lib/data-io/xlsx-format";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user.permissions.includes("settings:manage")) {
    return new Response("Forbidden", { status: 403 });
  }

  const format = new URL(req.url).searchParams.get("format") || "json";
  const bundle = await buildExportBundle();
  const stamp = new Date().toISOString().slice(0, 10);

  switch (format) {
    case "json":
      return new Response(bundleToJson(bundle), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="nookshelf-export-${stamp}.json"`,
        },
      });
    case "csv": {
      const zip = await bundleToCsvZip(bundle);
      return new Response(new Uint8Array(zip), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="nookshelf-export-${stamp}-csv.zip"`,
        },
      });
    }
    case "xlsx": {
      const xlsx = await bundleToXlsx(bundle);
      return new Response(new Uint8Array(xlsx), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="nookshelf-export-${stamp}.xlsx"`,
        },
      });
    }
    default:
      return new Response("Unknown format. Use json, csv, or xlsx.", { status: 400 });
  }
}
