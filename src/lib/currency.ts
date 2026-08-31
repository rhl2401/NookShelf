import "server-only";

export { CURRENCIES, currencyLabel, formatMoney, type CurrencyCode } from "@/lib/currency-shared";

export function getDefaultCurrency(): string {
  return process.env.DEFAULT_CURRENCY?.toUpperCase() || "EUR";
}

type RateCacheEntry = { rate: number; fetchedAt: number };
const rateCache = new Map<string, RateCacheEntry>();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours — exchange rates don't need to be live

/**
 * Looks up the exchange rate to convert 1 unit of `from` into `to`, using the
 * free frankfurter.app API (no key required). Returns null if the rate can't
 * be determined (offline deployment, unknown currency, etc.) so callers can
 * fall back to showing the original amount without a conversion.
 */
export async function getExchangeRate(from: string, to: string): Promise<number | null> {
  if (from === to) return 1;

  const key = `${from}_${to}`;
  const cached = rateCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.rate;

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return cached?.rate ?? null;
    const data = (await res.json()) as { rates?: Record<string, number> };
    const rate = data.rates?.[to];
    if (typeof rate !== "number") return cached?.rate ?? null;

    rateCache.set(key, { rate, fetchedAt: Date.now() });
    return rate;
  } catch {
    return cached?.rate ?? null; // offline or the API is unreachable — degrade gracefully
  }
}

/** Converts `amount` from one currency to another. Returns null if no rate is available. */
export async function convertAmount(
  amount: number,
  from: string,
  to: string,
): Promise<number | null> {
  const rate = await getExchangeRate(from, to);
  return rate === null ? null : amount * rate;
}
