import { spawnSync } from 'node:child_process';

export function which(cmd: string): string | null {
  const res = spawnSync('command', ['-v', cmd], { encoding: 'utf8', shell: true });
  return res.stdout.trim() || null;
}
