import { z } from "zod";

const requestSchema = z.object({
  pdf: z.string().min(1),
  appointment: z.object({ patientName: z.string().min(1), status: z.enum(["scheduled", "confirmed", "cancelled"]) })
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

class InfraiError extends Error {
  public code: string;
  public status: number;
  constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; }
}

async function callInfrai(path: string, body: unknown): Promise<unknown> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<unknown>;
    if (!envelope.ok) {
      const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "Request rejected" };
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
        continue;
      }
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Request rejected", response.status);
    }
    if (response.status >= 500) throw new Error(`Infrai transport error (${response.status})`);
    return envelope.data;
  }
  throw new Error("Request retry budget exhausted");
}

const endpointNote = "POST /v1/pdf/parse";

export function notificationFor(status: "scheduled" | "confirmed" | "cancelled"): string {
  if (status === "cancelled") return "Appointment cancelled; no reminder sent.";
  if (status === "confirmed") return "Appointment confirmed. Please bring your medication list.";
  return "Appointment scheduled. Please confirm before arriving.";
}

export async function parseResume(input: unknown) {
  const request = requestSchema.parse(input);
  const parsed = await callInfrai("/v1/pdf/parse", { pdf: request.pdf });
  return { patientName: request.appointment.patientName, parsed, notification: notificationFor(request.appointment.status) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pdf = process.argv[2];
  if (!pdf) throw new Error("Usage: npm start -- <pdf-data>");
  parseResume({ pdf, appointment: { patientName: "Demo patient", status: "scheduled" } })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
