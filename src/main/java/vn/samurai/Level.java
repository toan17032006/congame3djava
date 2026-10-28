package vn.samurai;

import java.util.ArrayList;
import java.util.List;

/** One chapter: a grid map, its enemies, items, goal, shrine and objectives. */
public class Level {
    public static class Objective {
        public String type; // KILL, COLLECT, BOSS
        public String target; // enemy kind, or item name: bamboo / iron
        public int required, progress = 0;
        public String text;

        public Objective(String type, String target, int required, String text) {
            this.type = type;
            this.target = target;
            this.required = required;
            this.text = text;
        }

        public boolean done() {
            return progress >= required;
        }
    }

    public String id, name, desc;
    public int rewardXp, rewardCoins;
    public RgbColor ceiling, floor;
    public int width, height;
    public int[][] wall; // 0 floor, 1 wall, 2 tree
    public double startX, startY, startAngle = 0;
    public List<Enemy> enemies = new ArrayList<>();
    public List<Sprite> sprites = new ArrayList<>();
    public List<Objective> objectives = new ArrayList<>();

    public Level(String id, String name, String desc, int rewardXp, int rewardCoins,
                 RgbColor ceiling, RgbColor floor, String[] rows, Objective... objectives) {
        this.id = id;
        this.name = name;
        this.desc = desc;
        this.rewardXp = rewardXp;
        this.rewardCoins = rewardCoins;
        this.ceiling = ceiling;
        this.floor = floor;
        height = rows.length;
        width = 0;
        for (String r : rows) width = Math.max(width, r.length());
        wall = new int[height][width];
        for (int y = 0; y < height; y++) {
            String row = rows[y];
            for (int x = 0; x < width; x++) {
                char c = x < row.length() ? row.charAt(x) : '#';
                double cx = x + 0.5, cy = y + 0.5;
                switch (c) {
                    case '#': wall[y][x] = 1; break;
                    case 'T': wall[y][x] = 2; break;
                    case 'P': startX = cx; startY = cy; break;
                    case 'G': sprites.add(new Sprite(Sprite.Type.GOAL, cx, cy, "Cổng Torii")); break;
                    case 'S': sprites.add(new Sprite(Sprite.Type.SHRINE, cx, cy, "Đài hồi sinh")); break;
                    case 'i': sprites.add(new Sprite(Sprite.Type.BANDAGE, cx, cy, "Băng gạc")); break;
                    case 'd': sprites.add(new Sprite(Sprite.Type.DRAUGHT, cx, cy, "Thuốc hồi máu")); break;
                    case 't': sprites.add(new Sprite(Sprite.Type.BAMBOO, cx, cy, "Tre")); break;
                    case 'h': sprites.add(new Sprite(Sprite.Type.HERB, cx, cy, "Thảo dược")); break;
                    case 'o': sprites.add(new Sprite(Sprite.Type.IRON, cx, cy, "Quặng sắt")); break;
                    case 'g': enemies.add(Enemy.create("grunt", cx, cy)); break;
                    case 'a': enemies.add(Enemy.create("archer", cx, cy)); break;
                    case 'b': enemies.add(Enemy.create("brute", cx, cy)); break;
                    case 'w': enemies.add(Enemy.create("wraith", cx, cy)); break;
                    case 'r': enemies.add(Enemy.create("ronin", cx, cy)); break;
                    case 'u': enemies.add(Enemy.create("ashura", cx, cy)); break;
                    case 'n': enemies.add(Enemy.create("oni_shield", cx, cy)); break;
                    case 's': enemies.add(Enemy.create("shadow", cx, cy)); break;
                    case 'K': enemies.add(Enemy.create("boss_kurogane", cx, cy)); break;
                    case 'M': enemies.add(Enemy.create("boss_kagemune", cx, cy)); break;
                    case 'H': enemies.add(Enemy.create("boss_ashura", cx, cy)); break;
                    case 'O': enemies.add(Enemy.create("boss_oni", cx, cy)); break;
                    case 'Y': enemies.add(Enemy.create("boss_yamikage", cx, cy)); break;
                    default: break;
                }
            }
        }
        for (Objective o : objectives) this.objectives.add(o);
    }

    public boolean isWallCell(int x, int y) {
        if (x < 0 || y < 0 || x >= width || y >= height) return true;
        return wall[y][x] != 0;
    }

    public boolean isWallAt(double x, double y) {
        return isWallCell((int) Math.floor(x), (int) Math.floor(y));
    }

    /** True when no wall cell blocks the straight line between two points. */
    public boolean hasLineOfSight(double x1, double y1, double x2, double y2) {
        double dist = Math.hypot(x2 - x1, y2 - y1);
        int steps = (int) (dist * 10) + 1;
        for (int i = 1; i < steps; i++) {
            double t = (double) i / steps;
            if (isWallAt(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
        }
        return true;
    }

    public boolean objectivesDone() {
        for (Objective o : objectives) if (!o.done()) return false;
        return true;
    }

    public String remainingObjectives() {
        StringBuilder sb = new StringBuilder();
        for (Objective o : objectives) {
            if (!o.done()) {
                if (sb.length() > 0) sb.append(" · ");
                sb.append(o.text).append(" (").append(o.progress).append("/").append(o.required).append(")");
            }
        }
        return sb.toString();
    }

    public Enemy boss() {
        for (Enemy e : enemies) if (e.boss && e.alive()) return e;
        return null;
    }
}
