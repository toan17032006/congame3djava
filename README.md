# Đạo Của Kẻ Vô Danh — Samurai 3D (bản LibGDX)

Game samurai hành động góc nhìn thứ nhất, viết bằng **Java + LibGDX 1.12.1 (backend LWJGL3)**.
Đồ họa 3D trong bản này là **3D thật**: camera phối cảnh góc nhìn thứ nhất
(`PerspectiveCamera`), tường, cây, cổng Torii, đài hồi sinh, địch và vật phẩm đều là
mô hình 3D vẽ bằng `ModelBatch`, có ánh sáng môi trường và ánh sáng hướng, có
head-bob khi di chuyển và bản đồ mini góc phải trên. Theo đúng hướng của bản web
Three.js gốc (vốn cũng dùng đồ họa procedural, không dùng file ảnh/âm thanh ngoài),
bản này thêm: **texture procedural** (đá, đất, cỏ, gỗ, vải dệt, kim loại),
**rig humanoid chi tiết với animation** (đi, đứng thở, giơ kiếm, chém, choáng, ngã,
kiếm góc nhìn thứ nhất, hạt văng khi trúng đòn, cỏ lay động, mặt trời/mây/sao),
và **nhạc nền + hiệu ứng âm thanh tổng hợp** (koto pentatonic, trống taiko, gió,
tiếng chém/đỡ/parry/nhặt đồ…). Không cần file ảnh hay file nhạc ngoài nào.

> Lịch sử của repo: trước đây repo là game web Three.js + server Python (15 màn, 5 boss,
> cây kỹ năng, phe phái, cửa hàng…). Sau đó repo được viết lại thành game Java thuần Swing
> raycasting 2,5D (8 chương, 5 boss). Bản hiện tại **nâng cấp bản Swing đó lên LibGDX 3D thật**,
> giữ nguyên toàn bộ luật chơi, bản đồ, địch, boss, nhiệm vụ, chế tạo, lên cấp và file lưu
> của bản Swing, chỉ thay phần hiển thị và input bằng LibGDX. Bản Swing cũ vẫn còn trong
> lịch sử git ở commit `80555ad`, bản web gốc còn ở commit `ec46715`, nếu bạn muốn xem lại.

## 0. Cách chạy nhanh nhất (đọc trước khi chạy)

### Windows (cách dễ nhất: nhấp đúp)

1. **Cài JDK 17 trở lên** nếu máy chưa có. Tải Temurin miễn phí tại
   https://adoptium.net/ , chọn JDK 17 (hoặc mới hơn), cài đặt bình thường.
   Kiểm tra bằng cách mở PowerShell và gõ `java -version` — phải hiện
   `17` trở lên, không được báo lỗi.
2. **Tải game về máy** bằng một trong hai cách:
   - Dùng git: mở PowerShell, gõ
     `git clone https://github.com/toan17032006/congame3djava.git`
   - Không dùng git: vào trang GitHub của repo, bấm nút xanh **Code** →
     **Download ZIP**, giải nén ra một thư mục.
3. **Vào thư mục game** (thư mục chứa file `run.bat` và `gradlew.bat`),
   **nhấp đúp file `run.bat`**. Cửa sổ game sẽ mở sau khi tải xong.
   - Nếu thích gõ lệnh thay vì nhấp đúp: mở PowerShell **tại thư mục game**
     (gõ `cd` tới thư mục đó, hoặc Shift + chuột phải → Open PowerShell here),
     rồi gõ `.\run.bat` hoặc `.\gradlew.bat run`.
   - **Lần đầu tiên** cần mạng và có thể mất vài phút vì Gradle sẽ tải
     Gradle 8.5 và LibGDX 1.12.1 về máy. Đừng tắt cửa sổ trong lúc tải.
     Các lần sau chạy nhanh hơn vì đã có cache.
4. Ở menu chính: **Enter** chơi mới, **L** tiếp tục từ file lưu (nếu có),
   **Esc** thoát game.

### Linux / macOS

1. Cài JDK 17 trở lên (ví dụ: `sudo apt install openjdk-17-jdk` trên Ubuntu,
   hoặc Temurin tại https://adoptium.net/ ).
2. Tải game như trên (`git clone` hoặc Download ZIP rồi giải nén).
3. Vào thư mục game, gõ:
   ```bash
   chmod +x run.sh
   ./run.sh
   ```
   hoặc trực tiếp `./gradlew run`.

### Nếu gặp lỗi

| Lỗi / hiện tượng | Cách sửa |
| --- | --- |
| `java` is not recognized / không tìm thấy Java | Chưa cài JDK, hoặc cài xong chưa mở lại PowerShell. Cài JDK 17+ rồi mở lại cửa sổ lệnh và gõ `java -version` để kiểm tra. |
| `gradlew` is not recognized / không tìm thấy file | Bạn đang đứng sai thư mục. Phải đứng ở thư mục gốc của repo (thư mục chứa `run.bat`, `gradlew.bat`, `README.md`), không phải trong `src` hay trong thư mục con khác. |
| Tải Gradle/LibGDX rất lâu, hoặc báo lỗi mạng | Lần đầu cần mạng. Kiểm tra mạng, chờ thêm, rồi chạy lại lệnh — Gradle sẽ tiếp tục từ chỗ đã tải, không tải lại từ đầu. |
| Cửa sổ game đen một lúc rồi mới hiện menu | Bình thường ở lần đầu: game đang tạo nhạc và tải font. Chờ vài giây, đừng tắt. |
| Cảnh báo ALSA / không có tiếng | Chỉ xảy ra trên máy không có card âm thanh (ví dụ máy ảo). Trên máy Windows bình thường sẽ có tiếng, bấm **F6** để bật/tắt nhạc. |
| Không thấy file lưu cũ | File lưu là `samurai_save.txt`, nằm trong cùng thư mục bạn chạy game (thư mục làm việc khi gõ lệnh). Nếu bạn chạy từ thư mục khác, game sẽ không thấy file lưu cũ. Hãy chạy từ thư mục gốc của repo. |
| Lỗi cũ `vn.samurai.Main` không tìm thấy | Đó là lệnh của bản Swing cũ, đã bỏ. Bản hiện tại chạy bằng Gradle, class chính là `vn.samurai.gdx.DesktopLauncher`, bạn không cần gõ `java` thủ công. |

### Chạy nhanh bằng lệnh (tóm tắt)

- Windows (PowerShell, tại thư mục game): `.\gradlew.bat run`
- Linux/macOS (tại thư mục game): `./gradlew run`
- Hoặc nhấp đúp `run.bat` (Windows) / chạy `./run.sh` (Linux/macOS).

## 1. Yêu cầu

- JDK 17 trở lên (đã kiểm tra với JDK 17.0.21).
- Không cần cài Gradle trước: repo đã có sẵn `gradlew` / `gradlew.bat` (Gradle Wrapper 8.5),
  lần chạy đầu tiên Wrapper sẽ tự tải Gradle 8.5 và Gradle sẽ tự tải LibGDX 1.12.1
  (gdx, gdx-backend-lwjgl3, gdx-freetype và LWJGL) từ Maven Central, nên lần đầu cần
  mạng và có thể mất vài phút. Các lần sau chạy nhanh hơn vì đã có cache.
- Chạy trên Windows, Linux và macOS. Game lưu tiến trình vào file `samurai_save.txt`
  trong thư mục đang chạy game.

## 2. Cách chạy

### Windows (PowerShell hoặc Command Prompt, đứng ở thư mục gốc của repo)

```bat
gradlew.bat run
```

### Linux / macOS (đứng ở thư mục gốc của repo)

```bash
./gradlew run
```

Class chính là `vn.samurai.gdx.DesktopLauncher`, nhưng bạn không cần gõ `java` thủ công:
Gradle sẽ biên dịch và chạy đúng class đó. Đừng dùng lại lệnh cũ
`javac ...` + `java -cp out vn.samurai.Main`, vì class `vn.samurai.Main` (bản Swing)
đã được thay bằng bản LibGDX và không còn tồn tại nữa.

Nếu Gradle báo lỗi tải dependency, hãy kiểm tra mạng rồi chạy lại lệnh trên
(Gradle sẽ tiếp tục từ chỗ đã tải, không cần tải lại từ đầu).

Ở menu chính:

- **Enter**: chơi mới từ chương 1.
- **L**: tiếp tục từ file lưu `samurai_save.txt` (nếu có).
- **Esc ở menu**: thoát game.

## 3. Điều khiển

| Phím | Hành động |
| --- | --- |
| W / S | Tiến / lùi |
| A / D | Xoay trái / phải |
| ↑ / ↓ / ← / → | Tiến / lùi / xoay trái / xoay phải (phím mũi tên, thay thế WASD) |
| Q / E | Lách sang trái / phải |
| Shift (giữ) | Chạy nhanh, tốn khí lực |
| J | Đánh nhẹ |
| K | Đánh mạnh |
| U | Kỹ năng đặc biệt: Nhất Đao Trảm |
| L (giữ) | Đỡ đòn. **Nhấn L đúng lúc đòn địch chạm tới (trong 0,25 giây) = Parry** |
| I | Né (lao về trước, bất khả xâm phạm 0,4 giây) |
| F | Nói chuyện với NPC gần đó (dân làng/đồng minh) hoặc tương tác đài hồi sinh khi đứng gần đài |
| 1 | Dùng băng gạc (hồi 30 máu) |
| 2 | Dùng thuốc hồi máu (hồi 60 máu) |
| C | Chế tạo (xem mục 6) |
| Tab | Mở / đóng túi đồ (game tạm dừng khi mở túi đồ) |
| Esc | Tạm dừng / tiếp tục |
| F5 | Lưu game ngay lập tức |
| F6 | Bật / tắt nhạc nền và tiếng gió |
| O | Mở / đóng cây kỹ năng (game tạm dừng) |
| B | Mở / đóng cửa hàng (game tạm dừng) |
| Y | Cuồng Phong Trảm (cần học, xem mục 5.9) |
| T | Tốc Ảnh (cần học, xem mục 5.9) |
| G | Thân Bất Hoại (cần học, xem mục 5.9) |
| N | Sang màn tiếp (chỉ ở màn hình hoàn thành màn) |
| R | Chơi lại màn (chỉ ở màn hình gục ngã) |
| M | Về menu (ở màn tạm dừng, gục ngã, hoàn thành màn, chiến thắng) |

## 4. Cách chơi tổng quan

1. Ở menu, bấm Enter để chơi mới.
2. Nhiệm vụ của màn hiện tại luôn hiện ở góc trái trên, dạng `[ ] Tên nhiệm vụ (tiến độ/tổng)`.
   Nhiệm vụ xong sẽ chuyển thành `[x]`.
3. Di chuyển trong mê cung, đánh địch, nhặt vật phẩm. Khi tất cả nhiệm vụ xong:
   - Nếu màn có nhiệm vụ “Đến cổng”, hãy đi đến **cổng Torii màu đỏ** để qua màn.
   - Nếu màn chỉ có nhiệm vụ đánh boss / giết địch / thu thập (không có nhiệm vụ đến cổng),
     màn sẽ tự hoàn thành ngay khi xong nhiệm vụ.
4. Ở màn hình hoàn thành, bấm **N** để sang màn tiếp. Game tự lưu sau mỗi màn.
5. Hết máu (HP = 0) sẽ vào màn hình gục ngã, bấm **R** để chơi lại màn đó với đầy máu,
   giữ nguyên cấp độ, kinh nghiệm, vàng và túi đồ trước khi vào màn.
6. Hạ Yamikage ở chương cuối sẽ vào màn hình chiến thắng.

## 5. Toàn bộ chức năng

### 5.1. Di chuyển, góc nhìn và bản đồ

- **Góc nhìn thứ nhất 3D thật (LibGDX)**: camera phối cảnh 67 độ đặt ở độ cao 1,6 ô,
  nhìn theo hướng người chơi. Tường là khối hộp có texture đá (gạch + vân),
  cây có thân gỗ + tán nón texture lá, mặt đất mỗi ô có texture đất + cỏ,
  cổng Torii là 2 cột + 2 xà gỗ đỏ, đài hồi sinh là khối đá + quả cầu sáng,
  địch là rig humanoid chi tiết (xem 5.2b), đạn là quả cầu bay.
  Ánh sáng gồm ánh sáng môi trường + ánh sáng hướng, nên mặt sáng/mặt tối của
  khối 3D khác nhau theo hướng. Khi di chuyển, camera có head-bob nhẹ.
- **Bầu trời**: mặt trời, 8 đám mây trôi quanh người chơi, và sao (chỉ ở các màn
  tối như Mạc Phủ Bóng Tối) — tương tự sky gradient + mây + sao của bản web.
- **Cỏ lay động**: cỏ mọc ngẫu nhiên trên các ô sàn, đung đưa theo gió
  (sin theo thời gian, mỗi bụi cỏ lệch pha khác nhau).
- **Va chạm**: người chơi và địch không đi xuyên tường. Di chuyển thử theo từng trục X rồi Y,
  nên khi đi chéo vào góc tường sẽ trượt dọc tường thay vì bị kẹt.
- **Bản đồ mini (góc phải trên)**: tường trắng, cây xanh lá, người chơi là chấm vàng,
  địch là chấm cam (boss đỏ), cổng Torii vàng, đài hồi sinh xanh dương, vật phẩm xanh lá.
- **Đài hồi sinh**: biểu tượng xanh dương trong màn. Đứng gần (dưới 1,2 ô) và bấm **F** để
  hồi đầy máu, hồi đầy khí lực và lưu game ngay lập tức.

### 5.2. Chiến đấu theo kiểu soulslike

- **Khí lực (Stamina, tối đa 100)**: đánh, chạy nhanh, né và đỡ đều tốn khí lực.
  Khí lực hồi 25/giây sau 0,8 giây không dùng khí lực. Hết khí lực thì không đánh/né được.
- **Đánh nhẹ (J)**: tốn 12 khí lực, tầm 2,2 ô, sát thương = sát thương kiếm, thời gian ra đòn 0,35 giây.
- **Đánh mạnh (K)**: tốn 25 khí lực, tầm 2,6 ô, sát thương = sát thương kiếm + 12, thời gian 0,7 giây.
- **Nhất Đao Trảm (U)**: tốn 35 khí lực, tầm 3,4 ô, góc đánh rộng, sát thương = sát thương kiếm × 2 + 14,
  hồi chiêu 5 giây.
- **Combo và chí mạng**: mỗi đòn có 10% chí mạng (sát thương × 1,5). Sát thương thực tế
  = sát thương gốc − giáp của địch, tối thiểu 1.
- **Đỡ (giữ L)**: đòn địch trúng khi đang đỡ chỉ mất 1/10 sát thương và tốn 8 khí lực.
- **Parry**: nếu bạn bắt đầu giữ L trong 0,25 giây trước khi đòn địch chạm tới, địch bị choáng
  1,5 giây và đòn kế tiếp của bạn được **×2 sát thương**. Đây là cách hiệu quả nhất để hạ
  Ronin và boss vốn có tỉ lệ đỡ/né cao.
- **Né (I)**: tốn 20 khí lực, lao về trước 1,2 ô, bất khả xâm phạm 0,4 giây, hồi chiêu 0,8 giây.
  Đòn địch chạm tới trong lúc né sẽ không gây sát thương và hiện “Né thành công”.
- **Đòn của địch có báo trước (telegraph)**: trước khi chém, địch vào trạng thái giơ vũ khí
  trong 0,5 giây và được viền đỏ. Đó là lúc để né hoặc parry, đừng đứng yên chịu đòn.
- **Vết chém trên màn hình**: khi đánh, màn hình hiện vòng cung kiếm ở giữa;
  khi bị thương, màn hình chớp đỏ. Bản LibGDX không dùng tiếng bíp của AWT nữa,
  vì game không còn phụ thuộc vào AWT.

### 5.2b. Animation humanoid chi tiết (như bản web)

Rig địch gồm: thân kimono (texture vải, màu theo loại địch), đai obi đỏ, đầu,
tóc + búi tóc samurai (topknot), 2 tay, 2 chân, kiếm (lưỡi kim loại + chắn tay),
và bóng đổ tròn dưới chân. Boss có thêm hào quang đỏ nhấp nháy khi nổi giận
(dưới 30% máu).

- **Đứng yên (Idle)**: thở nhẹ (thân nhún theo sin), tay đung đưa nhẹ, đầu hơi nghiêng.
- **Đi đuổi (Chase)**: chân trái/phải vung ngược pha nhau, tay vung ngược với chân,
  thân nhún theo nhịp bước, giống clip walk 0,95 giây của bản web.
- **Giơ kiếm (Windup, 0,5 giây)**: tay phải giơ kiếm lên cao ra sau, thân ngả ra sau,
  kèm viền đỏ nhấp nháy — đây là báo trước đòn đánh, như bản web.
- **Chém (Cooldown)**: tay phải quạt kiếm xuống rồi trở về tư thế nghỉ theo thời gian
  hồi chiêu.
- **Choáng (Stun, sau parry)**: thân ngả ra sau, đầu ngả, tay dang ra, rung nhẹ.
- **Ngã chết**: trong 0,8 giây sau khi hạ, địch ngã ngửa ra đất rồi mới biến mất,
  kèm hạt văng.
- **Kiếm góc nhìn thứ nhất của bạn**: katana hiện ở góc dưới phải màn hình, nhún
  theo bước chân, vung lên/chém xuống khi bạn bấm J/K/U, và đưa ra giữa dựng đứng
  khi bạn giữ L để đỡ.
- **Humanoid v2**: thêm giáp ngực kim loại (chỉ boss, Quỷ khiên thủ và Bạo đồ mới
  có, như bản web bật/tắt giáp theo trang bị), vai giáp, cổ áo kimono chữ V màu
  trắng, dây sash, hakama, bao chân, dép, mắt, mũi, vỏ kiếm saya đeo sau lưng,
  và lưỡi kiếm có đường hamon trắng. Ánh sáng cũng đổi theo màn: màn tối
  (như Mạc Phủ Bóng Tối) sẽ tối hơn, màn ngày sáng hơn. Màn hình có thêm
  vignette tối ở viền và chớp đỏ nhấp nháy khi máu dưới 30%.
- **Hạt văng (particles)**: khi trúng đòn, nhặt đồ, hạ địch, parry, qua màn… sẽ có
  các hạt cầu nhỏ bay ra, rơi xuống theo trọng lực và nhỏ dần rồi biến mất.

### 5.2c. Nhạc nền và âm thanh (tổng hợp, như bản web)

Bản web gốc không dùng file nhạc nào mà tổng hợp bằng WebAudio. Bản LibGDX làm
tương tự bằng Java: lần chạy đầu tiên game tự tạo các file WAV trong thư mục
`audio/` (đã có trong `.gitignore`, không commit lên repo), rồi phát bằng LibGDX.

- **Nhạc nền**: vòng lặp 23,2 giây, thang pentatonic D
  [220, 247,5, 293,33, 329,63, 392, 440, 493,88 Hz], tiếng đàn koto (triangle +
  harmonic sine, decay dài), mỗi 1,45 giây một nốt, bass mỗi 4 nốt, trống taiko
  (sine 90 → 40 Hz) mỗi 2 nốt. Bấm **F6** để bật/tắt nhạc nền (và cả tiếng gió).
- **Tiếng gió nền**: nhiễu lọc thấp ~380 Hz, vòng lặp 6 giây, biên độ lên xuống
  chậm theo LFO 0,13 Hz như bản web.
- **Hiệu ứng (SFX)**: chém nhẹ/nặng, trúng đòn nhẹ/nặng, đỡ, parry, clang,
  né, bước chân (mỗi 0,4 giây khi di chuyển), nhặt đồ, vàng, lên cấp, nhiệm vụ,
  chết, boss gầm, tên, lửa, thud, hồi máu, qua cổng, bấm menu, chế tạo, mở khóa.
  Nếu máy không có thiết bị âm thanh, game vẫn chạy bình thường nhưng không có tiếng.

### 5.3. Địch và AI

- Địch chỉ phát hiện bạn khi bạn ở trong tầm nhìn và không bị tường chắn
  (kiểm tra đường thẳng giữa địch và bạn có vướng tường hay không).
- Khi phát hiện, địch đuổi theo bạn; khi vào tầm đánh, địch giơ vũ khí 0,5 giây rồi mới chém.
  Sau mỗi đòn, địch nghỉ theo thời gian hồi chiêu riêng.
- **Cung thủ và địch dùng đòn xa** (Cung thủ, Tín đồ Tu La, Hi no Ou, Yamikage) sẽ bắn
  đạn bay về phía bạn khi bạn trong tầm và nhìn thấy được. Đạn bay sẽ biến mất khi chạm tường;
  né hoặc đỡ vẫn giảm/tránh được sát thương của đạn.
- **Đỡ và né của địch**: Ronin, Vong linh, Bóng kiếm và một số boss có tỉ lệ đỡ đòn
  (đòn của bạn chỉ còn 1/5 sát thương) và tỉ lệ né đòn (đòn của bạn trượt hoàn toàn).
  Với địch hay đỡ, hãy dùng đánh mạnh, parry hoặc Nhất Đao Trảm thay vì chém nhẹ liên tục.
- **Rơi đồ**: địch thường có 30% rơi băng gạc tại chỗ khi chết; boss rơi thuốc hồi máu.

| Địch | Máu | Tấn công | Giáp | Tốc độ | Đặc điểm |
| --- | --- | --- | --- | --- | --- |
| Sơn tặc | 45 | 9 | 2 | 2,2 | Địch cơ bản, cận chiến |
| Cung thủ | 35 | 11 | 1 | 2,3 | Bắn đạn xa, tầm 10 ô |
| Bạo đồ | 110 | 17 | 5 | 1,8 | Chậm, khỏe, chém mạnh |
| Vong linh | 55 | 16 | 4 | 3,2 | Nhanh, tỉ lệ né 25% |
| Ronin du thủ | 95 | 18 | 8 | 2,6 | Đỡ 30%, né 20% |
| Tín đồ Tu La | 120 | 16 | 6 | 2,5 | Bắn đạn lửa từ xa |
| Quỷ khiên thủ | 220 | 20 | 14 | 1,9 | Rất trâu, giáp cao |
| Bóng kiếm | 110 | 18 | 6 | 3,0 | Đỡ 20%, né 30%, đòn bóng tối |

Các chỉ số trên là chỉ số đã cân bằng lại cho bản Java (không sao chép nguyên xi
chỉ số gốc của bản web, vì máu người chơi và nhịp đánh trong bản Java khác).

### 5.4. Boss và chuyển pha

Boss có thanh máu riêng ở giữa phía trên màn hình. Khi máu boss xuống dưới 60%,
boss **chuyển pha**: triệu hồi 2 tay chân và (ở một số boss) tăng tốc. Khi máu xuống
dưới 30%, boss **nổi giận**: tốc độ × 1,2 và tấn công × 1,2. Hạ boss xong vẫn phải
hoàn thành các nhiệm vụ còn lại của màn (nếu có) rồi mới qua màn.

| Boss | Máu | Tấn công | Giáp | Triệu hồi ở pha 2 |
| --- | --- | --- | --- | --- |
| Kurogane - Vua Sơn Tặc (chương 4) | 300 | 18 | 6 | 2 Sơn tặc |
| Kagemune - Kiếm Khách Bóng (chương 5) | 350 | 20 | 8 | 2 Ronin |
| Hi no Ou - Vua Tu La (chương 6) | 400 | 22 | 10 | 2 Tín đồ Tu La, bắn đạn lửa |
| Gashadokuro - Tướng Quỷ (chương 7) | 450 | 24 | 14 | 2 Quỷ khiên thủ |
| Yamikage - Mạc Phủ Bóng Tối (chương 8, boss cuối) | 500 | 24 | 12 | 2 Bóng kiếm, bắn đạn bóng tối |

### 5.5. Màn chơi và nhiệm vụ

| Chương | Tên màn | Nhiệm vụ | Thưởng khi qua màn |
| --- | --- | --- | --- |
| 1 | Bờ Rào Sương Mù | Trừ khử sơn tặc (3); Đến cổng làng Hạc Bạch | 80 XP, 40 vàng |
| 2 | Làng Hạc Bạch | Hạ bạo đồ chỉ huy (1); Đánh tan sơn tặc (3) | 150 XP, 80 vàng |
| 3 | Rừng Tre Mật | Chặt tre già (5); Tiêu diệt vong linh (3) | 200 XP, 100 vàng |
| 4 | Đền Hoang | Dọn sơn tặc giữ đền (2); Hạ Kurogane | 420 XP, 250 vàng |
| 5 | Sân Đấu Ronin | Đấu đơn với ronin (2); Hạ Kagemune | 620 XP, 400 vàng |
| 6 | Sườn Núi Tu La | Hạ tín đồ Tu La (2); Khai quặng sắt (3); Hạ Hi no Ou | 900 XP, 600 vàng |
| 7 | Thành Bóng Tối | Hạ quỷ khiên thủ (1); Hạ Gashadokuro | 1300 XP, 850 vàng |
| 8 | Mạc Phủ Bóng Tối | Hạ bóng kiếm (2); Hạ Yamikage | 2200 XP, 1500 vàng, màn hình chiến thắng |

Nhiệm vụ “giết” chỉ tính khi chính bạn hạ đúng loại địch đó. Nhiệm vụ “thu thập”
chỉ tính khi bạn đi qua và nhặt đúng vật phẩm đó (tre, quặng sắt). Nhiệm vụ “đến cổng”
chỉ tính khi bạn đứng gần cổng Torii sau khi các nhiệm vụ khác đã xong; nếu chưa xong,
game sẽ hiện danh sách nhiệm vụ còn thiếu thay vì cho qua màn.

### 5.6. Vật phẩm, túi đồ và chế tạo

Đi qua vật phẩm là nhặt được ngay (trừ đài hồi sinh và cổng Torii cần tương tác/đến gần
theo cách riêng ở trên). Bấm **Tab** để xem túi đồ.

| Vật phẩm | Cách có | Tác dụng |
| --- | --- | --- |
| Băng gạc | Nhặt trong màn, địch rơi, chế tạo | Bấm 1: hồi 30 máu |
| Thuốc hồi máu | Nhặt trong màn, boss rơi | Bấm 2: hồi 60 máu |
| Tre | Nhặt trong màn (chủ yếu chương 3) | Nguyên liệu chế tạo băng gạc; tính cho nhiệm vụ chương 3 |
| Thảo dược | Nhặt trong màn | Nguyên liệu chế tạo băng gạc |
| Quặng sắt | Nhặt trong màn (chủ yếu chương 6) | Nguyên liệu rèn kiếm; tính cho nhiệm vụ chương 6 |
| Vàng | Hạ địch, thưởng qua màn | Chỉ hiển thị và tích lũy trong bản Java này (chưa có cửa hàng mua bán) |
| Kiếm | Bắt đầu ở cấp 1 | Tăng sát thương khi lên cấp và khi rèn |

**Chế tạo (bấm C):**

- **2 tre + 1 thảo dược → 1 băng gạc.**
- Nếu không đủ nguyên liệu làm băng gạc nhưng có **3 quặng sắt → rèn kiếm**:
  kiếm lên 1 cấp, sát thương +5, tiêu 3 quặng sắt.
- Nếu không đủ cả hai, game sẽ hiện công thức cần thiết. Chế tạo ưu tiên băng gạc trước,
  rồi mới rèn kiếm.

### 5.7. Lên cấp và tiến trình

- Hạ địch và qua màn đều cho XP và vàng.
- Đủ XP sẽ **lên cấp**: máu tối đa +10 (và hồi đầy máu), sát thương +2, ngưỡng XP cho
  cấp tiếp theo = 100 × cấp hiện tại. Ví dụ: từ cấp 1 lên cấp 2 cần 100 XP, từ cấp 2
  lên cấp 3 cần 200 XP nữa.
- Tiến trình được lưu vào `samurai_save.txt` khi: bấm F5, dùng đài hồi sinh, hoặc qua màn.
  File lưu gồm: chương hiện tại, máu/máu tối đa, cấp, XP, ngưỡng XP, vàng, sát thương,
  cấp kiếm và số lượng từng vật phẩm. File lưu hỏng hoặc thiếu trường sẽ bị bỏ qua
  và menu sẽ báo không tìm thấy file lưu hợp lệ, thay vì làm game crash.

### 5.8. Giao diện (HUD)

- Góc trái trên: máu (thanh đỏ), khí lực (thanh vàng), cấp/XP/vàng/sát thương/cấp kiếm,
  danh sách nhiệm vụ của màn.
- Giữa trên: thanh máu boss khi boss còn sống trong màn.
- Góc phải trên: bản đồ mini.
- Giữa dưới: thông báo trong game (nhặt đồ, hạ địch, parry, lên cấp, chưa xong nhiệm vụ…),
  hiện khoảng 3,5 giây.
- Dưới cùng: dòng nhắc phím tắt.
- Màn hình menu, tạm dừng, gục ngã, hoàn thành màn và chiến thắng đều có hướng dẫn
  phím bấm ngay trên màn hình, không cần nhớ hết từ README.

### 5.8b. NPC, phe phái và uy tín (như bản web)

Bản web có dân làng, samurai đồng minh và hệ phe phái (samurai, dân làng,
sơn tặc, ronin, Tu La, bóng tối, quỷ, vệ thành). Bản này có phiên bản gọn:

- **Dân làng**: đứng ở Làng Hạc Bạch, Đền Hoang và Bờ Rào Sương Mù. Đứng gần
  (dưới 1,5 ô) và bấm **F** để nói chuyện. Mỗi dân làng chỉ thưởng một lần
  (lưu vào file lưu, nên chơi lại màn cũng không farm được): **+50 vàng,
  +1 băng gạc**, và **uy tín dân làng +1**. Nói chuyện lần sau vẫn xem được
  hội thoại, nhưng không thưởng nữa.
- **Samurai đồng minh**: ở Làng Hạc Bạch và Đền Hoang. Đồng minh tự đi theo bạn,
  tự tìm địch gần nhất có tầm nhìn, đánh cùng bạn (sát thương 16, hồi chiêu
  1,5 giây). Đồng minh hạ địch thì bạn vẫn nhận XP, vàng và tính nhiệm vụ
  như chính bạn hạ. Nếu đồng minh còn sống khi qua màn, bạn được **+50 vàng
  thưởng**. Đồng minh không bị địch đánh trúng trong bản này (địch chỉ nhắm
  vào bạn), nên đồng minh sẽ không chết giữa chừng vì một mũi tên lạc.
- **Phe phái**: mỗi địch thuộc một phe (sơn tặc, ronin, Tu La, bóng tối, quỷ…),
  đồng minh thuộc phe samurai, dân làng thuộc phe dân làng. Phe phái hiện
  chủ yếu để phân biệt đồng minh/dân làng với địch, chưa có hệ thù địch
  phức tạp như bản web (ví dụ ronin trung lập cho tới khi bị khiêu khích).
- **Giảm giá cửa hàng theo uy tín**: mỗi dân làng đã nói chuyện cho **5%
  giảm giá**, tối đa **20%**. Giá trong cửa hàng (bấm **B**) đã tự trừ giảm giá
  này, ví dụ băng gạc 50 vàng còn 40 vàng khi đã nói chuyện với 4 dân làng.

### 5.9. Cây kỹ năng (như bản web, 3 nhánh × 5 node)

Mỗi lần lên cấp bạn nhận **1 điểm kỹ năng**. Bấm **O** để mở cây kỹ năng
(game tạm dừng), dùng W/S hoặc ↑/↓ để chọn, Enter để học. Kỹ năng đã học
không học lại được, kỹ năng cần kỹ năng yêu cầu trước đó và đủ điểm mới học được.
Điểm và kỹ năng đã học được lưu vào `samurai_save.txt`, file lưu cũ (trước khi
có kỹ năng) vẫn tải được, với điểm = 0 và chưa học kỹ năng nào.

| Nhánh | Node | Yêu cầu | Giá | Tác dụng |
| --- | --- | --- | --- | --- |
| Đao | Thế Kiếm Vững | — | 1 | +4 công kích |
| Đao | Nhất Đao Trảm (nâng cấp) | Thế Kiếm Vững | 1 | U hồi chiêu 5s → 3s, sát thương +10 |
| Đao | Điểm Huyết | Thế Kiếm Vững | 2 | +6% chí mạng |
| Đao | Cuồng Phong Trảm (chủ động, phím Y) | 2 node Đao trên | 2 | Xoay tròn chém diện rộng quanh mình, tốn 45 khí lực, hồi 12s |
| Đao | Sát Khí | Cuồng Phong Trảm | 3 | +12% công kích |
| Gió | Bước Nhẹ | — | 1 | −10% tiêu hao khí lực né và chạy nhanh |
| Gió | Né Ảnh | Bước Nhẹ | 1 | +0,12s bất khả xâm phạm khi né |
| Gió | Hành Vân | Bước Nhẹ | 2 | +10% tốc chạy |
| Gió | Tốc Ảnh (chủ động, phím T) | 2 node Gió trên | 2 | Lao nhanh về trước, đòn kế +80% sát thương, tốn 30 khí lực, hồi 9s |
| Gió | Hơi Thở Gió | Tốc Ảnh | 3 | +10 khí lực hồi mỗi giây |
| Tâm | Bản Lĩnh | — | 1 | +25 máu tối đa |
| Tâm | Tâm Không | Bản Lĩnh | 1 | +0,08s cửa sổ parry |
| Tâm | Lưng Sắt | Bản Lĩnh | 2 | +8 phòng thủ (giảm sát thương địch gây ra) |
| Tâm | Thân Bất Hoại (chủ động, phím G) | 2 node Tâm trên | 2 | 10 giây sát thương nhận vào giảm một nửa, tốn 25 khí lực, hồi 20s |
| Tâm | Kiếm Thánh | Thân Bất Hoại | 3 | +30 khí lực tối đa, +10% kinh nghiệm |

### 5.10. Cửa hàng (vàng giờ đã dùng được)

Bấm **B** để mở cửa hàng (game tạm dừng), dùng W/S hoặc ↑/↓ để chọn, Enter để mua.
Vàng kiếm được từ hạ địch và thưởng qua màn giờ dùng để mua đồ, thay vì chỉ tích lũy.

| Hàng | Giá |
| --- | --- |
| Băng gạc | 50 vàng |
| Thuốc hồi máu | 120 vàng |
| Tre | 20 vàng |
| Thảo dược | 20 vàng |
| Quặng sắt | 80 vàng |
| Rèn kiếm +5 sát thương | 600 vàng |

Mua xong sẽ lưu ngay vào file lưu (qua `samurai_save.txt`).

## 6. Cấu trúc mã nguồn

```
build.gradle                    # LibGDX 1.12.1, backend LWJGL3, FreeType; class chính là DesktopLauncher
settings.gradle
gradlew / gradlew.bat           # Gradle Wrapper 8.5 (không cần cài Gradle trước)
gradle/wrapper/                 # gradle-wrapper.jar + gradle-wrapper.properties
src/main/java/vn/samurai/
├── gdx/
│   ├── DesktopLauncher.java    # Mở cửa sổ LibGDX/LWJGL3 1024×640, 60 FPS
│   ├── SamuraiGame.java        # Application LibGDX, chỉ giữ một Screen là SamuraiScreen
│   ├── SamuraiScreen.java      # Vòng lặp game, camera 3D, ModelBatch, HUD/minimap, input,
│   │                           # AI địch, đạn, boss pha, rig humanoid, hạt, bầu trời, kiếm FPS,
│   │                           # tiếng Việt (font DejaVu qua FreeType)
│   ├── TextureFactory.java     # Texture procedural bằng Pixmap: đá, đất, cỏ, gỗ, vải, kim loại
│   ├── AudioManager.java       # Tổng hợp WAV: nhạc koto/taiko, gió, 23 SFX; phát bằng LibGDX
│   └── SkillTree.java          # Cây kỹ năng 15 node (Đao/Gió/Tâm) như bản web, kèm điều kiện học
├── Npc.java            # Dân làng và samurai đồng minh (phe phái, hội thoại, thưởng)
run.bat                         # Windows: nhấp đúp để chạy game (kiểm tra Java rồi gọi gradlew.bat run)
run.sh                          # Linux/macOS: ./run.sh để chạy game
├── Levels.java     # Dữ liệu 8 chương: bản đồ dạng lưới ký tự, nhiệm vụ, thưởng, màu trời/sàn
├── Level.java      # Một chương: đọc bản đồ, tường/cây, tầm nhìn, mục tiêu, boss còn sống
├── Enemy.java      # Dữ liệu địch và boss: máu, tấn công, giáp, tốc độ, tầm nhìn, tỉ lệ đỡ/né
├── Player.java     # Người chơi: máu, khí lực, cấp/XP, vàng, túi đồ, chế tạo
├── Combat.java     # Công thức sát thương: giáp, chí mạng, đỡ, parry (dùng chung cho game và kiểm tra)
├── SaveData.java   # Lưu/tải file samurai_save.txt dạng key=value, bỏ qua file hỏng
├── Sprite.java     # Vật phẩm, cổng Torii và đài hồi sinh trong thế giới game
└── RgbColor.java   # Màu RGB thuần (không dùng java.awt.Color, để game LibGDX không kéo theo AWT)
src/main/resources/fonts/
└── DejaVuSans.ttf  # Font hiển thị tiếng Việt trong HUD/menu (giấy phép tự do DejaVu)
```

Ký tự bản đồ trong `Levels.java`: `#` tường, `T` cây (cũng chặn đi lại), `.` sàn trống,
`P` điểm bắt đầu, `G` cổng Torii, `S` đài hồi sinh, `i` băng gạc, `d` thuốc hồi máu,
`t` tre, `h` thảo dược, `o` quặng sắt, `g` sơn tặc, `a` cung thủ, `b` bạo đồ, `w` vong linh,
`r` ronin, `u` tín đồ Tu La, `n` quỷ khiên thủ, `s` bóng kiếm, `K` Kurogane, `M` Kagemune,
`H` Hi no Ou, `O` Gashadokuro, `Y` Yamikage.

## 7. Giới hạn đã biết (minh bạch)

- Đồ họa đã là 3D thật với texture, rig v2 và animation, nhưng mô hình vẫn là hình khối
  hình học lắp ghép, chưa phải mô hình nhân vật low-poly với skeletal animation
  (xương + skinning) và shader PBR + normal-map + bloom/post-processing đầy đủ như
  bản web Three.js, chưa có cỏ instanced hàng nghìn bụi như bản web.
- Chưa có: 15 màn đầy đủ của bản web (bản này vẫn 8 chương), nhiệm vụ sóng
  (waves) / phòng thủ như bản web, và multiplayer/server. Phe phái, NPC, cây kỹ
  năng và cửa hàng đã có ở dạng gọn, chưa đầy đủ như bản web (ví dụ ronin
  trung lập, NPC đi tuần, nhiệm vụ phụ từ NPC).
- Không có multiplayer, không có server, không có cửa hàng mua bán, không có cây kỹ năng
  15 node và hệ phe phái đầy đủ như bản web. Kỹ năng trong bản Java chỉ có Nhất Đao Trảm (U).
- Không có nhảy (Space) và đổi góc nhìn thứ nhất/thứ ba như bản web; bản LibGDX chỉ có
  góc nhìn thứ nhất và né bằng phím I.
- Vàng hiện chỉ để tích lũy và hiển thị, chưa dùng để mua đồ.
- Lần chạy đầu tiên cần mạng để Gradle tải LibGDX và Gradle distribution; máy không có
  mạng sẽ không chạy được lần đầu, nhưng sau khi đã tải xong thì chạy offline được
  từ cache Gradle.

## 8. Kiểm tra nhanh sau khi chạy

1. Chạy `gradlew.bat run` (Windows) hoặc `./gradlew run` (Linux/macOS), chờ tải dependency
   lần đầu, menu hiện ra, bấm Enter vào chương 1.
2. Dùng W/A/S/D di chuyển và xoay, Q/E lách sang, nhìn thấy tường hộp, cây nón 3D
   và bản đồ mini, camera hơi nhún khi di chuyển.
3. Đến gần sơn tặc, bấm J để chém, giữ L để đỡ, bấm I để né.
4. Nhặt tre/băng gạc bằng cách đi qua vật phẩm, bấm Tab xem túi đồ, bấm C để chế tạo
   khi đủ nguyên liệu.
5. Hoàn thành nhiệm vụ góc trái trên, đi đến cổng Torii đỏ, bấm N để sang màn tiếp.
6. Bấm F5 để lưu, thoát game, chạy lại và bấm L ở menu để tiếp tục từ chương đã lưu.
