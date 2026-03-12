@echo off
setlocal

set "ROOT=%~dp0"
set "FRONT=%ROOT%cobblemon-market-front\cobblemon-market-front"

if not exist "%FRONT%\package.json" (
  echo [ERROR] Frontend folder not found:
  echo %FRONT%
  pause
  exit /b 1
)

cd /d "%FRONT%"

if not exist "node_modules" (
  echo [INFO] Installing npm dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

set /p "DO_VERSIONING=Versionning avant build ? (O/N): "
if /I "%DO_VERSIONING%"=="O" (
  echo [INFO] Bumping app version patch...
  call npm version patch --no-git-tag-version
  if errorlevel 1 (
    echo [ERROR] Version bump failed.
    pause
    exit /b 1
  )
) else (
  if /I "%DO_VERSIONING%"=="N" (
    echo [INFO] Versionning skipped.
  ) else (
    echo [ERROR] Choix invalide. Reponds par O ou N.
    pause
    exit /b 1
  )
)

for /f "usebackq delims=" %%v in (`node -p "require('./package.json').version"`) do set "APP_VERSION=%%v"
echo [INFO] Building installer version %APP_VERSION%...

echo [INFO] Building and generating installer...
call npm run dist:setup
if errorlevel 1 (
  echo [ERROR] Installer generation failed.
  echo Check logs above.
  pause
  exit /b 1
)

echo.
echo [OK] Installer v%APP_VERSION% generated in:
echo %FRONT%\release
echo.
pause
exit /b 0
