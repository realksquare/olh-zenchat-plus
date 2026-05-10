@echo off
taskkill /F /IM erl.exe >nul 2>&1
timeout /t 1 /nobreak >nul 2>&1

set "PATH=%USERPROFILE%\elixir\bin;%PATH%"

set "DATABASE_URL=postgresql://neondb_owner:npg_0lBuJsnzFxk4@ep-snowy-dew-ao87hb04.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
set "JWT_SECRET=ahh_vazhthukkal_vazhthukkal"
set "SECRET_KEY_BASE=L5V9dYj4uA8Xk3T7mN2PqW6cR1hF5bE9zS4vM8gJ2xK7nC3aD9yT1fG6vB8wH4jK"
set "CLOUDINARY_CLOUD_NAME=du4nvei7j"
set "CLOUDINARY_API_KEY=253214569582787"
set "CLOUDINARY_API_SECRET=pqkOE0L7R1EKWXtsEDBYeAPDT_ms"
set "SPOTIFY_CLIENT_ID=f99d8d80491d476f8d5f89797975a765"
set "SPOTIFY_CLIENT_SECRET=2a0d8d0a3feb49edad7bc9563eda0236"
set "CLIENT_URL=http://localhost:5173"

cd /d "%~dp0"
echo.
echo Starting Phoenix server on http://localhost:4000
echo Press Ctrl+C to stop.
echo.
"%USERPROFILE%\elixir\bin\mix.bat" phx.server
pause
