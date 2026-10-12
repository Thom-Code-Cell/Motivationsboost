import { AsyncLocalStorage } from "node:async_hooks";
import { isLocalMode } from "@/lib/local-mode";

export const localRequest = new AsyncLocalStorage<{ signal: AbortSignal }>();
export function assertLocalRequest(headers: Headers, write = true) {
  if (!isLocalMode()) throw new Error("Lokaler Betrieb ist nicht aktiviert.");
  const host = headers.get("host") || "";
  if (!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host))
    throw new Error("Nur lokaler Zugriff erlaubt.");
  const origin = headers.get("origin");
  if (origin && origin !== `http://${host}`)
    throw new Error("Unerlaubter Ursprung.");
  if (write && (!origin || headers.get("x-local-request") !== "1"))
    throw new Error("Lokale Schreibaktion ohne Ursprungsnachweis.");
  if (headers.get("sec-fetch-site") === "cross-site")
    throw new Error("Fremde Webseite abgewiesen.");
}
