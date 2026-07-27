export function safeString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(v => typeof v === 'string' ? `- ${v}` : JSON.stringify(v)).join('\n');
  if (val === null || val === undefined) return '';
  return JSON.stringify(val);
}

export function getApiKeys(): string[] {
  const keys = [
    process.env.AI_API_KEY,
    process.env.QWEN_API_KEY_1,
    process.env.QWEN_API_KEY_2,
    process.env.QWEN_API_KEY_3,
  ].filter(Boolean) as string[];

  return keys;
}
