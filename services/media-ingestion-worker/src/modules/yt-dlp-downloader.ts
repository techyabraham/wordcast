import path from 'path';
import { existsSync, promises as fs } from 'fs';
import { runCommand } from './command-runner';

export const downloadVideo = async (url: string, outputDir: string, jobId: string): Promise<string> => {
  const safeId = jobId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12) || 'job';
  const outputTemplate = path.join(outputDir, `wordcast-${safeId}-%(id)s.%(ext)s`);

  const result = await runCommand('yt-dlp', [
    '--no-playlist',
    '-f',
    'bestvideo+bestaudio/best',
    '-o',
    outputTemplate,
    '--print',
    'after_move:filepath',
    url,
  ]);

  const lines = result.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
  const candidate = lines.at(-1);

  if (candidate && existsSync(candidate)) {
    return candidate;
  }

  const files = await fs.readdir(outputDir);
  const matched = files.find((file) => file.startsWith(`wordcast-${safeId}-`));
  if (!matched) {
    throw new Error('yt-dlp completed but output file was not found');
  }

  return path.join(outputDir, matched);
};
