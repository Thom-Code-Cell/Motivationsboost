import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.env.VERCEL) {
  console.error('Interner Testmodus darf nicht auf Vercel gestartet werden.');
  process.exit(1);
}

const nextCli = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
if (!existsSync(nextCli)) {
  console.error('Next.js fehlt. Installiere zuerst die Abhängigkeiten mit npm ci.');
  process.exit(1);
}

const child = spawn(process.execPath, [nextCli, 'dev', '--hostname', '127.0.0.1'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    INTERNAL_TEST_MODE: 'true',
    NEXT_PUBLIC_INTERNAL_TEST_MODE: 'true',
  },
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
