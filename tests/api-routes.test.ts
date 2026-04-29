import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after, before, beforeEach } from "node:test";

import { hashes, sign } from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { Keypair, Transaction } from "@solana/web3.js";
import bs58 from "bs58";

import { db, generateId } from "../server/db.js";
import { createApp } from "../server/index.js";
import { resetRateLimitState } from "../server/security.js";

hashes.sha512 = sha512;

let baseUrl = "";
let server: Server | null = null;
let rpcServer: Server | null = null;

const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

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
  rpcServer = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const payload = chunks.length
      ? (JSON.parse(Buffer.concat(chunks).toString("utf8")) as { method?: string; id?: number })
      : { method: "unknown", id: 1 };

    let result: unknown;
    switch (payload.method) {
      case "getLatestBlockhash":
        result = {
          context: { slot: 123 },
          value: {
            blockhash: "11111111111111111111111111111111",
            lastValidBlockHeight: 456,
          },
        };
        break;
      case "getEpochInfo":
        result = { absoluteSlot: 123, epoch: 9 };
        break;
      default:
        result = {};
    }

    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ jsonrpc: "2.0", id: payload.id ?? 1, result }));
  });

  rpcServer.listen(0, "127.0.0.1");
  await once(rpcServer, "listening");
  const rpcAddress = rpcServer.address() as AddressInfo;
  process.env.SOLANA_RPC_ENDPOINT = `http://127.0.0.1:${rpcAddress.port}`;
  process.env.SOLANA_NETWORK = "devnet";

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
      server?.closeAllConnections?.();
    });
  }
  if (rpcServer) {
    await new Promise<void>((resolve, reject) => {
      rpcServer?.close((err) => {
        if (err) reject(err);
        else resolve();
      });
      rpcServer?.closeAllConnections?.();
    });
  }
  db.close();
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
        signing_request_id, initiated_by_wallet, queued_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    settlementId,
    transferId,
    "signing_requested",
    "commitment-abcdef1234567890",
    "nullifier-fedcba0987654321",
    "PRF-TEST1234",
    requestId,
    walletAddress,
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

function insertPrepareReadySettlement(walletAddress: string, status: string = "signing_requested") {
  const now = new Date().toISOString();
  const transferId = generateId("TRN");
  const settlementId = generateId("STL");

  db.prepare(
    `
      INSERT INTO transfers (
        id, reference, recipient_address, amount, asset, status,
        proof_state, notes, region, created_by, initiated_by_wallet, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    transferId,
    generateId("ZKG"),
    "recipient-wallet",
    42,
    "USDC",
    "pending",
    "generated",
    "phase3-test",
    "APAC",
    "operator",
    walletAddress,
    now,
    now,
  );

  db.prepare(
    `
      INSERT INTO zk_settlements (
        id, transfer_id, status, initiated_by_wallet, commitment, nullifier, proof_id, queued_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    settlementId,
    transferId,
    status,
    walletAddress,
    "commitment-abcdef1234567890",
    "nullifier-fedcba0987654321",
    "PRF-TEST1234",
    now,
    now,
  );

  return { settlementId, transferId };
}

async function waitForSettlementStatus(
  settlementId: string,
  sessionToken: string,
  expectedStatus: string,
  timeoutMs = 15_000,
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await requestJson<Record<string, unknown>>(`/api/zk/settlement/${settlementId}`, {
      headers: { "x-wallet-session": sessionToken },
    });

    assert.equal(res.status, 200);

    if (res.body.status === expectedStatus) {
      return res.body;
    }

    if (res.body.status === "failed") {
      throw new Error(`settlement failed: ${String(res.body.error_message ?? "unknown")}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`timed out waiting for settlement ${settlementId} to reach ${expectedStatus}`);
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

test("settlement initiate now stops at wallet signing instead of auto-finalizing", async () => {
  const wallet = makeWallet();
  insertApplication(wallet.walletAddress, "qualified");
  const token = await issueWalletSession(wallet);

  const transferId = generateId("TRN");
  const now = new Date().toISOString();
  db.prepare(
    `
      INSERT INTO transfers (
        id, reference, recipient_address, amount, asset, status,
        proof_state, notes, region, created_by, initiated_by_wallet, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    transferId,
    generateId("ZKG"),
    "recipient-wallet",
    75,
    "USDC",
    "pending",
    "generated",
    "phase3-initiate",
    "APAC",
    "operator",
    wallet.walletAddress,
    now,
    now,
  );

  const initiated = await requestJson<{ settlement_id: string; status: string }>(
    "/api/zk/settlement/initiate",
    {
      method: "POST",
      headers: { "x-wallet-session": token },
      body: JSON.stringify({
        transfer_id: transferId,
        value: 75,
        asset: "USDC",
        recipient_fingerprint: "FP-RECIPIENT-TEST",
        memo: "phase3-wallet-flow",
      }),
    },
  );

  assert.equal(initiated.status, 200);

  const settlement = await waitForSettlementStatus(
    initiated.body.settlement_id,
    token,
    "signing_requested",
  );
  assert.equal(settlement.initiated_by_wallet, wallet.walletAddress);
  assert.equal(settlement.on_chain_tx_sig, null);
  assert.equal(settlement.finalized_at, null);
});

test("tx prepare returns an unsigned transaction and reuses the active signing request", async () => {
  const wallet = makeWallet();
  insertApplication(wallet.walletAddress, "qualified");
  const token = await issueWalletSession(wallet);
  const fixture = insertPrepareReadySettlement(wallet.walletAddress);

  const prepared = await requestJson<{
    request_id: string;
    serialized_tx: string;
    memo_text: string;
    status: string;
    expires_at: string;
  }>("/api/zk/tx/prepare", {
    method: "POST",
    headers: { "x-wallet-session": token },
    body: JSON.stringify({ settlement_id: fixture.settlementId }),
  });

  assert.equal(prepared.status, 200);
  assert.equal(prepared.body.status, "ready_to_sign");
  const tx = Transaction.from(Buffer.from(prepared.body.serialized_tx, "base64"));
  assert.equal(tx.feePayer?.toBase58(), wallet.walletAddress);
  assert.equal(tx.instructions[0]?.programId.toBase58(), MEMO_PROGRAM_ID);
  assert.equal(tx.instructions[0]?.data.toString("utf8"), prepared.body.memo_text);

  const signingRequest = db
    .prepare(
      "SELECT id, status, wallet_address, tx_data FROM zk_signing_requests WHERE id = ? LIMIT 1",
    )
    .get(prepared.body.request_id) as {
    id: string;
    status: string;
    wallet_address: string;
    tx_data: string;
  };
  assert.equal(signingRequest.status, "pending");
  assert.equal(signingRequest.wallet_address, wallet.walletAddress);
  assert.equal(signingRequest.tx_data, prepared.body.serialized_tx);

  const reused = await requestJson<{ request_id: string; serialized_tx: string }>(
    "/api/zk/tx/prepare",
    {
      method: "POST",
      headers: { "x-wallet-session": token },
      body: JSON.stringify({ settlement_id: fixture.settlementId }),
    },
  );

  assert.equal(reused.status, 200);
  assert.equal(reused.body.request_id, prepared.body.request_id);
  assert.equal(reused.body.serialized_tx, prepared.body.serialized_tx);
});

test("tx status and settlement status are only visible to the owning wallet", async () => {
  const owner = makeWallet();
  const attacker = makeWallet();
  insertApplication(owner.walletAddress, "qualified");
  insertApplication(attacker.walletAddress, "qualified");
  const ownerToken = await issueWalletSession(owner);
  const attackerToken = await issueWalletSession(attacker);
  const fixture = insertPrepareReadySettlement(owner.walletAddress);

  const prepared = await requestJson<{ request_id: string }>("/api/zk/tx/prepare", {
    method: "POST",
    headers: { "x-wallet-session": ownerToken },
    body: JSON.stringify({ settlement_id: fixture.settlementId }),
  });
  assert.equal(prepared.status, 200);

  const settlementVisibleToOwner = await requestJson<Record<string, unknown>>(
    `/api/zk/settlement/${fixture.settlementId}`,
    {
      headers: { "x-wallet-session": ownerToken },
    },
  );
  assert.equal(settlementVisibleToOwner.status, 200);

  const settlementBlocked = await requestJson<{ error: string }>(
    `/api/zk/settlement/${fixture.settlementId}`,
    {
      headers: { "x-wallet-session": attackerToken },
    },
  );
  assert.equal(settlementBlocked.status, 403);
  assert.equal(settlementBlocked.body.error, "wallet_session_mismatch");

  const txBlocked = await requestJson<{ error: string }>(`/api/zk/tx/${prepared.body.request_id}`, {
    headers: { "x-wallet-session": attackerToken },
  });
  assert.equal(txBlocked.status, 403);
  assert.equal(txBlocked.body.error, "wallet_session_mismatch");

  const txVisibleToOwner = await requestJson<{ id: string }>(
    `/api/zk/tx/${prepared.body.request_id}`,
    {
      headers: { "x-wallet-session": ownerToken },
    },
  );
  assert.equal(txVisibleToOwner.status, 200);
  assert.equal(txVisibleToOwner.body.id, prepared.body.request_id);
});
