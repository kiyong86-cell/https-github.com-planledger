@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 사업계획서 ^& 영수증 관리

echo.
echo  ================================================
echo   사업계획서 ^& 영수증 관리 사이트를 시작합니다
echo  ================================================
echo.
echo   잠시 후 브라우저가 자동으로 열립니다.
echo   이 창을 닫으면 사이트가 종료됩니다.
echo.

if not exist node_modules (
  echo   [최초 실행] 필요한 파일을 설치하는 중... 몇 분 걸릴 수 있어요.
  call npm install
)

start "" /b cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:3000"
call npm run dev
