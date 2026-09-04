import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const MAX_AUDIO_SIZE = 10 * 1024 * 1024;

function run(command: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let errorOutput = '';
    child.stdout.on('data', chunk => { output += String(chunk); });
    child.stderr.on('data', chunk => { errorOutput += String(chunk); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(output) : reject(new Error(errorOutput || `${command} failed`)));
  });
}

export async function normalizeVoiceSample(file: File) {
  if (!file.type.startsWith('audio/')) throw new Error('The uploaded file must be audio.');
  if (file.size === 0 || file.size > MAX_AUDIO_SIZE) throw new Error('Audio must be between 1 byte and 10 MB.');

  const directory = await mkdtemp(path.join(tmpdir(), 'vibework-voice-'));
  const inputPath = path.join(directory, 'input');
  const outputPath = path.join(directory, 'normalized.wav');
  try {
    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    const probe = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', inputPath]);
    const duration = Number(probe.trim());
    if (!Number.isFinite(duration) || duration < 5 || duration > 60) {
      throw new Error('Voice samples must be between 5 and 60 seconds.');
    }
    await run('ffmpeg', ['-y', '-i', inputPath, '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', outputPath]);
    return { audio: await readFile(outputPath), duration };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
