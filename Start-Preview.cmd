@echo off
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. This PC used Node 24 for the build.
  pause
  exit /b 1
)
node "%~dp0scripts\serve-package.mjs"
if errorlevel 1 pause
