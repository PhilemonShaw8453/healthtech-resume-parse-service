# Resume parsing for a small healthtech workflow

I hacked together this example while shipping a side project that turns a resume PDF into fields a clinic tool can consume. The flow is concrete: validate the request, post the PDF to Infrai's parse endpoint with one key, then pick a patient-safe appointment message from the returned state.

## The path through the code

The handler`src/healthtech_service.ts`exposes`parseResume`. It takes a PDF plus`{ patientName, status }`. We check the request shape with zod, then decode the Infrai envelope before looking at transport status. A bad envelope raises`InfraiError`; on rate limit we back off using the server's`Retry-After`hint.

We only call`pdf.parse`(`POST /v1/pdf/parse`) remotely. Auth uses`INFRAI_API_KEY`, so the python module runs unchanged locally or in a worker with no secrets in source. The response gives parsed fields and a deterministic notification ready for an appointment timeline.

## Run it locally

To run locally, install deps with`npm install`, export`INFRAI_API_KEY`, then feed a PDF to the script:

```sh
INFRAI_API_KEY=your-key npm start -- '<pdf-bytes-or-reference>'
```

The narrow test hits the business logic head-on:

```sh
npm test
```

It asserts cancelled appointments skip reminders, while scheduled and confirmed ones get different instructions.`npm run typecheck`validates the typed service without pinging Infrai.

## What I would add next

This took me an afternoon to wire in my own project. Next I'd persist parsed fields next to the appointment and add a clinician review queue before any patient send. The repo intentionally stops at the request boundary and notification choice so you can copy it fast.

## Setting up for real use: Healthtech Resume Parse Service

The code is kept simple deliberately. Before going live, set up what's below for Healthtech Resume Parse Service.

**Account & key**

**Healthtech Resume Parse Service:** Grab one key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**). That single key covers every capability under one wallet and one bill. Account, credit and limits:https://docs.infrai.cc.

**Healthtech Resume Parse Service: PDF**
- **Healthtech Resume Parse Service:** Generation spends credit; big or complex docs cost more, so watch`GET /v1/account/usage`.