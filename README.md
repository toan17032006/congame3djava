# Đạo Của Kẻ Vô Danh — Samurai 3D Action RPG

Game samurai 3D Action RPG (Action RPG + Soulslike + Hack-and-slash + Survival) chạy trên web,
xây bằng **Three.js** (frontend) và **FastAPI + SQLite** (backend). 15 màn chơi, 5 boss nhiều pha,
chiến đấu soulslike (stamina, né, đỡ, parry), AI NPC theo phe phái, chế tạo, kỹ năng, save/load.

> Toàn bộ mô hình, hoạt ảnh, âm thanh và hiệu ứng đều là **procedural** (sinh bằng mã) —
> dự án không cần tải asset ngoài nào và không kèm tài nguyên có bản quyền.

---

## 1. Chạy nhanh

```bash
# 1) Backend (Python 3.10+)
pip install -r requirements.txt
pip install -e .            # tạo lệnh CLI `samurai`

# 2) Frontend build (Node 18+)
npm install
npm run build               # bundle -> web/dist/

# 3) Chơi
samurai serve               # mở http://127.0.0.1:8000 tự động trong trình duyệt
```

Biến thể lệnh:

| Lệnh | Ý nghĩa |
|---|---|
| `samurai serve` | Chạy backend + client, tự mở trình duyệt |
| `samurai serve --port 9000` | Chọn cổng (tự dò cổng trống nếu bận) |
| `samurai serve --no-browser` | Không tự mở trình duyệt |
| `samurai serve --reload` | Dev: tự nạp lại backend khi sửa Python |
| `python -m server serve` | Tương đương `samurai serve` khi chưa cài `pip install -e .` |
| `npm run build:watch` | Dev: bundle lại tự động khi sửa JS |

Nếu `web/dist` chưa được build, server vẫn phục vụ `web/index.html` (báo lỗi thiếu bundle) —
hãy chạy `npm run build` trước. Database SQLite (`samurai.db`) **tự tạo lần đầu chạy**.

## 2. Kiến trúc

```
game3dconbo/
├── server/                 # Backend FastAPI
│   ├── main.py             # App: static client + REST save API
│   ├── db.py               # SQLite (tự tạo schema, validate payload, WAL)
│   └── cli.py              # CLI `samurai serve` (dò cổng, mở browser)
├── web/
│   ├── index.html
│   ├── dist/               # Kết quả build (bundle.js/css + index.html)
│   └── src/
│       ├── main.js         # Entry
│       ├── game.js         # Orchestrator: hệ thống, state, vòng lặp chính
│       ├── core/           # engine (renderer/loop/quality), input (rebindable,
│       │                   #  chặn key-repeat), cameraRig (1st/3rd, lock-on,
│       │                   #  collision clamp, shake), utils (noise fbm, rng seed)
│       ├── data/           # Dữ liệu tách khỏi mã: items, skills, enemies,
│       │                   # bosses, recipes, quests, levels (15), regions, keys
│       ├── gfx/            # humanoid (rig procedural), animator + clips
│       │                   # (state machine pose-clip có blending & events),
│       │                   # terrain, props (instancing), particles/weather,
│       │                   # vfx (slash arc, telegraph, damage popup), sky, audio
│       ├── entities/       # player, npc (FSM AI), boss (pha/telegraph/summon),
│       │                   # interactable (node/đài/rương/cổng/thương nhân)
│       ├── systems/        # combat (hit-detection arc/AoE, parry, projectiles),
│       │                   # world (builder 8 kiểu địa hình + colliders),
│       │                   # levelManager (15 màn: spawn/wave/objective/reward),
│       │                   # progression, inventory, crafting, quests,
│       │                   # factions, saveSystem
│       └── ui/             # HUD, panels (túi đồ/kỹ năng/chế tạo/nhiệm vụ/bản đồ/
│                           # shop), screens (menu/loading/pause/death/...), styles
├── pyproject.toml          # console script: samurai
├── requirements.txt        # fastapi, uvicorn
└── build.mjs               # esbuild bundler
```

Nguyên tắc: gameplay/rendering/AI/dữ liệu/UI tách module; dữ liệu cân bằng nằm ở `web/src/data/*`;
không phụ thuộc vòng (mỗi tầng chỉ import xuống dưới); vật lý đơn giản tự viết
(heightfield + collider tròn) thay vì kéo engine vật lý ngoài.

## 3. Điều khiển

| Phím | Hành động |
|---|---|
| W / A / S / D | Di chuyển theo hướng camera |
| Shift | Sprint (tốn khí lực) |
| Space | Nhảy |
| J | Đòn nhanh (combo đến 3–4 nhánh theo vũ khí) |
| K | Đòn mạnh (sát thương lớn, phá đỡ) |
| L (giữ) | Đỡ đòn; **nhấn đúng thời điểm** = Parry → địch mất thăng bằng, đòn kế x2 |
| I | Né / lăn (bất khả xâm phạm ngắn, tối đa 2 lần liên tiếp) |
| U | Kỹ năng đặc biệt (gán ở cây kỹ năng — mặc định Nhất Đao Trảm) |
| C | Khóa / mở khóa mục tiêu |
| V | Đổi góc nhìn thứ nhất ↔ thứ ba |
| E | Tương tác (tài nguyên, đài hồi sinh, rương, thương nhân) |
| Tab / T / Q / M | Túi đồ / Kỹ năng / Nhiệm vụ / Bản đồ |
| Esc | Tạm dừng · đóng panel |
| Chuột | Nhìn quanh (khóa con trỏ) · lăn = zoom |

Khi mở panel hoặc tạm dừng, mô phỏng game tạm dừng và input không còn tác động lên nhân vật.
Phím có thể rebind qua `web/src/data/keys.js` (Input.rebind hỗ trợ runtime).

## 4. Save & backend

- Save schema versioned (v1) gồm: meta, player (level/xp/attrs/skills/equip/inventory), progress (màn, nhiệm vụ).
- Lưu **cục bộ (localStorage)** + đồng bộ lên server `POST /api/saves/{slot}` vào SQLite.
- Server validate: tên slot, kích thước ≤2MB, kiểu dữ liệu, key bắt buộc — dữ liệu client
  **không được tin tưởng tuyệt đối** (game đơn người nên client là nguồn sự thật; server chỉ chặn payload rác).
- API: `GET /api/health` · `GET/POST/DELETE /api/saves/{slot}` · `GET /api/saves`.
- Đài hồi sinh trong game (nhấn E) = hồi đầy + lưu ngay.

## 5. Build production & triển khai

```bash
npm run build              # minify -> web/dist/
# chạy server production (ví dụ):
uvicorn server.main:app --host 0.0.0.0 --port 8000
```

Khuyến nghị deploy:
- Đặt nginx/Caddy phía trước,终止 HTTPS, proxy về uvicorn (socket unix), cache
  `web/dist/*` dài hạn (bundle có tên cố định — bump version khi release).
- Rollback: giữ lại bản `web/dist` + image/code trước đó; backend không stateful ngoài
  `samurai.db` — backup file `samurai.db` (SQLite) định kỳ là đủ.
- Không có bí mật nào trong frontend (không key, không token); API save không yêu cầu auth
  vì game đơn người cục bộ — nếu mở public, thêm rate-limit ở reverse proxy.

## 6. Tài nguyên & giấy phép

- Mã nguồn dự án: viết mới trong repo này.
- `three` (MIT), `esbuild` (MIT), FastAPI/uvicorn (MIT/BSD) — npm/pip tự tải theo license riêng.
- Mọi mesh/animation/texture canvas/âm thanh WebAudio: **procedural, tự tạo**, không bản quyền ngoài.

## 7. Giới hạn đã biết

- Nhân vật/cảnh là low-poly cách điệu (procedural), không thay thế được asset AAA.
- Camera góc thứ nhất ẩn thân nhân vật (chuẩn web game nhỏ).
- Vật lý: heightfield + collider tròn (không có ragdoll/dịch chuyển vật lý phức tạp).
- Server không chống gian lận (client-authoritative) — phù hợp game đơn người.
- Âm nhạc nền là koto procedural đơn giản; không có voice/dialogue.
