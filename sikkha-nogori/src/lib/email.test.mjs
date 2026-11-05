import assert from "node:assert/strict";
import test from "node:test";
import { isValidEmail } from "./email.mjs";

test("accepts ordinary email addresses, including addresses containing s", () => {
  for (const email of ["kz5247622@gmail.com", "sikkha@example.com", "user@mail.com", "a.b@test.org", "someone+tag@domain.co"]) {
    assert.equal(isValidEmail(email), true, email);
  }
});

test("rejects malformed email addresses", () => {
  for (const email of ["", "plain", "no-at.example.com", "a@b", "a b@c.com", "a@@b.com", "@b.com", "a@b."]) {
    assert.equal(isValidEmail(email), false, email);
  }
});

test("rejects non-strings and addresses longer than 254 characters", () => {
  assert.equal(isValidEmail(undefined), false);
  assert.equal(isValidEmail(null), false);
  assert.equal(isValidEmail(`${"a".repeat(250)}@b.co`), false);
});
