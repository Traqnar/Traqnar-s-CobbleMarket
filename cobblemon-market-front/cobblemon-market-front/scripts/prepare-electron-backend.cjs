const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const frontRoot = path.resolve(__dirname, '..');
const backendRoot = path.resolve(frontRoot, '..', '..', 'CobblemonMarketApi');
const distBrowser = path.join(frontRoot, 'dist', 'cobblemon-market-front', 'browser');
const backendWwwroot = path.join(backendRoot, 'wwwroot');
const backendPublishOut = path.join(frontRoot, 'electron', 'backend-publish');

function getRuntimeIdentifier() {
  if (process.platform === 'win32') {
    return 'win-x64';
  }

  if (process.platform === 'darwin') {
    return process.arch === 'arm64' ? 'osx-arm64' : 'osx-x64';
  }

  if (process.platform === 'linux') {
    return process.arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
  }

  throw new Error(`Unsupported platform for backend publish: ${process.platform}/${process.arch}`);
}

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
  `-r ${getRuntimeIdentifier()}`,
  '--self-contained true',
  '-p:PublishSingleFile=true',
  '-p:IncludeNativeLibrariesForSelfExtract=true',
  `-o "${backendPublishOut}"`,
].join(' ');

execSync(publishCmd, { stdio: 'inherit', cwd: backendRoot });
