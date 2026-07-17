import assert from "node:assert/strict";
import test from "node:test";
import { buildInvitationEmail, buildLoginEmail, buildPasswordResetEmail, buildRegistrationEmail } from "./mail.js";

test("registration email contains the account recipient and sign-in link", () => {
  const message = buildRegistrationEmail({ name: "Ada Lovelace", email: "ada@example.com" });

  assert.equal(message.subject, "Welcome to I-TRACK");
  assert.match(message.html, /ada@example\.com/);
  assert.match(message.html, /Sign in to I-TRACK/);
  assert.match(message.html, /\/login/);
});

test("login email escapes user-controlled device details", () => {
  const message = buildLoginEmail(
    { name: "Ada Lovelace", email: "ada@example.com" },
    { ipAddress: "127.0.0.1", userAgent: "<script>alert(1)</script>", loggedInAt: new Date("2026-07-17T10:00:00.000Z") },
  );

  assert.match(message.text, /127\.0\.0\.1/);
  assert.match(message.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(message.html, /<script>/);
});

test("invitation email includes the workspace role and invite URL", () => {
  const message = buildInvitationEmail({
    recipient: { name: "Grace Hopper", email: "grace@example.com" },
    organizationName: "Apollo Team",
    invitedBy: "Ada Lovelace",
    role: "engineer",
    inviteUrl: "http://localhost:5173/accept-invite?token=test-token",
    expiresAt: new Date("2026-07-24T10:00:00.000Z"),
  });

  assert.match(message.subject, /Apollo Team/);
  assert.match(message.text, /Engineer/);
  assert.match(message.html, /Accept invitation/);
  assert.match(message.html, /accept-invite\?token=test-token/);
});

test("password reset email includes an expiring reset link", () => {
  const message = buildPasswordResetEmail(
    { name: "Linus Torvalds", email: "linus@example.com" },
    "http://localhost:5173/reset-password?token=reset-token",
    60,
  );

  assert.match(message.text, /within 60 minutes/);
  assert.match(message.html, /Reset password/);
  assert.match(message.html, /reset-password\?token=reset-token/);
});
