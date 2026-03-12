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

set /p "DO_VERSIONING=Versionning avant publish ? (O/N): "
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
echo [INFO] Preparing publish for version %APP_VERSION%...

if "%GH_TOKEN%"=="" (
  echo.
  echo [WARN] GH_TOKEN is not set for this terminal session.
  set /p "GH_TOKEN=Paste GH_TOKEN now (or leave empty to cancel): "
  if "%GH_TOKEN%"=="" (
    echo [ERROR] Missing GH_TOKEN. Publish cancelled.
    pause
    exit /b 1
  )
)

echo [INFO] Publishing installer and update metadata to GitHub Releases...
call npm run dist:setup:publish
if errorlevel 1 (
  echo [ERROR] Publish failed.
  echo Check logs above.
  pause
  exit /b 1
)

echo.
echo [OK] Publish complete for v%APP_VERSION%.
echo [INFO] Users with installed app will receive auto-update from this release.
echo [INFO] Release page:
echo https://github.com/Traqnar/Traqnar-s-CobbleMarket/releases
echo.
pause
exit /b 0
