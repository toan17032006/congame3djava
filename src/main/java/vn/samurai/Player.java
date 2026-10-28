package vn.samurai;

/** Player stats, inventory and progression. No Swing code here, so it can be tested headlessly. */
public class Player {
    public double x, y, angle;
    public int hp, maxHp = 100;
    public double stamina = 100;
    public int level = 1, xp = 0, xpNext = 100, coins = 0;
    public int damage = 18, katanaLevel = 1;
    public int bandage = 2, draught = 0, bamboo = 0, herb = 0, iron = 0;
    public boolean blocking = false;
    public long blockPressedAtMs = 0;
    public boolean parryBonus = false;
    public double iframes = 0;

    public Player() {
        hp = maxHp;
    }

    /** Add XP, level up while the threshold is reached. Returns true if a level was gained. */
    public boolean addXp(int amount) {
        xp += amount;
        boolean up = false;
        while (xp >= xpNext) {
            xp -= xpNext;
            level++;
            xpNext = 100 * level;
            maxHp += 10;
            hp = maxHp;
            damage += 2;
            up = true;
        }
        return up;
    }

    public void heal(int amount) {
        hp = Math.min(maxHp, hp + amount);
    }

    public boolean useBandage() {
        if (bandage <= 0 || hp >= maxHp) return false;
        bandage--;
        heal(30);
        return true;
    }

    public boolean useDraught() {
        if (draught <= 0 || hp >= maxHp) return false;
        draught--;
        heal(60);
        return true;
    }

    /** 2 bamboo + 1 herb -> 1 bandage. */
    public boolean craftBandage() {
        if (bamboo < 2 || herb < 1) return false;
        bamboo -= 2;
        herb -= 1;
        bandage++;
        return true;
    }

    /** 3 iron ore -> katana +5 damage. */
    public boolean craftKatana() {
        if (iron < 3) return false;
        iron -= 3;
        katanaLevel++;
        damage += 5;
        return true;
    }
}
