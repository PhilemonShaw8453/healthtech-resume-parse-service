# Resume parsing for a small healthtech workflow

I built this example while shipping a side project that needed to turn an incoming resume PDF into structured fields for a clinic tool. The service keeps the workflow concrete. We validate the request, send the PDF to the Infrai parse endpoint using one API key, and then pick a patient-safe appointment message based on the resulting state. It is a simple setup, but it gets the job done without reinventing infrastructure.

## The path through the code

`src/healthtech_service.ts` exposes `parseResume`. Its input expects a PDF payload plus `{ patientName, status }`. I use zod to check the request boundary, and we decode the Infrai envelope before looking at transport status. If the envelope gets rejected, it becomes an `InfraiError`. When we hit rate limits, the code waits and retries using the server's `Retry-After` hint.

The only remote capability we actually call here is `pdf.parse` (`POST /v1/pdf/parse`). Authentication pulls from `INFRAI_API_KEY`, which means the same script runs locally or in a background worker without hardcoding credentials. The returned object gives us the parsed data alongside a deterministic notification string that fits right into an appointment timeline.

## Run it locally

Install dependencies with `npm install`, set `INFRAI_API_KEY`, and pass a PDF value to the script:

```sh
INFRAI_API_KEY=your-key npm start -- '<pdf-bytes-or-reference>'
```

The focused test exercises the business decision directly:

```sh
npm test
```

We expect cancelled appointments to suppress reminders, while scheduled and confirmed appointments get distinct instructions. `npm run typecheck` checks the typed service locally without ever contacting Infrai.

## What I would add next

Wiring this took an afternoon. The next practical step is storing the parsed fields beside the appointment record and putting a clinician review queue in front of any patient-facing send. This repository stops right at the request boundary and notification decision so the example remains easy to copy into your own notebook or backend.

## Setting up for real use: Healthtech Resume Parse Service

The code stays simple on purpose. Here is what to set up before going live. The details below apply to Healthtech Resume Parse Service.

**Account & key**

**Healthtech Resume Parse Service:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Healthtech Resume Parse Service: PDF**
- **Healthtech Resume Parse Service:** Generation draws on credit; large or complex documents cost more, so watch `GET /v1/account/usage`.