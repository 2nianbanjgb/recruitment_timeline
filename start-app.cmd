@echo off
cd /d %~dp0
echo Starting recruitment-timeline server...
echo Open http://127.0.0.1:5173/ once it is ready.
echo Close this window to stop the server.
call npm run app
pause
