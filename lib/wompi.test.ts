import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { apiBase, buildCheckoutUrl, integritySignature, verifyEventChecksum } from "./wompi.ts";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

test("firma de integridad concatena referencia, monto, moneda y secreto", () => {
  assert.equal(integritySignature("NYN-1", 9435000, "COP", "sec"), sha("NYN-19435000COPsec"));
});

test("URL de checkout lleva la firma y los datos del cliente", () => {
  const url = new URL(
    buildCheckoutUrl({
      publicKey: "pub_test_x", integritySecret: "sec", reference: "NYN-1", amountInCents: 9435000,
      redirectUrl: "https://productosnutoynola.com/pedido",
      customer: { email: "a@b.co", fullName: "Ana", phone: "3001234567" },
      shipping: { address: "Cra 7 # 45-32", city: "Bogotá", region: "Bogotá D.C.", phone: "3001234567" },
    }),
  );
  assert.equal(url.origin + url.pathname, "https://checkout.wompi.co/p/");
  assert.equal(url.searchParams.get("amount-in-cents"), "9435000");
  assert.equal(url.searchParams.get("signature:integrity"), sha("NYN-19435000COPsec"));
  assert.equal(url.searchParams.get("customer-data:legal-id"), null);
});

test("apiBase elige sandbox o producción según la llave", () => {
  assert.equal(apiBase("pub_test_x"), "https://sandbox.wompi.co/v1");
  assert.equal(apiBase("pub_prod_x"), "https://production.wompi.co/v1");
});

test("verifyEventChecksum acepta firmas válidas y rechaza alteradas", () => {
  const data = { transaction: { id: "1-2", status: "APPROVED", amount_in_cents: 9435000 } };
  const props = ["transaction.id", "transaction.status", "transaction.amount_in_cents"];
  const evt = { event: "transaction.updated", data, timestamp: 1700000000,
    signature: { properties: props, checksum: sha("1-2APPROVED94350001700000000evsec") } };
  assert.equal(verifyEventChecksum(evt, "evsec"), true);
  assert.equal(verifyEventChecksum({ ...evt, timestamp: 1 }, "evsec"), false);
  assert.equal(verifyEventChecksum(evt, "otro"), false);
});
