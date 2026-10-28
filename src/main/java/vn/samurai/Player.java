package vn.samurai;

/** Player stats, inventory and progression. No Swing code here, so it can be tested headlessly. */
public class Player {
    public double x, y, angle;
    public int hp, maxHp = 100;
    public double stamina = 100;
    public int maxStamina = 100;
    public int level = 1, xp = 0, xpNext = 100, coins = 0;
    public int damage = 18, katanaLevel = 1;
    public int bandage = 2, draught = 0, bamboo = 0, herb = 0, iron = 0;
    public boolean blocking = false;
    public long blockPressedAtMs = 0;
    public boolean parryBonus = false;
    public double iframes = 0;
    // Skill tree (original SKILL_TREE, 3 branches x 5 nodes).
    public int skillPoints = 0;
    public java.util.Set<String> skills = new java.util.HashSet<>();
    public int critBonus = 0;
    public double staminaCostMul = 0;
    public double dodgeIframesBonus = 0;
    public double moveSpeedMul = 0;
    public double staminaRegenBonus = 0;
    public double parryWindowBonus = 0;
    public int playerDefense = 0;
    public double xpGainMul = 0;
    public boolean windstepBonus = false;
    public double ironwillTimer = 0;

    public Player() {
        hp = maxHp;
    }

    /** Add XP, level up while the threshold is reached. Returns true if a level was gained. */
    public boolean addXp(int amount) {
        xp += (int) Math.round(amount * (1 + xpGainMul));
        boolean up = false;
        while (xp >= xpNext) {
            xp -= xpNext;
            level++;
            xpNext = 100 * level;
            maxHp += 10;
            hp = maxHp;
            damage += 2;
            skillPoints++;
            up = true;
        }
        return up;
    }

    public boolean hasSkill(String id) {
        return skills.contains(id);
    }

    /** Learn a skill node, applying its passive immediately. Caller checks cost/requires. */
    public void learnSkill(String id, int cost) {
        skills.add(id);
        skillPoints -= cost;
        switch (id) {
            case "blade_1": damage += 4; break;
            case "blade_3": critBonus += 6; break;
            case "blade_5": damage = (int) Math.round(damage * 1.12); break;
            case "wind_1": staminaCostMul -= 0.10; break;
            case "wind_2": dodgeIframesBonus += 0.12; break;
            case "wind_3": moveSpeedMul += 0.10; break;
            case "wind_5": staminaRegenBonus += 10; break;
            case "spirit_1": maxHp += 25; hp += 25; break;
            case "spirit_2": parryWindowBonus += 0.08; break;
            case "spirit_3": playerDefense += 8; break;
            case "spirit_5": maxStamina += 30; stamina = Math.min(maxStamina, stamina + 30); break;
            default: break;
        }
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
