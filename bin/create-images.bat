@echo off
cd /d "%~dp0.."
docker build -t digital-twin-afdd-frontend:latest .
exit /b %errorlevel%
