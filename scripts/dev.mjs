// Lance le backend et le frontend ensemble (développement). Aucune dépendance : Node suffit.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const apps = [
  { name: 'backend ', dir: 'backend', color: '\x1b[34m' },
  { name: 'frontend', dir: 'frontend', color: '\x1b[35m' },
];

for (const app of apps) {
  if (!existsSync(`${app.dir}/node_modules`)) {
    console.error(`Dépendances manquantes dans ${app.dir}/. Lancez d'abord : npm run setup`);
    process.exit(1);
  }
}

const children = apps.map((app) => {
  const child = spawn('npm', ['run', 'dev'], { cwd: app.dir, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const prefix = `${app.color}[${app.name}]\x1b[0m `;
  const pipe = (stream, out) =>
    stream.on('data', (chunk) =>
      chunk.toString().split('\n').filter(Boolean).forEach((line) => out.write(prefix + line + '\n')),
    );
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    if (code) console.error(`${prefix}arrêté (code ${code})`);
    stop();
  });
  return child;
});

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  children.forEach((c) => c.kill());
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

console.log('Site : http://localhost:5173   |   API : http://localhost:4000/api/v1/health   (Ctrl+C pour arrêter)');
