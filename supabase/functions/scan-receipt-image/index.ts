import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type ScanReceiptPayload = {
  userId?: string;
  base64Image?: string;
  fileName?: string;
  mimeType?: string;
};

type ParsedReceipt = {
  merchant: string;
  totalCents: number;
  currency: string;
  purchaseDate: string;
  status: "processed";
  source: "manual";
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

function isLikelyBase64(value: string): boolean {
  return /^[A-Za-z0-9+/=]+$/.test(value) && value.length > 120;
}

function toTitleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function inferMerchant(fileName?: string): string {
  if (!fileName) return "Receipt upload";
  const stem = fileName.replace(/\.[a-z0-9]+$/i, "");
  const normalized = stem
    .replace(/[-_]+/g, " ")
    .replace(/\b(receipt|invoice|bill|screenshot|scan|img|photo)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length < 3) {
    return "Receipt upload";
  }
  return toTitleCase(normalized);
}

function inferAmountCents(fileName?: string): number {
  if (!fileName) return 4999;
  const normalized = fileName.replace(/[_-]/g, ".");
  const match = normalized.match(/(\d{1,4}(?:\.\d{2})?)/);
  if (!match) return 4999;
  const parsed = Number.parseFloat(match[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) return 4999;
  return Math.round(parsed * 100);
}

function parseReceipt(payload: ScanReceiptPayload): ParsedReceipt {
  return {
    merchant: inferMerchant(payload.fileName),
    totalCents: inferAmountCents(payload.fileName),
    currency: "GBP",
    purchaseDate: new Date().toISOString(),
    status: "processed",
    source: "manual",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return json({ ok: true });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  try {
    const payload = (await req.json()) as ScanReceiptPayload;
    if (!payload.userId || !payload.base64Image) {
      return json({ error: "Missing required fields: userId, base64Image" }, 400);
    }
    if (!isLikelyBase64(payload.base64Image)) {
      return json({ error: "base64Image does not look valid" }, 400);
    }

    const receipt = parseReceipt(payload);
    const warnings = [
      "OCR parser is currently using filename heuristics. Connect your OCR provider for full text extraction.",
    ];

    return json({
      receipt,
      extractedText: "",
      warnings,
      mode: "live",
      parser: "heuristic-fallback",
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 502);
  }
});
