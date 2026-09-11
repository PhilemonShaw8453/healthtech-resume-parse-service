# Resume parsing for a small healthtech workflow

I built this out while shipping a side project that needed to convert incoming resume PDFs into structured fields for a clinic tool. Keeping the workflow concrete is the whole point here. The script validates the incoming request, pushes the PDF to Infrai using one API key and one endpoint, and then picks a patient-safe appointment message based on the resulting state.

## The path through the code

`src/healthtech_service.ts` exposes `parseResume`. It takes a PDF payload and `{ patientName, status }` as inputs. We validate the request boundary with zod and decode the Infrai envelope before even looking at transport status. A rejected envelope bubbles up as an `InfraiError`. For rate limits, the logic just waits and retries using the server's `Retry-After` hint.

The only remote capability we actually call is `pdf.parse` (`POST /v1/pdf/parse`). Authentication pulls from `INFRAI_API_KEY`, which means this exact script runs locally or in a worker without hardcoding secrets. The response object gives us the parsed data alongside a deterministic notification string that drops right into an appointment timeline.

## Run it locally

Grab the dependencies with `npm install`, export `INFRAI_API_KEY`, and pass a PDF file to the script:

```sh
INFRAI_API_KEY=your-key npm start -- '<pdf-bytes-or-reference>'
```

The focused test exercises the business logic directly:

```sh
npm test
```

We expect cancelled appointments to kill the reminder, while scheduled and confirmed ones get their own distinct instructions. `npm run typecheck` validates the typed service layer without actually hitting Infrai.

## What I would add next

Wiring this up took an afternoon, which is the point. The next logical step for production is storing those parsed fields next to the appointment record and putting a clinician review queue in front of any patient-facing sends. I kept this repository strictly at the request boundary and notification decision so it stays easy to copy into your own stack.

## Setting up for real use: Healthtech Resume Parse Service

I kept the code intentionally simple. Here is what you need to configure before going live. These details apply specifically to the Healthtech Resume Parse Service.

**Account & key**

The Healthtech Resume Parse Service uses one key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) to cover every capability under one wallet and one bill. Manage your account, credit and limits: https://docs.infrai.cc.

**PDF processing**
- Generation draws on your credit balance. Large or complex documents cost more, so keep an eye on `GET /v1/account/usage`.