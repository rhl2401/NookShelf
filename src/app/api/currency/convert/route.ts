import { auth } from "@/auth";
import { convertAmount } from "@/lib/currency";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const amount = Number(searchParams.get("amount"));
  const from = searchParams.get("from")?.toUpperCase();
  const to = searchParams.get("to")?.toUpperCase();

  if (!Number.isFinite(amount) || !from || !to) {
    return Response.json(
      { error: "Query params required: amount (number), from (currency), to (currency)" },
      { status: 400 },
    );
  }

  const converted = await convertAmount(amount, from, to);
  if (converted === null) {
    return Response.json({ error: "Exchange rate unavailable" }, { status: 502 });
  }

  return Response.json({ amount, from, to, convertedAmount: converted });
}
