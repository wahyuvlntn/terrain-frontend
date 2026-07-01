@echo off
if "%~1"=="" (
  echo Usage: push-images.bat registry.example.com/project/digital-twin-afdd-frontend:tag
  exit /b 1
)
cd /d "%~dp0.."
docker tag digital-twin-afdd-frontend:latest "%~1"
if errorlevel 1 exit /b %errorlevel%
docker push "%~1"
exit /b %errorlevel%
