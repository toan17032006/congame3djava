#!/bin/sh
echo "================================================"
echo " Dao Cua Ke Vo Danh - Samurai 3D (LibGDX)"
echo "================================================"
echo ""
if ! command -v java >/dev/null 2>&1; then
  echo "[LOI] Khong tim thay Java."
  echo "Hay cai JDK 17 tro len, vi du Temurin tai https://adoptium.net/"
  echo "Sau khi cai xong, chay lai ./run.sh"
  exit 1
fi
echo "Da tim thay Java. Dang khoi dong game..."
echo "Lan dau chay se tai Gradle va LibGDX (can mang, co the mat vai phut, dung tat cua so)."
echo "Cac lan sau se chay nhanh hon."
echo ""
./gradlew run
status=$?
if [ $status -ne 0 ]; then
  echo ""
  echo "[LOI] Game thoat voi loi."
  echo "Xem README muc '0. Cach chay nhanh nhat' de sua loi thuong gap."
  exit $status
fi
