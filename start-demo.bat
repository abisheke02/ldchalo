@echo off
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   🎮  LD Schools Platform — DEMO MODE
echo   No database or Redis required!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo.
echo [1/2] Starting Backend (port 3001, demo mode)...
cd backend
set DEMO_MODE=true
set PORT=3001
start "LD Backend (DEMO)" cmd /c "node src/index.js"
cd ..

echo [2/2] Starting Frontend (port 5173)...
cd web
start "LD Frontend" cmd /c "npm run dev"
cd ..

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   ✅ Both servers starting!
echo   → Frontend: http://localhost:5173
echo   → Backend:  http://localhost:3001/health
echo   → Login with any email/password (demo accepts all)
echo   → Or use the "Demo Student" button on the login page
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pause
