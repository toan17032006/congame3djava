package vn.samurai;


/** One enemy or boss. Kind is data, AI state lives in GamePanel. */
public class Enemy {
    public static final int IDLE = 0, CHASE = 1, WINDUP = 2, COOLDOWN = 3, STUNNED = 4, DEAD = 5;

    public String kind, name, bossId = "";
    public double x, y;
    public int hp, maxHp, attack, defense, xp, coins;
    public double speed, sight, attackRange, cooldownTime;
    public boolean ranged, fire, shadow, boss;
    public double scale = 1.0, blockChance = 0, dodgeChance = 0;
    public RgbColor cloth;
    public int state = IDLE;
    public double windupTimer = 0, cooldownTimer = 0, stunTimer = 0;
    public boolean phase2Done = false, phase3Done = false;

    private Enemy(String kind, String name, double x, double y, int hp, int attack, int defense,
                  double speed, int xp, int coins, double sight, double attackRange,
                  double cooldownTime, RgbColor cloth) {
        this.kind = kind;
        this.name = name;
        this.x = x;
        this.y = y;
        this.hp = hp;
        this.maxHp = hp;
        this.attack = attack;
        this.defense = defense;
        this.speed = speed;
        this.xp = xp;
        this.coins = coins;
        this.sight = sight;
        this.attackRange = attackRange;
        this.cooldownTime = cooldownTime;
        this.cloth = cloth;
    }

    public boolean alive() {
        return state != DEAD && hp > 0;
    }

    public double hpPct() {
        return maxHp <= 0 ? 0 : (double) hp / maxHp;
    }

    public static Enemy create(String kind, double x, double y) {
        switch (kind) {
            case "grunt":
                return new Enemy(kind, "Sơn tặc", x, y, 45, 9, 2, 2.2, 22, 12, 12, 1.4, 1.6, new RgbColor(90, 70, 50));
            case "archer": {
                Enemy e = new Enemy(kind, "Cung thủ", x, y, 35, 11, 1, 2.3, 26, 15, 14, 10, 2.6, new RgbColor(74, 90, 58));
                e.ranged = true;
                return e;
            }
            case "brute":
                return new Enemy(kind, "Bạo đồ", x, y, 110, 17, 5, 1.8, 55, 30, 12, 1.6, 2.2, new RgbColor(106, 58, 42));
            case "wraith": {
                Enemy e = new Enemy(kind, "Vong linh", x, y, 55, 16, 4, 3.2, 60, 20, 14, 1.2, 1.1, new RgbColor(48, 64, 74));
                e.dodgeChance = 0.25;
                return e;
            }
            case "ronin": {
                Enemy e = new Enemy(kind, "Ronin du thủ", x, y, 95, 18, 8, 2.6, 70, 45, 14, 1.4, 1.4, new RgbColor(42, 52, 64));
                e.blockChance = 0.30;
                e.dodgeChance = 0.20;
                return e;
            }
            case "ashura": {
                Enemy e = new Enemy(kind, "Tín đồ Tu La", x, y, 120, 16, 6, 2.5, 120, 75, 14, 1.4, 1.5, new RgbColor(138, 36, 24));
                e.ranged = true;
                e.fire = true;
                return e;
            }
            case "oni_shield":
                return new Enemy(kind, "Quỷ khiên thủ", x, y, 220, 20, 14, 1.9, 180, 110, 12, 1.5, 2.0, new RgbColor(58, 42, 74));
            case "shadow": {
                Enemy e = new Enemy(kind, "Bóng kiếm", x, y, 110, 18, 6, 3.0, 150, 90, 16, 1.4, 1.1, new RgbColor(26, 32, 48));
                e.blockChance = 0.20;
                e.dodgeChance = 0.30;
                e.shadow = true;
                return e;
            }
            case "boss_kurogane": {
                Enemy e = boss(kind, "Kurogane - Vua Sơn Tặc", x, y, 300, 18, 6, 2.2, 420, 250, new RgbColor(106, 42, 26));
                e.scale = 1.35;
                return e;
            }
            case "boss_kagemune": {
                Enemy e = boss(kind, "Kagemune - Kiếm Khách Bóng", x, y, 350, 20, 8, 2.8, 620, 400, new RgbColor(34, 42, 56));
                e.scale = 1.05;
                e.blockChance = 0.25;
                e.dodgeChance = 0.20;
                return e;
            }
            case "boss_ashura": {
                Enemy e = boss(kind, "Hi no Ou - Vua Tu La", x, y, 400, 22, 10, 2.6, 900, 600, new RgbColor(138, 26, 16));
                e.ranged = true;
                e.fire = true;
                e.scale = 1.20;
                return e;
            }
            case "boss_oni": {
                Enemy e = boss(kind, "Gashadokuro - Tướng Quỷ", x, y, 450, 24, 14, 2.0, 1300, 850, new RgbColor(58, 42, 78));
                e.scale = 1.55;
                return e;
            }
            case "boss_yamikage": {
                Enemy e = boss(kind, "Yamikage - Mạc Phủ Bóng Tối", x, y, 500, 24, 12, 3.0, 2200, 1500, new RgbColor(20, 26, 44));
                e.ranged = true;
                e.shadow = true;
                e.scale = 1.12;
                e.blockChance = 0.20;
                e.dodgeChance = 0.20;
                return e;
            }
            default:
                return new Enemy(kind, "Sơn tặc", x, y, 45, 9, 2, 2.2, 22, 12, 12, 1.4, 1.6, new RgbColor(90, 70, 50));
        }
    }

    private static Enemy boss(String kind, String name, double x, double y, int hp, int attack,
                              int defense, double speed, int xp, int coins, RgbColor cloth) {
        Enemy e = new Enemy(kind, name, x, y, hp, attack, defense, speed, xp, coins, 16, 1.7, 1.6, cloth);
        e.boss = true;
        e.bossId = kind;
        return e;
    }
}
