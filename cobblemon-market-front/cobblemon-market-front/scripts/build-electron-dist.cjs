const { execFileSync } = require('child_process');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(command, args, options = {}) {
  execFileSync(command, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
      WIN_CSC_LINK: '',
      CSC_LINK: '',
      ...options.env,
    },
  });
}

function builderArgsForTarget(target) {
  switch (target) {
    case 'win-portable':
      return ['electron-builder', '--win', 'portable'];
    case 'win-dir':
      return ['electron-builder', '--win', 'dir'];
    case 'win-nsis':
      return ['electron-builder', '--win', 'nsis'];
    case 'win-nsis-publish':
      return ['electron-builder', '--win', 'nsis', '--publish', 'always'];
    case 'mac':
      return ['electron-builder', '--mac', 'dir', 'zip'];
    default:
      throw new Error(`Unknown dist target: ${target}`);
  }
}

const target = process.argv[2];

if (!target) {
  throw new Error('Missing dist target argument.');
}

run(process.execPath, ['scripts/clean-electron-output.cjs']);
run(npmCmd, ['run', 'pack:prepare']);
run(npxCmd, builderArgsForTarget(target));
