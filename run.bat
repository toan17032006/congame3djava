@echo off
chcp 65001 >nul
echo ================================================
echo  Dao Cua Ke Vo Danh - Samurai 3D (LibGDX)
echo ================================================
echo.
java -version >nul 2>&1
if errorlevel 1 (
  echo [LOI] Khong tim thay Java.
  echo Hay cai JDK 17 tro len, vi du Temurin tai https://adoptium.net/
  echo Sau khi cai xong, dong cua so nay va chay lai run.bat
  pause
  exit /b 1
)
echo Da tim thay Java. Dang khoi dong game...
echo Lan dau chay se tai Gradle va LibGDX (can mang, co the mat vai phut, dung tat cua so).
echo Cac lan sau se chay nhanh hon.
echo.
call gradlew.bat run
if errorlevel 1 (
  echo.
  echo [LOI] Game thoat voi loi.
  echo Xem README muc "0. Cach chay nhanh nhat" de sua loi thuong gap.
  pause
)
