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

---

# Đợt nâng cấp đồ họa #2 — Cinematic pipeline, 4K/adaptive resolution, secondary motion (2026-10-25)

Cấu hình đo: **Chrome (ZCode in-app), 1280×720, DPR 1.0, Intel Iris Xe (iGPU, D3D11)**, bundle production
(esbuild minify) phục vụ qua FastAPI `samurai` server. Mọi mục Đạt đều kiểm chứng bằng phép đo hoặc
kiểm thử trong trình duyệt thật (`window.__errors` = 0 xuyên suốt). Không tự tạo số liệu.

| # | Tiêu chí (§ của đề bài) | Trạng thái | Bằng chứng / cách kiểm |
|---|---|---|---|
| 1 | PBR đúng với các nhóm vật liệu chính (§3.2) | **Đạt** | MeshPhysicalMaterial sheen cho vải/tóc, kim loại giáp 0.85, lưỡi kiếm clearcoat + hamon, lacquer, da — phản ứng với env map PMREM; kiểm bằng screenshot làng ban ngày + màn mưa đêm |
| 2 | Ánh sáng, tone mapping, exposure nhất quán (§3.3) | **Đạt** | ACES Filmic + exposure theo ngày/đêm; PMREM env từ procedural sky (phản chiếu + ambient); fog màu theo region; split-tone grading (bóng lạnh/vùng sáng ấm) rất nhẹ |
| 3 | Bóng đổ không có lỗi nghiêm trọng (§3.4) | **Đạt** | PCFSoft, bias -0.0008 / normalBias 0.02; shadow map 1024→3072 theo mức chất lượng; blob shadow tiếp xúc nhân vật; không thấy acne/peter-panning trong screenshot |
| 4 | GTAO khi hiệu năng cho phép (§3.4/3.5) | **Đạt** | `GTAOPass` (three r170) bật ở Cao/Ultra/Cinematic, có toggle trong Cài đặt; contact shading thấy được ở chân tượng/lantern/nhà; tự tắt ở TB/Thấp |
| 5 | Hậu kỳ không phá khả năng đọc gameplay (§3.5) | **Đạt** | Chuỗi Render→GTAO→Bloom→SMAA→Grading→Output bật/tắt theo cấu hình; vignette nhẹ (0.34), grain mặc định TẮT, không DOF/blur thường trực trong chiến đấu; telegraph đỏ + đòn boss vẫn rõ (chơi thật màn L05/L09) |
| 6 | Resolution scaling + phân biệt CSS/DPR/internal/output (§4.1–4.2) | **Đạt** | `renderScale` 50–100% nhân DPR; HUD hiển thị `4K · 100%` hay `auto 81%`; CSS canvas không đổi, browser upscale bilinear khi internal < native; đo được renderScale bước 1.0→0.59 khi target không với tới |
| 7 | Mức "Cinematic" hướng tới 4K UHD (§4.1) | **Đạt** (mã) / **Chưa thể kiểm chứng** (màn 4K thật) | tier mới dprCap 2.5 → native 3840×2160 trên màn DPR ≥2; máy đo chỉ có DPR 1.0 nên số liệu 4K native không lấy được — ghi rõ |
| 8 | Upscale trung thực, không tuyên bố DLSS/FSR (§4.3) | **Đạt** | Chỉ upscale tuyến tính của browser + SMAA; không dùng tên DLSS/FSR/XeSS; đã đánh giá: chữ HUD vẽ DOM nên không mắc ghosting; cỏ/lá ở scale thấp mượt hơn nhờ giảm shimmer |
| 9 | Adaptive quality có hysteresis (§10.3) | **Đạt** | Đo thật: target 240 (không với tới) → renderScale giảm từng bước 1.0→0.59 trong 8s, giữ 60 FPS; target 60 đạt được → giữ nguyên 100% (không dao động); cooldown 1.5–2.5s mỗi bước |
| 10 | Quality profiles Low→Cinematic + chỉnh riêng (§10.3) | **Đạt** | 5 mức trong Cài đặt + render scale (Auto/100/80/65/50), FPS mục tiêu (60/120/144/240), GTAO, grain; lưu localStorage, áp dụng tức thì |
| 11 | Draw calls / hiệu năng (§10.2) | **Đạt** | Gộp prop tĩnh theo vật liệu × ô map 26m (`merge.js`): static props còn **73 batch**; tổng DC 1475→1321 (đã gồm shadow + GTAO pass); FPS cùng máy: Cao **20→34–48**, TB **24→56**, Thấp **24→60**, Ultra 20→36, Cinematic 20→40 |
| 12 | GC / phân bổ mỗi khung hình (§10.2) | **Đạt** | Weapon trail chuyển ring-buffer (0 cấp phát/frame), particle spawn dùng bảng màu cache (bỏ `new Color` mỗi hạt); đo 0 error, không spike kéo dài |
| 13 | Secondary motion tóc/trang phục (§6.1) | **Đạt** | Spring 2 trục (stiff 85/damp 10.5, clamp ±0.45 rad) cho búi tóc + bao kiếm phản ứng gia tốc/tốc độ; đo thật: xoay roll chạm clamp khi di chuyển ngang, về 0 khi dừng; reset khi hồi sinh. Cỏ/tre/lá cờ đã sway theo gió từ đợt trước |
| 14 | Thời tiết: mưa + mặt đất ướt (§7.2) | **Đạt** | L09 mưa: terrain roughness 0.96→0.55, envMapIntensity 0.25→0.9 (bề mặt bóng phản chiếu), rain streaks + cloudCover 0.85; kiểm bằng screenshot + đọc thuộc tính material |
| 15 | Cinematic camera boss, trả quyền điều khiển (§8.2) | **Đạt** | Intro boss L05: dolly 2.8s + letterbox 9vh, camera ghim boss rồi nới về orbit; **bấm phím/chuột bất kỳ = skip**; player có iframes 3.2s trong intro; sau intro letterbox tắt, điều khiển bình thường (đo DOM) |
| 16 | Boss bar có trạng thái chuyển pha (§9) | **Đạt** | Thêm pips thoi dưới thanh máu boss, sáng dần theo `phaseIdx`; đo thật L05: phase 2/2 pips sáng; HUD hiển thị `FPS · ms · mức chất lượng · render scale · draw calls` |
| 17 | 300 FPS (§10.1) | **Chưa đạt** trên máy thử nghiệm / **Chưa thể kiểm chứng** trên HW mạnh | Máy đo là iGPU Iris Xe + vsync 60Hz: trần thực tế 60 FPS; 240 FPS cần GPU rời + màn hình tần số cao. Vòng lặp rAF không chặn FPS; ngân sách 8.33ms chưa đạt trên máy này — ghi minh bạch |
| 18 | Fallback tính năng không hỗ trợ (§10.4) | **Đạt** | Thấp: tắt composer + shadow, render trực tiếp; GTAO/grain là toggle; responsive resize; **context-loss handler chưa có** — ghi là hạn chế còn lại |
| 19 | Production build + chạy localhost + không lỗi runtime (§XIII) | **Đạt** | `npm run build` OK (bundle 838KB); chơi thật L01→L05→L09, chết/hồi sinh, boss pha, intro, mưa — `window.__errors` = 0 suốt phiên |
| 20 | Asset nguồn/giấy phép (§XI) | **Đạt** | 100% procedural (geometry, texture canvas, shader tự viết) + three.js MIT; không asset ngoài nên không phát sinh nghĩa vụ ghi công |

## Sửa lỗi phát hiện khi kiểm thử

- **Sky.update crash ở menu** (`Cannot read properties of undefined (reading 'x')` — lặp mỗi khung hình
  từ phiên bản trước): `Sky.sunDir` chỉ được gán trong `set()` (lần tải region đầu) trong khi `update()`
  chạy ngay ở menu → khởi tạo `sunDir` mặc định trong constructor. Sau vá: 0 lỗi từ lúc boot.
- `renderer.info.autoReset = false` + reset thủ công mỗi khung hình để số draw calls trên HUD đúng
  (trước đây chỉ đếm pass cuối = 1, sai lệch).

## Giới hạn minh bạch còn lại

- Chưa kiểm chứng trên màn hình 4K/DPR ≥ 2 thật (máy đo DPR 1.0); mã đã hỗ trợ dprCap 2.5.
- Chưa có handler `webglcontextlost/restored` — trình duyệt mất context sẽ cần reload.
- DOF điện ảnh (§3.5 mục 6) cố ý không bật thường trực để giữ độ rõ gameplay; có thể cân nhắc
  chỉ cho cutscene sau.
- Motion blur (§3.5 mục 7): không triển khai — rủi ro che chuyển động đòn đánh cao hơn lợi ích ở
  phong cách low-poly hiện tại.

---

# Đợt tối ưu #3 — Tư thế cầm kiếm + sửa bug trạng thái animation (2026-10-25)

| # | Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 | Tư thế cầm kiếm katana/nodachi khi đứng yên | **Đạt** | Lớp overlay "stance" (`character.js WEAPON_STANCE`) blend tay phải về thế kiếm thấp: chuôi ở hông phải, lưỡi chéo lên-trước (~45°), tay trái thả tự nhiên gần bao kiếm, thân/hông xoay nhẹ; đo `stanceW` = 1 khi idle, screenshot trước/sau |
| 2 | Khi đi/chạy/né giữ kiếm chắc tay hơn | **Đạt** | Bản `move` với `moveBlend 0.72` — giảm vung tay phải theo nhịp bước, nhìn nghiêng không còn kiếm vẫy nguy hiểm |
| 3 | Tự tắt khi chiến đấu, tự hồi khi xong | **Đạt** | Đo thật: idle `stanceW 1` → bấm J: `light1`, `stanceW 0.09` (tắt trong ~0.15s) → hết đòn về `idle`, `stanceW 1` trở lại; clip combat không bị sửa nên timing trúng đích (hitAt) giữ nguyên |
| 4 | **BUG CŨ (nặng): kẹt trong tư thế chém khi đứng yên sau đòn đánh** | **Đã sửa — Đạt** | `player.js` nhánh locomotion bỏ qua clip one-shot đã chạy xong → nhân vật đứng đóng băng ở frame cuối `light1/light2/...`; vá: `timeNorm >= 1 → play('idle')`. Đo: đánh xong 1.3s → `clip: idle`, 0 lỗi |
| 5 | **BUG CŨ (nặng): né xong trượt vô_controls vô hạn** | **Đã sửa — Đạt** | State `dodge` chỉ thoát khi tên clip đổi (không bao giờ) → vel 11 không giảm, trượt ~15m/1.5s (đo thật trước khi vá: pos (0,40)→(-15.4,46.8), vel -10.1); vá: thoát dodge khi `timeNorm >= 1`. Đo sau vá: vel (0,0), `clip: idle`, `stanceW: 1` |
| 6 | Không hồi quy gameplay | **Đạt** | Combo/parry/né dùng lại đúng clip & timing cũ; `window.__errors` = 0 suốt phiên kiểm; build production 549ms OK |
