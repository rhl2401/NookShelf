import Papa from "papaparse";
import { ASSET_CSV_COLUMNS } from "@/lib/csv-columns";

export async function GET() {
  const csv = Papa.unparse({ fields: [...ASSET_CSV_COLUMNS], data: [] });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="assets-import-template.csv"`,
    },
  });
}
