import assert from 'node:assert/strict';
import test from 'node:test';
import {
  synthesizeFallbackPRD,
  synthesizeFallbackFlowchart,
  synthesizeFallbackADR,
  synthesizeFallbackAgentsMd,
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
