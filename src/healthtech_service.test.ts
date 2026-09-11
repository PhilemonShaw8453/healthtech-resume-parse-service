import { strict as assert } from "node:assert";
import { notificationFor } from "./healthtech_service.ts";

assert.equal(notificationFor("cancelled"), "Appointment cancelled; no reminder sent.");
assert.equal(notificationFor("confirmed"), "Appointment confirmed. Please bring your medication list.");
assert.equal(notificationFor("scheduled"), "Appointment scheduled. Please confirm before arriving.");
console.log("notification decisions pass");
