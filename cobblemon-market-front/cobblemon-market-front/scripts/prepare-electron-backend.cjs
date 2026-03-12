const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const frontRoot = path.resolve(__dirname, '..');
const backendRoot = path.resolve(frontRoot, '..', '..', 'CobblemonMarketApi');
const distBrowser = path.join(frontRoot, 'dist', 'cobblemon-market-front', 'browser');
const backendWwwroot = path.join(backendRoot, 'wwwroot');
const backendPublishOut = path.join(frontRoot, 'electron', 'backend-publish');

if (!fs.existsSync(distBrowser)) {
  throw new Error(`Frontend build not found: ${distBrowser}`);
}

if (fs.existsSync(backendWwwroot)) {
  fs.rmSync(backendWwwroot, { recursive: true, force: true });
}
fs.mkdirSync(backendWwwroot, { recursive: true });
fs.cpSync(distBrowser, backendWwwroot, { recursive: true });

if (fs.existsSync(backendPublishOut)) {
  fs.rmSync(backendPublishOut, { recursive: true, force: true });
}

const publishCmd = [
  'dotnet publish',
  `"${path.join(backendRoot, 'CobblemonMarketApi.csproj')}"`,
  '-c Release',
  '-r win-x64',
  '--self-contained true',
  '-p:PublishSingleFile=true',
  '-p:IncludeNativeLibrariesForSelfExtract=true',
  `-o "${backendPublishOut}"`,
].join(' ');

execSync(publishCmd, { stdio: 'inherit', cwd: backendRoot });
