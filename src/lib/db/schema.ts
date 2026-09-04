import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').default('draft'), 
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const prds = sqliteTable('prds', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  targetUser: text('target_user'),
  coreFeatures: text('core_features'),
  mvpConstraints: text('mvp_constraints'),
  monetizationModel: text('monetization_model'),
  documentContent: text('document_content'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const adrs = sqliteTable('adrs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  frontendStack: text('frontend_stack'),
  backendStack: text('backend_stack'),
  database: text('database'),
  deployment: text('deployment'),
  adrDocument: text('adr_document'),
});

export const schemas = sqliteTable('schemas', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  dbSchema: text('db_schema'), 
  apiContract: text('api_contract', { mode: 'json' }), 
});

export const atomicPrompts = sqliteTable('atomic_prompts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  context: text('context').notNull(),
  task: text('task').notNull(),
  constraints: text('constraints').notNull(),
  format: text('format').notNull(),
  dependencies: text('dependencies', { mode: 'json' }), 
  executionOrder: integer('execution_order').notNull(),
  uiPosition: text('ui_position', { mode: 'json' }), 
});

export const appFlowcharts = sqliteTable('app_flowcharts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  nodes: text('nodes', { mode: 'json' }).notNull(),
  edges: text('edges', { mode: 'json' }).notNull(),
});

export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').default('New Chat'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), 
  content: text('content').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const learningRoadmaps = sqliteTable('learning_roadmaps', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  topic: text('topic').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const roadmapNodes = sqliteTable('roadmap_nodes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roadmapId: text('roadmap_id').notNull().references(() => learningRoadmaps.id, { onDelete: 'cascade' }),
  nodeId: text('node_id').notNull(), // string identifier e.g. 'basics', 'crypto_hash'
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').default('required'), // 'required' | 'recommended' | 'optional'
  prerequisites: text('prerequisites', { mode: 'json' }), // string[] of nodeIds
  contentMarkdown: text('content_markdown'), // Micro-lesson explanation & key concepts
  quizData: text('quiz_data', { mode: 'json' }), // Array of questions: [{ id, question, options: [], correctAnswer: number, explanation: string }]
  status: text('status').default('locked'), // 'locked' | 'unlocked' | 'mastered'
  orderIndex: integer('order_index').default(0),
});

export const userQuizAttempts = sqliteTable('user_quiz_attempts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roadmapNodeId: text('roadmap_node_id').notNull().references(() => roadmapNodes.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  passed: integer('passed', { mode: 'boolean' }).notNull(),
  completedAt: text('completed_at').default(sql`CURRENT_TIMESTAMP`),
});

export const voiceProfiles = sqliteTable('voice_profiles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  kind: text('kind').notNull(), // clone | designed
  language: text('language').notNull().default('id-ID'),
  provider: text('provider').notNull().default('modelstudio'),
  providerVoiceId: text('provider_voice_id'),
  targetModel: text('target_model').notNull().default('qwen-audio-3.0-tts-flash'),
  voicePrompt: text('voice_prompt'),
  settings: text('settings', { mode: 'json' }),
  referenceAudioPath: text('reference_audio_path'),
  previewAudioPath: text('preview_audio_path'),
  status: text('status').notNull().default('enrolling'),
  errorMessage: text('error_message'),
  consentAt: text('consent_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const voiceGenerations = sqliteTable('voice_generations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  voiceId: text('voice_id').notNull().references(() => voiceProfiles.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  instruction: text('instruction'),
  model: text('model').notNull(),
  outputAudioPath: text('output_audio_path'),
  status: text('status').notNull().default('processing'),
  errorMessage: text('error_message'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
