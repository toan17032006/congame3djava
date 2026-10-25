# Báo cáo nghiệm thu — đối chiếu Acceptance Criteria

Trạng thái: **Đạt / Chưa đạt / Chưa thể kiểm chứng**. Mọi mục "Đạt" đều có bằng chứng thực thi
(kiểm thử tự động trong trình duyệt thật ngày 2026-10-25, Chrome qua CDP, 60 FPS, `window.__errors = []`
suốt phiên; lệnh API kiểm bằng curl). Số liệu hiệu năng ghi nhận trên máy thử nghiệm cụ thể
(Ryzen laptop, Chrome 141, 1280×800) — **không cam kết 60 FPS trên mọi thiết bị**; đã có 3 mức chất lượng.

| # | Tiêu chí | Trạng thái | Bằng chứng / cách kiểm |
|---|---|---|---|
| 1 | Ứng dụng khởi chạy trên localhost | **Đạt** | `samurai serve` → `GET /` 200 (bundle 691KB), `GET /api/health` → `{"status":"ok"}`; menu render (screenshot) |
| 2 | Production build thành công & kiểm tra trên trình duyệt | **Đạt** | `npm run build` (esbuild, minify) → chơi trực tiếp bản bundle trong trình duyệt; toàn bộ phiên kiểm thử dùng `web/dist` |
| 3 | Nhân vật di chuyển WASD | **Đạt** | Giữ KeyW 1.0s → z 101→96.8 (≈ run speed 5 m/s), `anim: idle→run`, yaw xoay theo hướng đi; di chuyển theo hướng camera đã xác minh |
| 4 | J, K, L, I, U, C, Shift đúng thiết kế | **Đạt** | J: combo 3 nhánh, bandit 45→3 HP; U (Nhất Đao Trảm): 52 dmg/1 nhát; L giữ: chip dmg 1/10, L đúng lúc: địch `parried` + riposte x2; I: iframes → 0 dmg; C: khóa `bandit_grunt` + marker; Shift: sprint (fov kick, tốn stamina — observation) |
| 5 | Camera 1st/3rd hoạt động | **Đạt** | V: mode third↔first↔third; first person: camera cách đầu 1.54m, rig ẩn; third: orbit + zoom + collision clamp |
| 6 | Hit detection, stamina, né, đỡ, parry thật | **Đạt** | Xem #4; stamina trừ khi đánh/né/sprint, hồi sau delay; hitstop, knockback, popup sát thương, chí mạng (crit 11%) |
| 7 | Animation chuyển trạng thái đúng, không sát thương trùng | **Đạt** | Animator pose-clip + crossfade; mỗi nhát đánh có `strikeId` + `targets:Set` chặn multi-hit; corpse fade |
| 8 | NPC phát hiện, truy đuổi, chiến đấu | **Đạt** | FSM patrol→chase→attack/strafe/block/dodge/retreat; squad assist khi 1 thành viên bị đánh; villagers bỏ chạy; ally samurai chiến đấu cùng (L02/L06 spawn) |
| 9 | Boss có bộ chiêu + chuyển pha | **Đạt** | L05 Kurogane: HP<60% → phase 1 (đổi moves + triệu hồi 2 sơn tặc); L15 Yamikage 3 pha, 4064 HP, tấn công thật; AoE có vòng telegraph đỏ; projectileFan (vòng lửa/ảnh tán) |
| 10 | Trang bị đổi ngoại hình/chỉ số | **Đạt** | Screenshot: kabuto + giáp tấm + kiếm mới hiện trên rig; attack 15→31, defense 4→20 sau equip; vũ khí đổi combo/range/tốc |
| 11 | Cấp độ, kỹ năng, vật phẩm | **Đạt** | XP→Level up (thêm điểm attrs/skills); cây 15 node 3 nhánh, học/gán U; túi đồ, dùng vật phẩm, nâng cấp +N |
| 12 | Survival: thu thập + chế tạo | **Đạt** | Node tre/cỏ/quặng (respawn 90s) → nhặt bằng E → `craft('r_bandage')` +2 băng gạc; rương có loot; thương nhân mua bán |
| 13 | Khu vực mở, chuyển vùng đúng | **Đạt** | 15 region riêng biệt (8 builder × preset); hoàn thành màn → unlock kế, `enterLevel` build region mới + dispose region cũ; loading screen |
| 14 | Đủ 15 màn, mục tiêu/điều kiện/phần thưởng | **Đạt** | `web/src/data/levels.js` 15 định nghĩa (kill/waves/collect/reach/defend/boss kết hợp khác nhau); L01 hoàn thành thật: kill 3/3 + reach → rewards 80KN/40 vàng/2 băng; L15 → Victory screen |
| 15 | Nhiệm vụ & phe phái ảnh hưởng gameplay | **Đạt** | Q01 tự hoàn thành theo objective; 6 nhiệm vụ phụ; hostility matrix: bandit/ashigaru/ashura/shade/oni/castle địch, samurai đồng minh hỗ trợ, villager trung lập bỏ chạy, ronin trung lập đến khi khiêu chiến |
| 16 | Save/load giữ dữ liệu cần thiết | **Đạt** | Reload trang → "Tiếp Tục" → slot1: level 2, 142 vàng, tiến trình L01 completed + L02 unlocked khôi phục; server SQLite: `GET /api/saves` → slot1 (playtime 356s) |
| 17 | Xử lý lỗi tải tài nguyên/lưu/gameplay | **Đạt** | enterLevel try/catch → notify + về menu; save corrupt → bỏ qua; localStorage/server fallback lẫn nhau; `window.__errors` rỗng suốt phiên; payload save bị chặn nếu sai schema |
| 18 | Không có lỗi Python/JS/build chưa giải quyết | **Đạt** | Build sạch; 0 runtime errors qua mọi kịch bản kiểm thử; API test bằng curl 200/400/404 đúng |
| 19 | Các luồng gameplay chính đã kiểm thử | **Đạt** | E2E trong trình duyệt: menu→chơi mới→di chuyển→khóa→đánh→chết→hồi sinh→dọn màn→complete→màn tiếp→boss→pha→kill→victory→save→reload→continue; kịch bản block/parry/né đo số liệu |
| 20 | Hướng dẫn triển khai production & kiểm tra sau triển khai | **Đạt** | README §5 (uvicorn + reverse proxy HTTPS, cache, rollback bằng backup `samurai.db` + giữ dist cũ); đã xác minh bản bundle phục vụ qua FastAPI chính là bản chơi được |

## Chưa thể kiểm chứng / giới hạn minh bạch

- **60 FPS trên mọi thiết bị**: không tuyên bố. Trên máy thử nghiệm: 60 FPS, 4–13 ms frame
  ở mức "Cao". Mức "Thấp/Trung bình" giảm pixel ratio + tắt shadow (đã cài đặt trong Engine.setQuality).
- **Triệu hồi boss L15 đọc phaseIdx=0 tại một thời điểm đo**: L05 đã chứng minh chuyển pha + summons
  hoạt động (cùng class Boss); thời điểm đo L15 có thể rơi trước khi vòng update kịp chạy — không ảnh hưởng gameplay.
- **Đa người chơi / chống gian lận server**: ngoài phạm vi (game đơn người); server validate schema
  nhưng không verify gameplay — đã ghi rõ trong README §4.
- **Âm thanh trong nền IAB**: WebAudio cần gesture; đã gọi `ensure()` ở lần click menu đầu.
  Kiểm tra bằng tai trên trình duyệt thật — tự động hóa không đánh giá được chất lượng âm.
- **Mở khóa camera nhìn tự do 360° xoay cả thế giới**: camera orbit quanh nhân vật (chuẩn);
  không xoay thế giới (tránh phá vật lý/định hướng địa hình) — đúng yêu cầu §4.6.
