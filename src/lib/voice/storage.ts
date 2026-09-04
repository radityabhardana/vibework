import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'data');

function safeId(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid storage ID');
  return id;
}

export function voiceDirectory(id: string) {
  return path.join(ROOT, 'voices', safeId(id));
}

export function generationDirectory(id: string) {
  return path.join(ROOT, 'voice-generations', safeId(id));
}

export async function saveVoiceFile(id: string, filename: string, data: Buffer) {
  const directory = voiceDirectory(id);
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, path.basename(filename));
  await writeFile(filePath, data);
  return filePath;
}

export async function saveGenerationFile(id: string, data: Buffer) {
  const directory = generationDirectory(id);
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, 'output.mp3');
  await writeFile(filePath, data);
  return filePath;
}

export async function readStoredFile(filePath: string) {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(`${ROOT}${path.sep}`)) throw new Error('Invalid audio path');
  return readFile(resolved);
}

export async function deleteVoiceFiles(id: string) {
  await rm(voiceDirectory(id), { recursive: true, force: true });
}

export async function deleteGenerationFiles(id: string) {
  await rm(generationDirectory(id), { recursive: true, force: true });
}
