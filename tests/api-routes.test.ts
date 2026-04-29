import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after, before, beforeEach } from "node:test";

import { hashes, sign } from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

import { db, generateId } from "../server/db.js";
import { createApp } from "../server/index.js";
import { resetRateLimitState } from "../server/security.js";

hashes.sha512 = sha512;

let baseUrl = "";
let server: Server | null = null;

type JsonResponse<T> = {
  status: number;
  body: T;
};

type TestWallet = {
  keypair: Keypair;
  walletAddress: string;
  signMessage: (message: string) => Promise<string>;
};

before(async () => {
  const app = createApp();
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  resetTestData();
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
});

beforeEach(() => {
  resetRateLimitState();
  resetTestData();
});

function resetTestData() {
  db.exec(`
    DELETE FROM zk_onchain_txs;
    DELETE FROM zk_signing_requests;
    DELETE FROM zk_settlements;
    DELETE FROM transfers;
    DELETE FROM wallet_sessions;
    DELETE FROM wallet_auth_challenges;
    DELETE FROM applications;
    DELETE FROM activity_events;
  `);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<JsonResponse<T>> {
  const headers = new Headers(init?.headers ?? {});
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });
  const text = await res.text();

  return {
    status: res.status,
    body: text ? (JSON.parse(text) as T) : (null as T),
  };
}

function makeWallet(): TestWallet {
  const keypair = Keypair.generate();

  return {
    keypair,
    walletAddress: keypair.publicKey.toBase58(),
    signMessage: async (message: string) => {
      const signature = await sign(
        new TextEncoder().encode(message),
        keypair.secretKey.slice(0, 32),
      );
      return bs58.encode(signature);
    },
  };
}

function insertApplication(walletAddress: string, status: string = "qualified") {
  const id = generateId("APP");
  const now = new Date().toISOString();
  const approvedAt =
    status === "qualified" || status === "pilot_candidate" || status === "contacted" ? now : null;

  db.prepare(
    `
      INSERT INTO applications (
        id, full_name, work_email, company, role, use_case, team_size, region,
        monthly_volume, current_rail, privacy_concern, why_confidential,
        status, internal_notes, review_priority, tags, contacted_at,
        wallet_address, approved_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    id,
    "Jenn Test",
    `${id.toLowerCase()}@example.com`,
    "ZKGENT Labs",
    "Founder",
    "payroll",
    "1-5",
    "Asia-Pacific",
    "$10K-$100K / mo",
    "Stablecoins",
    "On-chain data exposure",
    "Need private settlement flows for high-sensitivity counterparties.",
    status,
    "internal-note",
    "high",
    "phase2-test",
    status === "contacted" ? now : null,
    walletAddress,
    approvedAt,
    now,
    now,
  );

  return { id, now };
}

function insertSigningRequestFixture(walletAddress: string) {
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 10 * 60_000).toISOString();
  const transferId = generateId("TRN");
  const settlementId = generateId("STL");
  const requestId = generateId("TXR");

  db.prepare(
    `
      INSERT INTO transfers (
        id, reference, recipient_address, amount, asset, status,
        proof_state, notes, region, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    transferId,
    generateId("ZKG"),
    "recipient-wallet",
    42,
    "USDC",
    "pending",
    "generated",
    "phase2-test",
    "APAC",
    "operator",
    now,
    now,
  );

  db.prepare(
    `
      INSERT INTO zk_settlements (
        id, transfer_id, status, commitment, nullifier, proof_id,
        signing_request_id, queued_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    settlementId,
    transferId,
    "signing_requested",
    "commitment-abcdef1234567890",
    "nullifier-fedcba0987654321",
    "PRF-TEST1234",
    requestId,
    now,
    now,
  );

  db.prepare(
    `
      INSERT INTO zk_signing_requests (
        id, settlement_id, tx_data, status, wallet_address, requested_at, expires_at, responded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    requestId,
    settlementId,
    "base64-serialized-tx",
    "pending",
    walletAddress,
    now,
    future,
    null,
  );

  return { requestId, settlementId, transferId };
}

async function issueWalletSession(wallet: TestWallet): Promise<string> {
  const challenge = await requestJson<{
    id: string;
    message: string;
  }>("/api/wallet-auth/challenge", {
    method: "POST",
    body: JSON.stringify({ wallet_address: wallet.walletAddress }),
  });

  assert.equal(challenge.status, 200);

  const signatureBase58 = await wallet.signMessage(challenge.body.message);
  const verified = await requestJson<{
    session: { token: string };
  }>("/api/wallet-auth/verify", {
    method: "POST",
    body: JSON.stringify({
      wallet_address: wallet.walletAddress,
      challenge_id: challenge.body.id,
      signature_base58: signatureBase58,
    }),
  });

  assert.equal(verified.status, 200);
  return verified.body.session.token;
}

test("wallet auth challenge rejects invalid wallet addresses", async () => {
  const res = await requestJson<{ error: string }>("/api/wallet-auth/challenge", {
    method: "POST",
    body: JSON.stringify({ wallet_address: "not-a-wallet" }),
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "valid_wallet_address_required");
});

test("wallet auth verify rejects mismatched signatures", async () => {
  const wallet = makeWallet();
  const attacker = makeWallet();

  const challenge = await requestJson<{
    id: string;
    message: string;
  }>("/api/wallet-auth/challenge", {
    method: "POST",
    body: JSON.stringify({ wallet_address: wallet.walletAddress }),
  });

  assert.equal(challenge.status, 200);

  const forgedSignature = await attacker.signMessage(challenge.body.message);
  const res = await requestJson<{ error: string }>("/api/wallet-auth/verify", {
    method: "POST",
    body: JSON.stringify({
      wallet_address: wallet.walletAddress,
      challenge_id: challenge.body.id,
      signature_base58: forgedSignature,
    }),
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "invalid_signature");
});

test("wallet auth session endpoint returns the authenticated wallet session", async () => {
  const wallet = makeWallet();
  const token = await issueWalletSession(wallet);

  const res = await requestJson<{
    session: { wallet_address: string };
  }>("/api/wallet-auth/session", {
    headers: { "x-wallet-session": token },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.session.wallet_address, wallet.walletAddress);
});

test("access check only returns the redacted public application view", async () => {
  const wallet = makeWallet();
  insertApplication(wallet.walletAddress, "qualified");

  const res = await requestJson<{
    hasAccess: boolean;
    application: Record<string, unknown> | null;
  }>(`/api/access/check?wallet=${wallet.walletAddress}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.hasAccess, true);
  assert.ok(res.body.application);
  assert.deepEqual(Object.keys(res.body.application!).sort(), [
    "approvedAt",
    "createdAt",
    "id",
    "status",
    "walletAddress",
  ]);
});

test("tx confirm rejects a signing request submitted from a different authenticated wallet", async () => {
  const requestWallet = makeWallet();
  const sessionWallet = makeWallet();
  insertApplication(requestWallet.walletAddress, "qualified");
  insertApplication(sessionWallet.walletAddress, "qualified");
  const token = await issueWalletSession(sessionWallet);
  const fixture = insertSigningRequestFixture(requestWallet.walletAddress);

  const res = await requestJson<{ error: string }>("/api/zk/tx/confirm", {
    method: "POST",
    headers: { "x-wallet-session": token },
    body: JSON.stringify({
      request_id: fixture.requestId,
      tx_signature: makeWallet().walletAddress,
    }),
  });

  assert.equal(res.status, 403);
  assert.equal(res.body.error, "wallet_session_mismatch");
});

test("tx confirm accepts the authenticated wallet and records on-chain metadata", async () => {
  const wallet = makeWallet();
  insertApplication(wallet.walletAddress, "qualified");
  const token = await issueWalletSession(wallet);
  const fixture = insertSigningRequestFixture(wallet.walletAddress);
  const txSignature = makeWallet().walletAddress;

  const res = await requestJson<{
    success: boolean;
    tx_signature: string;
    explorer_url: string;
    status: string;
  }>("/api/zk/tx/confirm", {
    method: "POST",
    headers: { "x-wallet-session": token },
    body: JSON.stringify({
      request_id: fixture.requestId,
      tx_signature: txSignature,
      network: "devnet",
    }),
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.tx_signature, txSignature);
  assert.equal(res.body.status, "submitted_on_chain");
  assert.match(res.body.explorer_url, new RegExp(txSignature));

  const signingRequest = db
    .prepare("SELECT status, signature, responded_at FROM zk_signing_requests WHERE id = ?")
    .get(fixture.requestId) as { status: string; signature: string; responded_at: string | null };
  assert.equal(signingRequest.status, "signed");
  assert.equal(signingRequest.signature, txSignature);
  assert.ok(signingRequest.responded_at);

  const settlement = db
    .prepare(
      "SELECT status, on_chain_tx_sig, on_chain_explorer_url FROM zk_settlements WHERE id = ?",
    )
    .get(fixture.settlementId) as {
    status: string;
    on_chain_tx_sig: string;
    on_chain_explorer_url: string | null;
  };
  assert.equal(settlement.status, "submitted_on_chain");
  assert.equal(settlement.on_chain_tx_sig, txSignature);
  assert.match(settlement.on_chain_explorer_url ?? "", new RegExp(txSignature));

  const onChainTx = db
    .prepare("SELECT signature, status, memo_data FROM zk_onchain_txs WHERE settlement_id = ?")
    .get(fixture.settlementId) as { signature: string; status: string; memo_data: string };
  assert.equal(onChainTx.signature, txSignature);
  assert.equal(onChainTx.status, "submitted");
  assert.match(onChainTx.memo_data, /^zkgent:v1:/);
});
