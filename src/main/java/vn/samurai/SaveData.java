package vn.samurai;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.Map;

/** Tiny key=value save file in the working directory. Corrupt files are ignored, never crash the game. */
public class SaveData {
    public int levelIndex, hp, maxHp, level, xp, xpNext, coins, damage, katanaLevel;
    public int bandage, draught, bamboo, herb, iron;
    public int skillPoints = 0;
    public int maxStamina = 100;
    public String skillsCsv = "";

    public static void save(Player p, int levelIndex, File file) throws IOException {
        String text = "levelIndex=" + levelIndex + "\n"
                + "hp=" + p.hp + "\nmaxHp=" + p.maxHp + "\nlevel=" + p.level + "\nxp=" + p.xp
                + "\nxpNext=" + p.xpNext + "\ncoins=" + p.coins + "\ndamage=" + p.damage
                + "\nkatanaLevel=" + p.katanaLevel + "\nbandage=" + p.bandage + "\ndraught=" + p.draught
                + "\nbamboo=" + p.bamboo + "\nherb=" + p.herb + "\niron=" + p.iron
                + "\nskillPoints=" + p.skillPoints + "\nmaxStamina=" + p.maxStamina
                + "\nskills=" + String.join(",", p.skills) + "\n";
        Files.writeString(file.toPath(), text, StandardCharsets.UTF_8);
    }

    /** Returns null when the file is missing or cannot be parsed. */
    public static SaveData load(File file) {
        try {
            if (!file.exists()) return null;
            Map<String, Integer> m = new HashMap<>();
            String skillsCsv = "";
            for (String line : Files.readAllLines(file.toPath(), StandardCharsets.UTF_8)) {
                String[] kv = line.split("=", 2);
                if (kv.length != 2) continue;
                if (kv[0].trim().equals("skills")) {
                    skillsCsv = kv[1].trim();
                } else {
                    try {
                        m.put(kv[0].trim(), Integer.parseInt(kv[1].trim()));
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
            SaveData s = new SaveData();
            s.levelIndex = req(m, "levelIndex");
            s.hp = req(m, "hp");
            s.maxHp = req(m, "maxHp");
            s.level = req(m, "level");
            s.xp = req(m, "xp");
            s.xpNext = req(m, "xpNext");
            s.coins = req(m, "coins");
            s.damage = req(m, "damage");
            s.katanaLevel = req(m, "katanaLevel");
            s.bandage = req(m, "bandage");
            s.draught = req(m, "draught");
            s.bamboo = req(m, "bamboo");
            s.herb = req(m, "herb");
            s.iron = req(m, "iron");
            // New keys are optional, so old saves still load.
            s.skillPoints = m.getOrDefault("skillPoints", 0);
            s.maxStamina = m.getOrDefault("maxStamina", 100);
            s.skillsCsv = skillsCsv;
            if (s.maxHp <= 0 || s.level <= 0 || s.levelIndex < 0) return null;
            return s;
        } catch (Exception e) {
            return null;
        }
    }

    private static int req(Map<String, Integer> m, String key) {
        Integer v = m.get(key);
        if (v == null) throw new IllegalArgumentException("missing " + key);
        return v;
    }

    public void applyTo(Player p) {
        p.maxHp = maxHp;
        p.hp = Math.min(hp, maxHp);
        p.level = level;
        p.xp = xp;
        p.xpNext = xpNext;
        p.coins = coins;
        p.damage = damage;
        p.katanaLevel = katanaLevel;
        p.bandage = bandage;
        p.draught = draught;
        p.bamboo = bamboo;
        p.herb = herb;
        p.iron = iron;
        p.maxStamina = maxStamina;
        p.stamina = maxStamina;
        p.skillPoints = skillPoints;
        p.skills.clear();
        if (skillsCsv != null && !skillsCsv.isEmpty()) {
            for (String id : skillsCsv.split(",")) {
                if (!id.trim().isEmpty()) p.skills.add(id.trim());
            }
        }
        // Re-apply passive bonuses from learned skills (damage/hp/etc are
        // already in the save, so only re-derive the derived fields here).
        // Derived fields that are not stored separately:
        p.critBonus = 0;
        p.staminaCostMul = 0;
        p.dodgeIframesBonus = 0;
        p.moveSpeedMul = 0;
        p.staminaRegenBonus = 0;
        p.parryWindowBonus = 0;
        p.playerDefense = 0;
        p.xpGainMul = 0;
        for (String id : p.skills) {
            switch (id) {
                case "blade_3": p.critBonus += 6; break;
                case "wind_1": p.staminaCostMul -= 0.10; break;
                case "wind_2": p.dodgeIframesBonus += 0.12; break;
                case "wind_3": p.moveSpeedMul += 0.10; break;
                case "wind_5": p.staminaRegenBonus += 10; break;
                case "spirit_2": p.parryWindowBonus += 0.08; break;
                case "spirit_3": p.playerDefense += 8; break;
                case "spirit_5": p.xpGainMul += 0.10; break;
                default: break;
            }
        }
    }
}
