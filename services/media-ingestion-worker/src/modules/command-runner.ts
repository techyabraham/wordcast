import { spawn, type SpawnOptions } from 'child_process';

export interface CommandResult {
  stdout: string;
  stderr: string;
  durationMs: number;
}

export const runCommand = (
  command: string,
  args: string[],
  options?: SpawnOptions,
): Promise<CommandResult> => {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(command, args, { ...options });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - startedAt;
      if (code === 0) {
        resolve({ stdout, stderr, durationMs });
        return;
      }

      const error = new Error(
        `Command failed (${command} ${args.join(' ')}): ${stderr.trim() || stdout.trim()}`,
      );
      if (code !== null) {
        (error as Error & { code?: number }).code = code;
      }
      reject(error);
    });
  });
};
