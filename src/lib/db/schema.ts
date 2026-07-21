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
