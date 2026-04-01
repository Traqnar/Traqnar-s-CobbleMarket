const { execFileSync } = require('child_process');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runNpmScript(scriptName) {
  execFileSync(npmCmd, ['run', scriptName], {
    stdio: 'inherit',
  });
}

runNpmScript('build');
runNpmScript('build:backend');
