const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const releaseDir = path.join(root, 'release');

function killProcess(imageName) {
  if (process.platform === 'win32') {
    try {
      spawnSync('taskkill', ['/F', '/T', '/IM', imageName], { stdio: 'ignore' });
    } catch {
      // ignore: process may not be running
    }
    return;
  }

  try {
    spawnSync('pkill', ['-f', imageName], { stdio: 'ignore' });
  } catch {
    // ignore: process may not be running
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function removeWithRetries(target, retries = 5) {
  for (let i = 0; i < retries; i += 1) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(350);
    }
  }
}

(async () => {
  killProcess('TRAQNAR&co CobbleMarket.exe');
  killProcess('CobblemonMarketApi.exe');
  killProcess('TRAQNAR&co CobbleMarket');
  killProcess('CobblemonMarketApi');

  if (fs.existsSync(releaseDir)) {
    await removeWithRetries(releaseDir, 8);
  }
})();
