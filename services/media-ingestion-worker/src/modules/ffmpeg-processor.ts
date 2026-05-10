import { runCommand } from './command-runner';

export const extractAudio = async (inputPath: string, outputPath: string) => {
  await runCommand('ffmpeg', [
    '-y',
    '-i',
    inputPath,
    '-ac',
    '1',
    '-ar',
    '16000',
    '-vn',
    '-b:a',
    '96k',
    outputPath,
  ]);
};
