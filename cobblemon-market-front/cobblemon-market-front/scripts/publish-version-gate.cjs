const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const root = path.resolve(__dirname, '..');
const packageJsonPath = path.join(root, 'package.json');

function parseSemver(version) {
  const match = String(version || '').trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  };
}

function readCurrentVersion() {
  const raw = fs.readFileSync(packageJsonPath, 'utf8');
  const pkg = JSON.parse(raw);
  return String(pkg.version || '').trim();
}

function askQuestion(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(String(answer || '').trim().toLowerCase());
    });
  });
}

async function main() {
  const currentVersion = readCurrentVersion();
  const parsed = parseSemver(currentVersion);
  if (!parsed) {
    throw new Error(`Version package.json invalide: "${currentVersion}"`);
  }

  const nextMinorVersion = `${parsed.major}.${parsed.minor + 1}.0`;
  console.log(`[publish] Version actuelle: ${currentVersion}`);
  console.log(`[publish] Prochaine grosse version (mineure): ${nextMinorVersion}`);

  const answer = await askQuestion(
    '[publish] Passer a la version mineure suivante avant publish ? (y = oui / n = non / c = annuler) [n]: ',
  );

  if (answer === 'c') {
    console.log('[publish] Publish annule.');
    process.exit(1);
  }

  if (answer === 'y' || answer === 'yes' || answer === 'o' || answer === 'oui') {
    execSync('npm version minor --no-git-tag-version', { cwd: root, stdio: 'inherit' });
    const newVersion = readCurrentVersion();
    console.log(`[publish] Version mise a jour: ${newVersion}`);
    return;
  }

  console.log('[publish] Version conservee, publish continue.');
}

main().catch((err) => {
  console.error(`[publish] Erreur: ${err?.message || String(err)}`);
  process.exit(1);
});
