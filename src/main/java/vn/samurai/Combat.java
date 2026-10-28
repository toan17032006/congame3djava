package vn.samurai;

import java.util.Random;

/** Pure damage maths, shared by the game and by headless tests. */
public final class Combat {
    private Combat() {}

    /** Player damage after defence, block, crit and a parry bonus. Always at least 1. */
    public static int playerDamage(int base, int defense, boolean crit, boolean blocked, boolean parryBonus) {
        int dmg = base - defense;
        if (dmg < 1) dmg = 1;
        if (blocked) return Math.max(1, dmg / 5);
        if (crit) dmg = dmg * 3 / 2;
        if (parryBonus) dmg *= 2;
        return Math.max(1, dmg);
    }

    /** Enemy damage to the player. Dodging and a perfect parry avoid it completely. */
    public static int enemyDamage(int enemyAttack, boolean blocking, boolean dodging, boolean parry) {
        if (dodging || parry) return 0;
        if (blocking) return Math.max(1, enemyAttack / 10);
        return enemyAttack;
    }

    public static boolean rollCrit(Random rng) {
        return rng.nextDouble() < 0.10;
    }
}
