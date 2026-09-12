import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REQUIRED_PRD_SECTIONS,
  synthesizeFallbackPRD,
  synthesizeFallbackFlowchart,
  synthesizeFallbackADR,
  synthesizeFallbackAgentsMd,
  generateSchema,
  AiGenerationTimeoutError,
  SCHEMA_GENERATION_MAX_TOKENS,
  SCHEMA_GENERATION_TIMEOUT_MS,
  SCHEMA_GENERATION_TIMEOUT_RESPONSE,
} from '../src/lib/engine/prompt-chaining';
import { isValidAppFlowchart } from '../src/lib/flowchart';

test('synthesizeFallbackPRD creates complete structured PRD from chat transcript', () => {
  const chatTranscript = `User: Bangun platform AI Customer Support multi-channel (WhatsApp, Webchat, Telegram).
System Architect: Siapa target pengguna utamanya?
User: Tim Customer Service dan pengguna akhir yang butuh bantuan cepat.
System Architect: Apa saja fitur utama MVP?
User: Bot cerdas FAQ SOP, auto-resolve tiket, dan tombol handover instan ke agen manusia.`;

  const prd = synthesizeFallbackPRD(chatTranscript);

  assert.ok(prd.name && prd.name.length > 0, 'Should have non-empty name');
  assert.ok(prd.name.split(/\s+/).length <= 5, 'Name should be concise');
  assert.ok(prd.description && prd.description.length > 0, 'Should have non-empty description');
  assert.ok(prd.targetUser && prd.targetUser.length > 0, 'Should have targetUser');
  assert.ok(prd.coreFeatures && prd.coreFeatures.includes('-'), 'Should have bulleted coreFeatures');
  assert.ok(prd.mvpConstraints && prd.mvpConstraints.includes('-'), 'Should have bulleted mvpConstraints');
  assert.ok(prd.monetizationModel && prd.monetizationModel.length > 0, 'Should have monetizationModel');
  assert.ok(prd.documentContent && prd.documentContent.includes('# Product Requirements Document'), 'Should have markdown PRD document');
  assert.deepEqual(Object.keys(prd).sort(), [
    'name',
    'description',
    'targetUser',
    'coreFeatures',
    'mvpConstraints',
    'monetizationModel',
    'documentContent',
  ].sort(), 'PRD top-level contract must remain unchanged');
  for (const section of REQUIRED_PRD_SECTIONS) {
    assert.ok(prd.documentContent.includes(`## ${section}`), `PRD must include required section: ${section}`);
  }
});

test('synthesizeFallbackPRD keeps required production sections for a minimal brief', () => {
  const prd = synthesizeFallbackPRD('User: Catatan tugas bersama untuk tim kecil.');

  for (const section of REQUIRED_PRD_SECTIONS) {
    assert.match(prd.documentContent, new RegExp(`^## ${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'), `Missing heading: ${section}`);
  }
  assert.match(prd.documentContent, /Loading:/, 'Must define loading UX state');
  assert.match(prd.documentContent, /Empty:/, 'Must define empty UX state');
  assert.match(prd.documentContent, /Error:/, 'Must define error UX state');
  assert.match(prd.documentContent, /Acceptance:/, 'Must include acceptance criteria');
});

test('synthesizeFallbackFlowchart generates a fully connected, valid AppFlowchart', () => {
  const prdContent = 'Aplikasi Chat Support AI multi-channel.';
  const flowchart = synthesizeFallbackFlowchart(prdContent);

  assert.ok(flowchart.nodes.length >= 3, 'Should have multiple nodes');
  assert.ok(flowchart.edges.length >= 2, 'Should have connecting edges');
  assert.equal(isValidAppFlowchart(flowchart), true, 'Synthesized flowchart must pass isValidAppFlowchart validation');
});

test('synthesizeFallbackADR returns a complete architecture decision record', () => {
  const prdContent = 'Platform AI Customer Support.';
  const adr = synthesizeFallbackADR(prdContent);

  assert.ok(adr.frontendStack.length > 0, 'Frontend stack must not be empty');
  assert.ok(adr.backendStack.length > 0, 'Backend stack must not be empty');
  assert.ok(adr.database.length > 0, 'Database must not be empty');
  assert.ok(adr.deployment.length > 0, 'Deployment must not be empty');
  assert.ok(adr.adrDocument.includes('# Architecture Decision Record'), 'Must include ADR document content');
});

test('synthesizeFallbackAgentsMd includes AI confidence guardrail and tech rules', () => {
  const prdContent = 'Platform AI Customer Support.';
  const adrContent = 'Next.js 16, TypeScript, Drizzle ORM.';
  const agents = synthesizeFallbackAgentsMd(prdContent, adrContent);

  assert.ok(agents.agentsDocument.includes('# Project Mission & Identity'), 'Must define identity');
  assert.ok(agents.agentsDocument.includes('AI Confidence Guardrails'), 'Must enforce confidence guardrails');
  assert.ok(agents.agentsDocument.includes('CRITICAL GUARDRAIL'), 'Must enforce critical override rule');
});

test('generateSchema uses the bounded compact schema policy without fallback', async () => {
  const previousKey = process.env.AI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.AI_API_KEY = 'test-schema-policy-key';

  let request: Record<string, unknown> | null = null;
  globalThis.fetch = (async (_input, init) => {
    request = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ dbSchema: '# Schema', apiContract: { endpoints: [] } }) } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;

  try {
    await generateSchema('FULL PRD SOURCE', 'FULL ADR SOURCE');
    const capturedRequest = request as unknown as Record<string, unknown>;
    assert.equal(capturedRequest.max_tokens, SCHEMA_GENERATION_MAX_TOKENS);
    assert.equal(SCHEMA_GENERATION_TIMEOUT_MS, 70_000);
    const messages = capturedRequest.messages as Array<{ content: string }>;
    assert.match(messages[0].content, /MVP entities only/i);
    assert.match(messages[0].content, /examples, tutorials/i);
    assert.match(messages[1].content, /FULL PRD SOURCE/);
    assert.match(messages[1].content, /FULL ADR SOURCE/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = previousKey;
  }
});

test('generateSchema preserves a provider timeout instead of using a fallback', async () => {
  const previousKey = process.env.AI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.AI_API_KEY = 'test-schema-timeout-key';
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    const error = new Error('simulated timeout');
    error.name = 'AbortError';
    throw error;
  }) as typeof fetch;

  try {
    await assert.rejects(
      generateSchema('FULL PRD SOURCE', 'FULL ADR SOURCE'),
      AiGenerationTimeoutError,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = previousKey;
  }
});

test('schema timeout response is explicit about retryability and persistence', () => {
  assert.deepEqual(SCHEMA_GENERATION_TIMEOUT_RESPONSE, {
    error: 'Schema generation timed out before anything was saved.',
    code: 'GENERATION_TIMEOUT',
    operation: 'schema',
    retryable: true,
    persisted: false,
  });
});
