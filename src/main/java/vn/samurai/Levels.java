package vn.samurai;

import java.util.ArrayList;
import java.util.List;

/** The Java chapters. They condense the original web game's arc into 8 chapters
 *  with the same names, quests and bosses, rebalanced for pure-Java play. */
public final class Levels {
    private Levels() {}

    public static List<Level> create() {
        List<Level> levels = new ArrayList<>();

        levels.add(new Level("L01", "Bờ Rào Sương Mù",
                "Sương dày. Trước khi chạm cổng làng, vài tên sơn tặc đã len lỏi ra bìa rừng.",
                80, 40, new RgbColor(120, 135, 150), new RgbColor(70, 78, 66),
                new String[]{
                        "####################",
                        "#P.......T.......g.#",
                        "#.........T........#",
                        "#..g.....T....i....#",
                        "#..................#",
                        "#.....T........T...#",
                        "#..t.....T....g....#",
                        "#..................#",
                        "#.....T........T...#",
                        "#..i.....T....t....#",
                        "#..................#",
                        "#.................G#",
                        "#..................#",
                        "#S.................#",
                        "####################"},
                new Level.Objective("KILL", "grunt", 3, "Trừ khử sơn tặc"),
                new Level.Objective("REACH", "goal", 1, "Đến cổng làng Hạc Bạch")));

        levels.add(new Level("L02", "Làng Hạc Bạch",
                "Làng cất rượu cho mùa đông - và sơn tặc cũng chọn đúng mùa ấy.",
                150, 80, new RgbColor(135, 170, 210), new RgbColor(110, 90, 60),
                new String[]{
                        "####################",
                        "#P.......T.......a.#",
                        "#.........T........#",
                        "#..g.....T....b....#",
                        "#..................#",
                        "#.....T........T...#",
                        "#..g.....T....i....#",
                        "#..................#",
                        "#.....T........T...#",
                        "#..g.....T....d....#",
                        "#..................#",
                        "#.................G#",
                        "#..................#",
                        "#S.................#",
                        "####################"},
                new Level.Objective("KILL", "brute", 1, "Hạ bạo đồ chỉ huy"),
                new Level.Objective("KILL", "grunt", 3, "Đánh tan sơn tặc")));

        levels.add(new Level("L03", "Rừng Tre Mật",
                "Tre xanh dày đến mức trời chỉ còn một dải mỏng. Trong rừng, tiếng khóc không thuộc về người sống.",
                200, 100, new RgbColor(110, 160, 120), new RgbColor(50, 80, 45),
                new String[]{
                        "####################",
                        "#P.......T.......w.#",
                        "#.........T........#",
                        "#..w.....T....t....#",
                        "#..................#",
                        "#.....T........T...#",
                        "#..t.....T....w....#",
                        "#..................#",
                        "#.....T........T...#",
                        "#..t.....T....t....#",
                        "#..................#",
                        "#.................G#",
                        "#..t...............#",
                        "#S.................#",
                        "####################"},
                new Level.Objective("COLLECT", "bamboo", 5, "Chặt tre già"),
                new Level.Objective("KILL", "wraith", 3, "Tiêu diệt vong linh")));

        levels.add(new Level("L04", "Đền Hoang",
                "Đền hoang đầu con đèo. Trong sân đá, một bóng to lớn quăng búa tập.",
                420, 250, new RgbColor(140, 130, 110), new RgbColor(95, 85, 70),
                new String[]{
                        "####################",
                        "#P.......T.......g.#",
                        "#.........T........#",
                        "#..g.....T....i....#",
                        "#..................#",
                        "#.....T........T...#",
                        "#........T.........#",
                        "#..................#",
                        "#.....T........T...#",
                        "#........T....d....#",
                        "#..................#",
                        "#.................K#",
                        "#.................G#",
                        "#S.................#",
                        "####################"},
                new Level.Objective("KILL", "grunt", 2, "Dọn sơn tặc giữ đền"),
                new Level.Objective("BOSS", "boss_kurogane", 1, "Hạ Kurogane - Vua Sơn Tặc")));

        levels.add(new Level("L05", "Sân Đấu Ronin",
                "Sân đấu của những kẻ vô chủ. Hai lượt đấu đơn, rồi Kagemune bước ra khỏi bóng.",
                620, 400, new RgbColor(150, 140, 120), new RgbColor(105, 85, 55),
                new String[]{
                        "####################",
                        "#P.......T.......r.#",
                        "#.........T........#",
                        "#..r.....T....i....#",
                        "#..................#",
                        "#.....T........T...#",
                        "#........T.........#",
                        "#..................#",
                        "#.....T........T...#",
                        "#........T....d....#",
                        "#..................#",
                        "#.................M#",
                        "#.................G#",
                        "#S.................#",
                        "####################"},
                new Level.Objective("KILL", "ronin", 2, "Đấu đơn với ronin"),
                new Level.Objective("BOSS", "boss_kagemune", 1, "Hạ Kagemune - Kiếm Khách Bóng")));

        levels.add(new Level("L06", "Sườn Núi Tu La",
                "Khói lửa xanh trùm lên sườn núi. Tín đồ Tu La hát trên đường lên đền.",
                900, 600, new RgbColor(170, 90, 60), new RgbColor(80, 50, 40),
                new String[]{
                        "####################",
                        "#P.......T.......u.#",
                        "#.........T........#",
                        "#..u.....T....o....#",
                        "#..................#",
                        "#.....T........T...#",
                        "#..o.....T....i....#",
                        "#..................#",
                        "#.....T........T...#",
                        "#..o.....T....d....#",
                        "#..................#",
                        "#.................H#",
                        "#.................G#",
                        "#S.................#",
                        "####################"},
                new Level.Objective("KILL", "ashura", 2, "Hạ tín đồ Tu La"),
                new Level.Objective("COLLECT", "iron", 3, "Khai quặng sắt"),
                new Level.Objective("BOSS", "boss_ashura", 1, "Hạ Hi no Ou - Vua Tu La")));

        levels.add(new Level("L07", "Thành Bóng Tối",
                "Pho tượng sắt của thành bóng tối trấn giữ con đường cuối cùng.",
                1300, 850, new RgbColor(70, 75, 95), new RgbColor(55, 50, 65),
                new String[]{
                        "####################",
                        "#P.......T.......n.#",
                        "#.........T........#",
                        "#........T....i....#",
                        "#..................#",
                        "#.....T........T...#",
                        "#........T.........#",
                        "#..................#",
                        "#.....T........T...#",
                        "#........T....d....#",
                        "#..................#",
                        "#.................O#",
                        "#.................G#",
                        "#S.................#",
                        "####################"},
                new Level.Objective("KILL", "oni_shield", 1, "Hạ quỷ khiên thủ"),
                new Level.Objective("BOSS", "boss_oni", 1, "Hạ Gashadokuro - Tướng Quỷ")));

        levels.add(new Level("L08", "Mạc Phủ Bóng Tối",
                "Ngươi đã đến nơi rẻ nhất của số phận. Nơi đây Yamikage cai quản cái chết.",
                2200, 1500, new RgbColor(40, 45, 70), new RgbColor(35, 35, 50),
                new String[]{
                        "####################",
                        "#P.......T.......s.#",
                        "#.........T........#",
                        "#..s.....T....i....#",
                        "#..................#",
                        "#.....T........T...#",
                        "#........T.........#",
                        "#..................#",
                        "#.....T........T...#",
                        "#........T....d....#",
                        "#..................#",
                        "#.................Y#",
                        "#.................G#",
                        "#S.................#",
                        "####################"},
                new Level.Objective("KILL", "shadow", 2, "Hạ bóng kiếm"),
                new Level.Objective("BOSS", "boss_yamikage", 1, "Hạ Yamikage - Mạc Phủ Bóng Tối")));

        // NPCs: villagers to talk to (F) and ally samurai who fight with you.
        // Positions are free floor cells in each map (checked against the grids above).
        levels.get(0).npcs.add(new Npc("L01_lao_nong", "Lão nông", "villager", 5.5, 4.5, false,
                "Chào samurai! Đi bằng W/S, xoay bằng A/D.",
                "Gặp sơn tặc thì bấm J để chém, giữ L để đỡ, bấm I để né.",
                "Nhặt tre và thảo dược, bấm C để chế băng gạc. Chúc ngươi bình an!"));
        levels.get(1).npcs.add(new Npc("L02_dan_lang_1", "Dân làng", "villager", 4.5, 2.5, false,
                "Sơn tặc cướp hết rượu mùa đông của làng rồi!",
                "Bạo đồ chỉ huy ở gần cổng, cẩn thận đòn mạnh của hắn.",
                "Cảm ơn ngươi đã đến giúp làng!"));
        levels.get(1).npcs.add(new Npc("L02_dan_lang_2", "Dân làng", "villager", 15.5, 4.5, false,
                "Ta giấu ít băng gạc trong làng, ngươi cứ nhặt mà dùng.",
                "Nói chuyện với dân làng nhiều sẽ được giảm giá ở cửa hàng đấy."));
        levels.get(1).npcs.add(new Npc("L02_ally", "Samurai đồng minh", "samurai_ally", 6.5, 4.5, true,
                "Ta sẽ chiến đấu cùng ngươi! Đừng lo phía sau.",
                "Ronin và sơn tặc đều là kẻ thù của làng, cứ chém thẳng tay!"));
        levels.get(3).npcs.add(new Npc("L04_thay_tu", "Thầy tu giữ đền", "villager", 5.5, 4.5, false,
                "Kurogane chiếm đền đã lâu, tượng Phật cũng bị hắn che mất.",
                "Hắn to lớn nhưng chậm, né rồi parry là hạ được.",
                "Nếu ngươi hạ được hắn, đền sẽ lại yên bình."));
        levels.get(3).npcs.add(new Npc("L04_ally", "Samurai đồng minh", "samurai_ally", 3.5, 7.5, true,
                "Ta canh đền đã nhiều ngày, cuối cùng cũng có người đến.",
                "Ta sẽ đánh cùng ngươi, Kurogane không dễ gì thắng được hai ta!"));

        // L09: Wave mission, after the main story. Original L09 was a burning
        // village with 3 waves. Map has no enemy letters: all enemies spawn
        // as waves from the edges.
        Level wave = new Level("L09", "Làng Cháy Giữa Đêm - Sóng",
                "Làng cháy giữa đêm. Từng đợt sơn tặc tràn vào từ các cổng làng. Giữ vững 3 đợt sóng!",
                800, 500, new RgbColor(120, 60, 40), new RgbColor(70, 50, 40),
                new String[]{
                        "####################",
                        "#P.......T.........#",
                        "#.........T........#",
                        "#........T....i....#",
                        "#..................#",
                        "#.....T........T...#",
                        "#........T.........#",
                        "#..................#",
                        "#.....T........T...#",
                        "#........T....d....#",
                        "#..................#",
                        "#.................G#",
                        "#..................#",
                        "#S.................#",
                        "####################"},
                new Level.Objective("WAVE", "wave", 3, "Chống đỡ 3 đợt sóng"),
                new Level.Objective("KILL", "brute", 2, "Hạ bạo đồ trong các đợt sóng"));
        wave.waves.add(java.util.Arrays.asList("grunt", "grunt", "archer"));
        wave.waves.add(java.util.Arrays.asList("grunt", "brute", "archer", "wraith"));
        wave.waves.add(java.util.Arrays.asList("brute", "brute", "ronin", "ashura"));
        levels.add(wave);

        // L10: Defend mission, after the wave level. Original L14 was a castle
        // gate with 4 waves. Here: defend the banner for 60 seconds while
        // enemies spawn and march on it, plus kill 2 shield demons.
        Level defend = new Level("L10", "Đại Môn Thành - Phòng Thủ",
                "Giữ cờ ở cổng thành trong 60 giây. Địch sẽ xông thẳng vào cờ, đừng để cờ ngã!",
                1000, 600, new RgbColor(90, 100, 130), new RgbColor(60, 55, 70),
                new String[]{
                        "####################",
                        "#P.......T.........#",
                        "#.........T........#",
                        "#........T....i....#",
                        "#..................#",
                        "#.....T........T...#",
                        "#........T.........#",
                        "#..................#",
                        "#.....T........T...#",
                        "#........T....d....#",
                        "#..................#",
                        "#.................G#",
                        "#..................#",
                        "#S.................#",
                        "####################"},
                new Level.Objective("DEFEND", "banner", 60, "Giữ cờ 60 giây"),
                new Level.Objective("KILL", "oni_shield", 2, "Hạ quỷ khiên thủ"));
        defend.bannerX = 10.5;
        defend.bannerY = 7.5;
        defend.bannerHp = 100;
        defend.defendDuration = 60;
        defend.sprites.add(new Sprite(Sprite.Type.BANNER, defend.bannerX, defend.bannerY, "Cờ phòng thủ"));
        levels.add(defend);

        return levels;
    }
}
