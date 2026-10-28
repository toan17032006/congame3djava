package vn.samurai;

import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Toolkit;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;
import java.io.File;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import javax.swing.JPanel;
import javax.swing.Timer;

/** First-person pseudo-3D raycaster game. Pure JDK Swing, no external libraries. */
public class GamePanel extends JPanel implements KeyListener, ActionListener {
    private enum State { MENU, PLAYING, PAUSED, DEAD, LEVEL_COMPLETE, VICTORY }

    private static class Projectile {
        double x, y, dx, dy, damage;
        boolean fire;
    }

    private static final int W = 1024, H = 640;
    private final File saveFile = new File("samurai_save.txt");
    private final Random rng = new Random();
    private final Set<Integer> keys = new HashSet<>();
    private final List<Projectile> projectiles = new ArrayList<>();
    private final double[] zbuffer = new double[W];

    private State state = State.MENU;
    private Player player = new Player();
    private List<Level> levels = Levels.create();
    private int levelIndex = 0;
    private Level level = levels.get(0);
    private boolean showInventory = false;
    private boolean saveExists = false;
    private String menuMessage = "";
    private String message = "";
    private double messageTimer = 0, gameTime = 0, damageFlash = 0;
    private double lastStaminaUse = -10;
    private double attackTimer = 0, attackDuration = 0, attackHitDelay = 0, attackCooldown = 0;
    private double skillCooldown = 0, dodgeCooldown = 0;
    private int attackKind = 0;
    private boolean attackApplied = false;

    public GamePanel() {
        setPreferredSize(new Dimension(W, H));
        setFocusable(true);
        setFocusTraversalKeysEnabled(false);
        addKeyListener(this);
        saveExists = saveFile.exists();
        player.x = level.startX;
        player.y = level.startY;
        player.angle = level.startAngle;
        new Timer(16, this).start();
    }

    // ---------- game flow ----------

    private void startNew() {
        player = new Player();
        levelIndex = 0;
        loadLevel(0, true);
        state = State.PLAYING;
        setMessage("Màn 1: " + level.name + " - " + level.desc);
    }

    private void loadGame() {
        SaveData s = SaveData.load(saveFile);
        if (s == null) {
            menuMessage = "Không tìm thấy file lưu hợp lệ (samurai_save.txt). Hãy chơi mới.";
            return;
        }
        player = new Player();
        s.applyTo(player);
        levelIndex = Math.min(s.levelIndex, levels.size() - 1);
        loadLevel(levelIndex, false);
        if (player.hp <= 0) player.hp = player.maxHp;
        state = State.PLAYING;
        setMessage("Đã tải game: " + level.name);
    }

    private void loadLevel(int index, boolean healFull) {
        levels = Levels.create();
        levelIndex = index;
        level = levels.get(index);
        player.x = level.startX;
        player.y = level.startY;
        player.angle = level.startAngle;
        player.stamina = 100;
        player.iframes = 0;
        player.blocking = false;
        player.parryBonus = false;
        attackTimer = 0;
        attackCooldown = 0;
        projectiles.clear();
        showInventory = false;
        keys.clear();
        if (healFull) player.hp = player.maxHp;
    }

    private void restartLevel() {
        loadLevel(levelIndex, true);
        state = State.PLAYING;
        setMessage("Chơi lại màn: " + level.name);
    }

    private void nextLevel() {
        if (levelIndex + 1 >= levels.size()) {
            state = State.VICTORY;
            return;
        }
        loadLevel(levelIndex + 1, true);
        state = State.PLAYING;
        setMessage("Màn " + (levelIndex + 1) + ": " + level.name + " - " + level.desc);
    }

    private void completeLevel() {
        boolean leveled = player.addXp(level.rewardXp);
        player.coins += level.rewardCoins;
        saveGameQuiet();
        if (leveled) setMessage("LÊN CẤP! Cấp " + player.level + " - Máu tối đa +" + 10 + ", sát thương +2.");
        if (levelIndex + 1 >= levels.size()) {
            state = State.VICTORY;
        } else {
            state = State.LEVEL_COMPLETE;
        }
    }

    private void saveGame() {
        try {
            SaveData.save(player, levelIndex, saveFile);
            saveExists = true;
            setMessage("Đã lưu game vào samurai_save.txt");
        } catch (Exception e) {
            setMessage("Lưu game thất bại: " + e.getMessage());
        }
    }

    private void saveGameQuiet() {
        try {
            SaveData.save(player, levelIndex, saveFile);
            saveExists = true;
        } catch (Exception ignored) {
        }
    }

    private void setMessage(String m) {
        message = m;
        messageTimer = 3.5;
    }

    private void addObjectiveProgress(String type, String target) {
        for (Level.Objective o : level.objectives) {
            if (o.type.equals(type) && o.target.equals(target)) o.progress++;
        }
    }

    // ---------- combat actions ----------

    private void tryAttack(int kind) {
        if (attackCooldown > 0 || attackTimer > 0) return;
        int cost = kind == 1 ? 12 : kind == 2 ? 25 : 35;
        if (kind == 3 && skillCooldown > 0) {
            setMessage("Nhất Đao Trảm đang hồi (" + String.format("%.0f", skillCooldown) + "s).");
            return;
        }
        if (player.stamina < cost) {
            setMessage("Hết khí lực! Đừng đánh liên tục, chờ hồi khí lực.");
            return;
        }
        player.stamina -= cost;
        lastStaminaUse = gameTime;
        attackKind = kind;
        attackDuration = kind == 1 ? 0.35 : kind == 2 ? 0.70 : 0.90;
        attackHitDelay = kind == 1 ? 0.12 : kind == 2 ? 0.30 : 0.40;
        attackTimer = attackDuration;
        attackApplied = false;
        attackCooldown = attackDuration;
        if (kind == 3) skillCooldown = 5;
    }

    private void applyAttack() {
        double range = attackKind == 1 ? 2.2 : attackKind == 2 ? 2.6 : 3.4;
        double halfArc = attackKind == 1 ? 0.6 : attackKind == 2 ? 0.7 : 1.0;
        int base = attackKind == 1 ? player.damage : attackKind == 2 ? player.damage + 12 : player.damage * 2 + 14;
        boolean bonus = player.parryBonus;
        for (Enemy e : new ArrayList<>(level.enemies)) {
            if (!e.alive()) continue;
            double dist = Math.hypot(e.x - player.x, e.y - player.y);
            if (dist > range) continue;
            double ang = Math.atan2(e.y - player.y, e.x - player.x);
            double diff = Math.abs(normalizeAngle(ang - player.angle));
            if (diff > halfArc) continue;
            if (rng.nextDouble() < e.dodgeChance) {
                setMessage(e.name + " né được đòn của bạn!");
                continue;
            }
            boolean blocked = rng.nextDouble() < e.blockChance;
            boolean crit = Combat.rollCrit(rng);
            int dmg = Combat.playerDamage(base, e.defense, crit, blocked, bonus);
            if (bonus) player.parryBonus = false;
            e.hp -= dmg;
            setMessage((blocked ? "Địch đỡ! " : crit ? "CHÍ MẠNG! " : "") + e.name + " -" + dmg + " máu.");
            // Small knockback, unless it would push the enemy into a wall.
            double nx = e.x + Math.cos(ang) * 0.25, ny = e.y + Math.sin(ang) * 0.25;
            if (!level.isWallAt(nx, ny)) {
                e.x = nx;
                e.y = ny;
            }
            if (e.hp <= 0) killEnemy(e);
        }
    }

    private void killEnemy(Enemy e) {
        e.hp = 0;
        e.state = Enemy.DEAD;
        player.coins += e.coins;
        boolean leveled = player.addXp(e.xp);
        addObjectiveProgress("KILL", e.kind);
        addObjectiveProgress("BOSS", e.kind);
        setMessage("Hạ " + e.name + "! +" + e.xp + " XP, +" + e.coins + " vàng." + (leveled ? " LÊN CẤP " + player.level + "!" : ""));
        if (!e.boss && rng.nextDouble() < 0.30) {
            level.sprites.add(new Sprite(Sprite.Type.BANDAGE, e.x, e.y, "Băng gạc"));
        }
        if (e.boss) {
            level.sprites.add(new Sprite(Sprite.Type.DRAUGHT, e.x, e.y, "Thuốc hồi máu"));
        }
        checkBossPhases(e);
    }

    private void checkBossPhases(Enemy boss) {
        if (!boss.boss || !boss.alive()) return;
        if (boss.hpPct() < 0.6 && !boss.phase2Done) {
            boss.phase2Done = true;
            String summon = boss.bossId.equals("boss_yamikage") ? "shadow"
                    : boss.bossId.equals("boss_ashura") ? "ashura"
                    : boss.bossId.equals("boss_oni") ? "oni_shield"
                    : boss.bossId.equals("boss_kagemune") ? "ronin" : "grunt";
            for (int i = 0; i < 2; i++) {
                Enemy s = Enemy.create(summon, boss.x + (i == 0 ? 1 : -1), boss.y + 1);
                level.enemies.add(s);
            }
            setMessage("BOSS CHUYỂN PHA! " + boss.name + " triệu hồi thêm tay chân!");
        }
        if (boss.hpPct() < 0.3 && !boss.phase3Done) {
            boss.phase3Done = true;
            boss.speed *= 1.2;
            boss.attack = (int) (boss.attack * 1.2);
            setMessage("BOSS NỔI GIẬN! Tốc độ và sát thương tăng lên!");
        }
    }

    private void tryDodge() {
        if (dodgeCooldown > 0 || player.stamina < 20) {
            setMessage("Chưa né được: cần 20 khí lực và chờ hồi chiêu.");
            return;
        }
        player.stamina -= 20;
        lastStaminaUse = gameTime;
        player.iframes = 0.4;
        dodgeCooldown = 0.8;
        double dx = Math.cos(player.angle), dy = Math.sin(player.angle);
        double nx = player.x + dx * 1.2, ny = player.y + dy * 1.2;
        if (!level.isWallAt(nx, ny)) {
            player.x = nx;
            player.y = ny;
        }
        setMessage("Né! Bất khả xâm phạm trong chốc lát.");
    }

    private void interactShrine() {
        for (Sprite s : level.sprites) {
            if (s.type == Sprite.Type.SHRINE && Math.hypot(s.x - player.x, s.y - player.y) < 1.2) {
                player.hp = player.maxHp;
                player.stamina = 100;
                saveGame();
                setMessage("Đài hồi sinh: hồi đầy máu và đã lưu game!");
                return;
            }
        }
        setMessage("Không có đài hồi sinh gần đây. Hãy đến gần đài (biểu tượng xanh) rồi bấm F.");
    }

    private void tryCraft() {
        if (player.craftBandage()) {
            setMessage("Chế tạo: 2 tre + 1 thảo dược -> 1 băng gạc.");
        } else if (player.craftKatana()) {
            setMessage("Rèn kiếm: 3 quặng sắt -> sát thương +5 (kiếm cấp " + player.katanaLevel + ").");
        } else {
            setMessage("Chế tạo cần: 2 tre + 1 thảo dược = băng gạc, hoặc 3 quặng sắt = rèn kiếm.");
        }
    }

    // ---------- update ----------

    @Override
    public void actionPerformed(ActionEvent e) {
        update(0.016);
        repaint();
    }

    private void update(double dt) {
        if (state != State.PLAYING || showInventory) return;
        gameTime += dt;
        if (messageTimer > 0) messageTimer -= dt;
        if (damageFlash > 0) damageFlash -= dt;
        if (attackCooldown > 0) attackCooldown -= dt;
        if (skillCooldown > 0) skillCooldown -= dt;
        if (dodgeCooldown > 0) dodgeCooldown -= dt;
        if (player.iframes > 0) player.iframes -= dt;
        if (gameTime - lastStaminaUse > 0.8 && player.stamina < 100) {
            player.stamina = Math.min(100, player.stamina + 25 * dt);
        }

        // Attack hit timing.
        if (attackTimer > 0) {
            attackTimer -= dt;
            if (!attackApplied && attackTimer <= attackDuration - attackHitDelay) {
                applyAttack();
                attackApplied = true;
            }
            if (attackTimer <= 0) {
                attackTimer = 0;
                attackKind = 0;
            }
        }

        // Movement and turning.
        boolean sprint = keys.contains(KeyEvent.VK_SHIFT);
        double speed = 3.0;
        if (sprint && player.stamina > 0) {
            speed = 4.5;
            player.stamina = Math.max(0, player.stamina - 15 * dt);
            lastStaminaUse = gameTime;
        }
        if (keys.contains(KeyEvent.VK_A) || keys.contains(KeyEvent.VK_LEFT)) player.angle -= 2.4 * dt;
        if (keys.contains(KeyEvent.VK_D) || keys.contains(KeyEvent.VK_RIGHT)) player.angle += 2.4 * dt;
        double mx = 0, my = 0;
        double dx = Math.cos(player.angle), dy = Math.sin(player.angle);
        if (keys.contains(KeyEvent.VK_W) || keys.contains(KeyEvent.VK_UP)) {
            mx += dx;
            my += dy;
        }
        if (keys.contains(KeyEvent.VK_S) || keys.contains(KeyEvent.VK_DOWN)) {
            mx -= dx;
            my -= dy;
        }
        if (keys.contains(KeyEvent.VK_Q)) {
            mx += dy;
            my -= dx;
        }
        if (keys.contains(KeyEvent.VK_E)) {
            mx -= dy;
            my += dx;
        }
        double len = Math.hypot(mx, my);
        if (len > 0) {
            mx /= len;
            my /= len;
            double nx = player.x + mx * speed * dt;
            double ny = player.y + my * speed * dt;
            if (canMove(nx, player.y)) player.x = nx;
            if (canMove(player.x, ny)) player.y = ny;
        }

        updateEnemies(dt);
        updateProjectiles(dt);
        pickupItems();
        checkGoal();
        // Boss chapters have no REACH objective: finishing all objectives is enough,
        // even if the player never walks to the torii.
        boolean hasReach = false;
        for (Level.Objective o : level.objectives) if (o.type.equals("REACH")) hasReach = true;
        if (state == State.PLAYING && !hasReach && level.objectivesDone()) {
            completeLevel();
        }

        if (player.hp <= 0) {
            player.hp = 0;
            state = State.DEAD;
        }
    }

    private boolean canMove(double x, double y) {
        double r = 0.18;
        return !level.isWallAt(x - r, y - r) && !level.isWallAt(x + r, y - r)
                && !level.isWallAt(x - r, y + r) && !level.isWallAt(x + r, y + r);
    }

    private void updateEnemies(double dt) {
        for (Enemy e : new ArrayList<>(level.enemies)) {
            if (!e.alive()) continue;
            if (e.cooldownTimer > 0) e.cooldownTimer -= dt;
            if (e.stunTimer > 0) {
                e.stunTimer -= dt;
                e.state = Enemy.STUNNED;
                if (e.stunTimer <= 0) e.state = Enemy.IDLE;
                continue;
            }
            double dist = Math.hypot(e.x - player.x, e.y - player.y);
            boolean los = dist <= e.sight && level.hasLineOfSight(e.x, e.y, player.x, player.y);
            if (!los) {
                e.state = Enemy.IDLE;
                continue;
            }
            if (e.ranged) {
                if (dist <= e.attackRange && e.cooldownTimer <= 0) {
                    Projectile pr = new Projectile();
                    pr.x = e.x;
                    pr.y = e.y;
                    double d = Math.max(0.1, dist);
                    pr.dx = (player.x - e.x) / d;
                    pr.dy = (player.y - e.y) / d;
                    pr.damage = e.attack;
                    pr.fire = e.fire;
                    projectiles.add(pr);
                    e.cooldownTimer = e.cooldownTime;
                    if (e.boss) setMessage(e.name + " tung đòn xa!");
                } else if (dist > e.attackRange) {
                    e.state = Enemy.CHASE;
                    moveEnemyTowards(e, dt);
                }
                // Melee handling is below for non-ranged enemies.
            } else if (dist <= e.attackRange) {
                if (e.state == Enemy.WINDUP) {
                    e.windupTimer -= dt;
                    if (e.windupTimer <= 0) {
                        doEnemyAttack(e);
                        e.state = Enemy.COOLDOWN;
                        e.cooldownTimer = e.cooldownTime;
                    }
                } else if (e.cooldownTimer <= 0) {
                    e.state = Enemy.WINDUP;
                    e.windupTimer = 0.5;
                } else {
                    e.state = Enemy.COOLDOWN;
                }
            } else {
                e.state = Enemy.CHASE;
                moveEnemyTowards(e, dt);
            }
            // Boss phase changes are checked every frame, not only on death.
            if (e.boss) {
                if (e.hpPct() < 0.6 && !e.phase2Done) {
                    // Reuse the same phase logic without killing the boss.
                    Enemy copy = e;
                    copy.phase2Done = true;
                    String summon = copy.bossId.equals("boss_yamikage") ? "shadow"
                            : copy.bossId.equals("boss_ashura") ? "ashura"
                            : copy.bossId.equals("boss_oni") ? "oni_shield"
                            : copy.bossId.equals("boss_kagemune") ? "ronin" : "grunt";
                    for (int i = 0; i < 2; i++) {
                        level.enemies.add(Enemy.create(summon, copy.x + (i == 0 ? 1 : -1), copy.y + 1));
                    }
                    setMessage("BOSS CHUYỂN PHA! " + copy.name + " triệu hồi thêm tay chân!");
                }
                if (e.hpPct() < 0.3 && !e.phase3Done) {
                    e.phase3Done = true;
                    e.speed *= 1.2;
                    e.attack = (int) (e.attack * 1.2);
                    setMessage("BOSS NỔI GIẬN! Tốc độ và sát thương tăng lên!");
                }
            }
        }
    }

    private void moveEnemyTowards(Enemy e, double dt) {
        double dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < 0.01) return;
        double nx = e.x + (player.x - e.x) / dist * e.speed * dt;
        double ny = e.y + (player.y - e.y) / dist * e.speed * dt;
        if (!level.isWallAt(nx, e.y)) e.x = nx;
        if (!level.isWallAt(e.x, ny)) e.y = ny;
    }

    private void doEnemyAttack(Enemy e) {
        boolean parry = player.blocking && (System.currentTimeMillis() - player.blockPressedAtMs < 250);
        int dmg = Combat.enemyDamage(e.attack, player.blocking, player.iframes > 0, parry);
        if (parry) {
            e.state = Enemy.STUNNED;
            e.stunTimer = 1.5;
            player.parryBonus = true;
            setMessage("PARRY! " + e.name + " mất thăng bằng, đòn kế của bạn x2 sát thương!");
            return;
        }
        if (player.iframes > 0) {
            setMessage("Né thành công đòn của " + e.name + "!");
            return;
        }
        if (player.blocking) {
            player.stamina = Math.max(0, player.stamina - 8);
            setMessage("Bạn đỡ đòn của " + e.name + " (-" + dmg + " máu).");
        } else if (dmg > 0) {
            setMessage(e.name + " chém bạn -" + dmg + " máu!");
        }
        if (dmg > 0) {
            player.hp -= dmg;
            damageFlash = 0.4;
            Toolkit.getDefaultToolkit().beep();
        }
    }

    private void updateProjectiles(double dt) {
        List<Projectile> dead = new ArrayList<>();
        for (Projectile p : projectiles) {
            p.x += p.dx * 8 * dt;
            p.y += p.dy * 8 * dt;
            if (level.isWallAt(p.x, p.y)) {
                dead.add(p);
                continue;
            }
            if (Math.hypot(p.x - player.x, p.y - player.y) < 0.4) {
                boolean parry = player.blocking && (System.currentTimeMillis() - player.blockPressedAtMs < 250);
                int dmg = Combat.enemyDamage((int) p.damage, player.blocking, player.iframes > 0, parry);
                if (player.iframes <= 0 && dmg > 0) {
                    player.hp -= dmg;
                    damageFlash = 0.4;
                    setMessage("Trúng đòn xa -" + dmg + " máu!");
                }
                dead.add(p);
            }
        }
        projectiles.removeAll(dead);
    }

    private void pickupItems() {
        for (Sprite s : level.sprites) {
            if (s.taken || s.type == Sprite.Type.GOAL || s.type == Sprite.Type.SHRINE) continue;
            if (Math.hypot(s.x - player.x, s.y - player.y) < 0.7) {
                s.taken = true;
                switch (s.type) {
                    case BANDAGE: player.bandage++; setMessage("Nhặt được băng gạc (+1). Bấm 1 để dùng."); break;
                    case DRAUGHT: player.draught++; setMessage("Nhặt được thuốc hồi máu (+1). Bấm 2 để dùng."); break;
                    case BAMBOO: player.bamboo++; addObjectiveProgress("COLLECT", "bamboo"); setMessage("Nhặt được tre (" + player.bamboo + ")."); break;
                    case HERB: player.herb++; setMessage("Nhặt được thảo dược (" + player.herb + ")."); break;
                    case IRON: player.iron++; addObjectiveProgress("COLLECT", "iron"); setMessage("Nhặt được quặng sắt (" + player.iron + ")."); break;
                    default: break;
                }
            }
        }
    }

    private void checkGoal() {
        for (Sprite s : level.sprites) {
            if (s.type != Sprite.Type.GOAL) continue;
            if (Math.hypot(s.x - player.x, s.y - player.y) < 0.9) {
                if (level.objectivesDone()) {
                    completeLevel();
                } else if (messageTimer <= 0) {
                    setMessage("Chưa hoàn thành nhiệm vụ: " + level.remainingObjectives());
                }
            }
        }
    }

    private static double normalizeAngle(double a) {
        while (a > Math.PI) a -= 2 * Math.PI;
        while (a < -Math.PI) a += 2 * Math.PI;
        return a;
    }

    // ---------- rendering ----------

    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        Graphics2D g2 = (Graphics2D) g;
        if (state == State.MENU) {
            drawMenu(g2);
            return;
        }
        render3d(g2);
        drawHud(g2);
        if (showInventory) drawInventory(g2);
        if (state == State.PAUSED) drawOverlay(g2, "TẠM DỪNG", "Esc: tiếp tục  ·  M: về menu  ·  F5: lưu game");
        if (state == State.DEAD) drawOverlay(g2, "BẠN ĐÃ GỤC NGÃ", "R: chơi lại màn này  ·  M: về menu");
        if (state == State.LEVEL_COMPLETE) drawOverlay(g2, "HOÀN THÀNH MÀN!",
                "Thưởng: +" + level.rewardXp + " XP, +" + level.rewardCoins + " vàng  ·  N: sang màn tiếp  ·  M: về menu");
        if (state == State.VICTORY) drawOverlay(g2, "CHIẾN THẮNG!",
                "Bạn đã hạ Yamikage và hoàn thành hành trình.  ·  Enter / M: về menu");
    }

    private void render3d(Graphics2D g) {
        // Sky and floor.
        g.setColor(level.ceiling);
        g.fillRect(0, 0, W, H / 2);
        g.setColor(level.floor);
        g.fillRect(0, H / 2, W, H / 2);
        double dirX = Math.cos(player.angle), dirY = Math.sin(player.angle);
        double planeX = -dirY * 0.66, planeY = dirX * 0.66;
        for (int x = 0; x < W; x++) {
            double cameraX = 2.0 * x / W - 1;
            double rayDirX = dirX + planeX * cameraX;
            double rayDirY = dirY + planeY * cameraX;
            int mapX = (int) Math.floor(player.x), mapY = (int) Math.floor(player.y);
            double deltaX = rayDirX == 0 ? 1e30 : Math.abs(1 / rayDirX);
            double deltaY = rayDirY == 0 ? 1e30 : Math.abs(1 / rayDirY);
            int stepX, stepY, side = 0;
            double sideX, sideY;
            if (rayDirX < 0) {
                stepX = -1;
                sideX = (player.x - mapX) * deltaX;
            } else {
                stepX = 1;
                sideX = (mapX + 1 - player.x) * deltaX;
            }
            if (rayDirY < 0) {
                stepY = -1;
                sideY = (player.y - mapY) * deltaY;
            } else {
                stepY = 1;
                sideY = (mapY + 1 - player.y) * deltaY;
            }
            int wallType = 0;
            int guard = 0;
            while (guard++ < 100) {
                if (sideX < sideY) {
                    sideX += deltaX;
                    mapX += stepX;
                    side = 0;
                } else {
                    sideY += deltaY;
                    mapY += stepY;
                    side = 1;
                }
                if (mapX < 0 || mapY < 0 || mapX >= level.width || mapY >= level.height) {
                    wallType = 1;
                    break;
                }
                wallType = level.wall[mapY][mapX];
                if (wallType != 0) break;
            }
            double dist = side == 0 ? sideX - deltaX : sideY - deltaY;
            if (dist < 0.05) dist = 0.05;
            zbuffer[x] = dist;
            int lineH = (int) (H / dist);
            int top = Math.max(0, -lineH / 2 + H / 2);
            int bottom = Math.min(H, lineH / 2 + H / 2);
            double shade = 1.0 / (1.0 + dist * 0.18);
            if (side == 1) shade *= 0.7;
            Color base = wallType == 2 ? new Color(45, 95, 50) : new Color(125, 105, 80);
            g.setColor(new Color(
                    (int) (base.getRed() * shade),
                    (int) (base.getGreen() * shade),
                    (int) (base.getBlue() * shade)));
            g.fillRect(x, top, 1, bottom - top);
        }
        drawSprites(g, dirX, dirY, planeX, planeY);
        // Slash arc.
        if (attackTimer > 0) {
            g.setColor(new Color(255, 240, 180, 180));
            g.drawArc(W / 2 - 70, H / 2 - 40, 140, 140, 20, 140);
            g.setColor(new Color(255, 255, 255, 120));
            g.drawArc(W / 2 - 50, H / 2 - 20, 100, 100, 30, 120);
        }
        if (damageFlash > 0) {
            g.setColor(new Color(255, 0, 0, 70));
            g.fillRect(0, 0, W, H);
        }
    }

    private void drawSprites(Graphics2D g, double dirX, double dirY, double planeX, double planeY) {
        // Collect billboards: enemies, items, goal, shrine, projectiles as small dots.
        List<Object[]> items = new ArrayList<>();
        for (Enemy e : level.enemies) {
            if (e.alive()) items.add(new Object[]{e.x, e.y, e});
        }
        for (Sprite s : level.sprites) {
            if (!s.taken) items.add(new Object[]{s.x, s.y, s});
        }
        for (Projectile p : projectiles) items.add(new Object[]{p.x, p.y, p});
        items.sort((a, b) -> Double.compare(
                Math.hypot((double) b[0] - player.x, (double) b[1] - player.y),
                Math.hypot((double) a[0] - player.x, (double) a[1] - player.y)));
        double invDet = 1.0 / (planeX * dirY - dirX * planeY);
        for (Object[] it : items) {
            double sx = (double) it[0], sy = (double) it[1];
            double relX = sx - player.x, relY = sy - player.y;
            double tx = invDet * (dirY * relX - dirX * relY);
            double ty = invDet * (-planeY * relX + planeX * relY);
            if (ty <= 0.1) continue;
            int screenX = (int) ((W / 2.0) * (1 + tx / ty));
            if (screenX < 0 || screenX >= W) continue;
            if (ty > zbuffer[Math.max(0, Math.min(W - 1, screenX))]) continue;
            if (it[2] instanceof Enemy) drawEnemy(g, (Enemy) it[2], screenX, ty);
            else if (it[2] instanceof Sprite) drawItemSprite(g, (Sprite) it[2], screenX, ty);
            else {
                Projectile p = (Projectile) it[2];
                int size = Math.max(4, (int) (40 / ty));
                g.setColor(p.fire ? Color.ORANGE : new Color(180, 200, 255));
                g.fillOval(screenX - size / 2, H / 2 - size / 2, size, size);
            }
        }
    }

    private void drawEnemy(Graphics2D g, Enemy e, int screenX, double dist) {
        int size = (int) (H / dist * e.scale);
        int w = Math.max(10, size / 2);
        int h = Math.max(20, size);
        int top = H / 2 - h / 2;
        if (e.state == Enemy.WINDUP) {
            g.setColor(new Color(255, 60, 60, 120));
            g.fillRect(screenX - w / 2 - 4, top - 4, w + 8, h + 8);
        }
        g.setColor(e.cloth);
        g.fillRect(screenX - w / 2, top + h / 3, w, h * 2 / 3);
        g.setColor(new Color(200, 170, 140));
        g.fillOval(screenX - w / 4, top, w / 2, w / 2);
        g.setColor(Color.LIGHT_GRAY);
        g.drawLine(screenX + w / 4, top + h / 3, screenX + w / 2 + 10, top + h / 6);
        // HP bar.
        int barW = Math.max(30, w);
        g.setColor(Color.DARK_GRAY);
        g.fillRect(screenX - barW / 2, top - 14, barW, 7);
        g.setColor(e.boss ? Color.RED : Color.GREEN);
        g.fillRect(screenX - barW / 2, top - 14, (int) (barW * e.hpPct()), 7);
        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.BOLD, 11));
        String label = e.boss ? e.name : e.name;
        g.drawString(label, screenX - g.getFontMetrics().stringWidth(label) / 2, top - 18);
    }

    private void drawItemSprite(Graphics2D g, Sprite s, int screenX, double dist) {
        int size = (int) (H / dist * 0.35);
        int top = H / 2 - size / 2;
        switch (s.type) {
            case GOAL:
                g.setColor(new Color(180, 30, 30));
                g.fillRect(screenX - size / 2, top, 10, size);
                g.fillRect(screenX + size / 2 - 10, top, 10, size);
                g.fillRect(screenX - size / 2 - 8, top, size + 16, 12);
                break;
            case SHRINE:
                g.setColor(new Color(120, 130, 140));
                g.fillRect(screenX - size / 4, top + size / 3, size / 2, size * 2 / 3);
                g.setColor(new Color(80, 200, 220));
                g.fillOval(screenX - 8, top, 16, 16);
                break;
            case BANDAGE:
                g.setColor(Color.WHITE);
                g.fillRect(screenX - size / 2, top + size / 4, size, size / 2);
                g.setColor(Color.RED);
                g.fillRect(screenX - 4, top + size / 3, 8, size / 3);
                g.fillRect(screenX - size / 6, top + size / 3 + 6, size / 3, 8);
                break;
            case DRAUGHT:
                g.setColor(new Color(60, 120, 220));
                g.fillOval(screenX - size / 4, top + size / 4, size / 2, size / 2);
                break;
            case BAMBOO:
                g.setColor(new Color(40, 160, 60));
                for (int i = -1; i <= 1; i++) g.fillRect(screenX + i * 8, top, 4, size);
                break;
            case HERB:
                g.setColor(new Color(60, 180, 80));
                g.fillOval(screenX - size / 3, top + size / 4, size * 2 / 3, size / 2);
                break;
            case IRON:
                g.setColor(new Color(130, 130, 140));
                g.fillRect(screenX - size / 3, top + size / 3, size * 2 / 3, size / 2);
                break;
            default:
                break;
        }
    }

    private void drawHud(Graphics2D g) {
        g.setColor(new Color(0, 0, 0, 140));
        g.fillRect(8, 8, 430, 118);
        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.BOLD, 14));
        g.drawString(level.id + " - " + level.name, 18, 28);
        g.setFont(new Font("SansSerif", Font.PLAIN, 12));
        g.drawString("Máu: " + player.hp + "/" + player.maxHp, 18, 48);
        g.setColor(Color.DARK_GRAY);
        g.fillRect(110, 38, 200, 12);
        g.setColor(Color.RED);
        g.fillRect(110, 38, (int) (200 * Math.max(0, (double) player.hp / player.maxHp)), 12);
        g.setColor(Color.WHITE);
        g.drawString("Khí lực: " + (int) player.stamina, 18, 68);
        g.setColor(Color.DARK_GRAY);
        g.fillRect(110, 58, 200, 12);
        g.setColor(Color.YELLOW);
        g.fillRect(110, 58, (int) (200 * player.stamina / 100), 12);
        g.setColor(Color.WHITE);
        g.drawString("Cấp " + player.level + " | XP " + player.xp + "/" + player.xpNext
                + " | Vàng " + player.coins + " | Sát thương " + player.damage + " | Kiếm cấp " + player.katanaLevel, 18, 88);
        g.drawString("Nhiệm vụ:", 18, 108);
        int y = 108;
        for (Level.Objective o : level.objectives) {
            y += 0; // objectives are drawn below the panel to keep the HUD readable
        }
        // Objectives panel.
        g.setColor(new Color(0, 0, 0, 140));
        g.fillRect(8, 132, 430, 20 + level.objectives.size() * 16);
        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.PLAIN, 12));
        int oy = 150;
        for (Level.Objective o : level.objectives) {
            g.drawString((o.done() ? "[x] " : "[ ] ") + o.text + " (" + o.progress + "/" + o.required + ")", 18, oy);
            oy += 16;
        }
        // Boss bar.
        Enemy boss = level.boss();
        if (boss != null) {
            g.setColor(Color.WHITE);
            g.setFont(new Font("SansSerif", Font.BOLD, 13));
            String label = boss.name;
            g.drawString(label, W / 2 - g.getFontMetrics().stringWidth(label) / 2, 30);
            g.setColor(Color.DARK_GRAY);
            g.fillRect(W / 2 - 200, 36, 400, 14);
            g.setColor(Color.RED);
            g.fillRect(W / 2 - 200, 36, (int) (400 * boss.hpPct()), 14);
        }
        drawMinimap(g);
        if (messageTimer > 0) {
            g.setFont(new Font("SansSerif", Font.BOLD, 14));
            g.setColor(Color.YELLOW);
            g.drawString(message, W / 2 - g.getFontMetrics().stringWidth(message) / 2, H - 42);
        }
        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.PLAIN, 11));
        g.drawString("W/S di chuyển · A/D xoay · Q/E lách · Shift chạy nhanh · J đánh nhẹ · K đánh mạnh · U Nhất Đao Trảm · L đỡ (đúng lúc = Parry) · I né · F đài hồi sinh · 1/2 dùng thuốc · C chế tạo · Tab túi đồ · Esc tạm dừng · F5 lưu", 12, H - 16);
    }

    private void drawMinimap(Graphics2D g) {
        int cell = 5;
        int x0 = W - level.width * cell - 12, y0 = 12;
        g.setColor(new Color(0, 0, 0, 160));
        g.fillRect(x0 - 4, y0 - 4, level.width * cell + 8, level.height * cell + 8);
        for (int y = 0; y < level.height; y++) {
            for (int x = 0; x < level.width; x++) {
                if (level.wall[y][x] == 1) g.setColor(Color.WHITE);
                else if (level.wall[y][x] == 2) g.setColor(new Color(40, 140, 60));
                else g.setColor(new Color(60, 60, 60));
                g.fillRect(x0 + x * cell, y0 + y * cell, cell - 1, cell - 1);
            }
        }
        for (Sprite s : level.sprites) {
            if (s.taken) continue;
            if (s.type == Sprite.Type.GOAL) g.setColor(Color.YELLOW);
            else if (s.type == Sprite.Type.SHRINE) g.setColor(Color.CYAN);
            else g.setColor(Color.GREEN);
            g.fillRect(x0 + (int) s.x * cell, y0 + (int) s.y * cell, 4, 4);
        }
        for (Enemy e : level.enemies) {
            if (!e.alive()) continue;
            g.setColor(e.boss ? Color.RED : Color.ORANGE);
            g.fillRect(x0 + (int) e.x * cell, y0 + (int) e.y * cell, 4, 4);
        }
        g.setColor(Color.YELLOW);
        g.fillOval(x0 + (int) player.x * cell - 2, y0 + (int) player.y * cell - 2, 6, 6);
    }

    private void drawInventory(Graphics2D g) {
        g.setColor(new Color(0, 0, 0, 200));
        g.fillRect(W / 2 - 220, H / 2 - 150, 440, 300);
        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.BOLD, 16));
        g.drawString("TÚI ĐỒ", W / 2 - 40, H / 2 - 120);
        g.setFont(new Font("SansSerif", Font.PLAIN, 14));
        String[] lines = {
                "Băng gạc (bấm 1, hồi 30 máu): " + player.bandage,
                "Thuốc hồi máu (bấm 2, hồi 60 máu): " + player.draught,
                "Tre: " + player.bamboo + "  ·  Thảo dược: " + player.herb + "  ·  Quặng sắt: " + player.iron,
                "Vàng: " + player.coins + "  ·  Kiếm cấp " + player.katanaLevel + " (sát thương " + player.damage + ")",
                "Chế tạo (bấm C): 2 tre + 1 thảo dược = 1 băng gạc;",
                "  hoặc 3 quặng sắt = rèn kiếm +5 sát thương.",
                "Tab: đóng túi đồ. Game tạm dừng khi mở túi đồ."
        };
        int y = H / 2 - 90;
        for (String line : lines) {
            g.drawString(line, W / 2 - 200, y);
            y += 24;
        }
    }

    private void drawMenu(Graphics2D g) {
        g.setColor(new Color(20, 25, 35));
        g.fillRect(0, 0, W, H);
        g.setColor(new Color(200, 60, 60));
        g.setFont(new Font("SansSerif", Font.BOLD, 42));
        drawCentered(g, "ĐẠO CỦA KẺ VÔ DANH", 110);
        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.PLAIN, 20));
        drawCentered(g, "Samurai 3D - bản Java thuần (Swing, không cần thư viện ngoài)", 150);
        g.setFont(new Font("SansSerif", Font.PLAIN, 15));
        String[] lines = {
                "Enter: Chơi mới",
                "L: Tiếp tục (nếu có samurai_save.txt)",
                "W/S di chuyển · A/D xoay · Q/E lách sang · Shift chạy nhanh",
                "J đánh nhẹ · K đánh mạnh · U Nhất Đao Trảm · L giữ để đỡ (nhấn đúng lúc = Parry)",
                "I né · F tương tác đài hồi sinh · 1/2 dùng thuốc · C chế tạo · Tab túi đồ · Esc tạm dừng · F5 lưu",
                "Mục tiêu mỗi màn hiện ở góc trái trên. Đến cổng Torii khi đã xong nhiệm vụ để qua màn.",
                "Esc ở menu: thoát game."
        };
        int y = 210;
        for (String line : lines) {
            drawCentered(g, line, y);
            y += 30;
        }
        if (!menuMessage.isEmpty()) {
            g.setColor(Color.YELLOW);
            drawCentered(g, menuMessage, y + 20);
        } else if (saveExists) {
            g.setColor(Color.GREEN);
            drawCentered(g, "Đã tìm thấy file lưu samurai_save.txt - bấm L để tiếp tục.", y + 20);
        }
    }

    private void drawOverlay(Graphics2D g, String title, String hint) {
        g.setColor(new Color(0, 0, 0, 170));
        g.fillRect(0, 0, W, H);
        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.BOLD, 36));
        drawCentered(g, title, H / 2 - 20);
        g.setFont(new Font("SansSerif", Font.PLAIN, 16));
        drawCentered(g, hint, H / 2 + 30);
    }

    private void drawCentered(Graphics2D g, String text, int y) {
        g.drawString(text, W / 2 - g.getFontMetrics().stringWidth(text) / 2, y);
    }

    // ---------- input ----------

    @Override
    public void keyPressed(KeyEvent e) {
        int code = e.getKeyCode();
        boolean first = keys.add(code);
        if (state == State.MENU) {
            if (code == KeyEvent.VK_ENTER) startNew();
            else if (code == KeyEvent.VK_L) loadGame();
            else if (code == KeyEvent.VK_ESCAPE) System.exit(0);
            return;
        }
        if (state == State.PAUSED) {
            if (code == KeyEvent.VK_ESCAPE) state = State.PLAYING;
            else if (code == KeyEvent.VK_M) state = State.MENU;
            else if (code == KeyEvent.VK_F5) saveGame();
            return;
        }
        if (state == State.DEAD) {
            if (code == KeyEvent.VK_R) restartLevel();
            else if (code == KeyEvent.VK_M) state = State.MENU;
            return;
        }
        if (state == State.LEVEL_COMPLETE) {
            if (code == KeyEvent.VK_N) nextLevel();
            else if (code == KeyEvent.VK_M) state = State.MENU;
            return;
        }
        if (state == State.VICTORY) {
            if (code == KeyEvent.VK_ENTER || code == KeyEvent.VK_M) state = State.MENU;
            return;
        }
        // PLAYING
        if (!first) return;
        switch (code) {
            case KeyEvent.VK_J: tryAttack(1); break;
            case KeyEvent.VK_K: tryAttack(2); break;
            case KeyEvent.VK_U: tryAttack(3); break;
            case KeyEvent.VK_I: tryDodge(); break;
            case KeyEvent.VK_F: interactShrine(); break;
            case KeyEvent.VK_C: tryCraft(); break;
            case KeyEvent.VK_1:
                if (player.useBandage()) setMessage("Dùng băng gạc, hồi 30 máu.");
                else setMessage("Không dùng được băng gạc (hết hoặc đã đầy máu).");
                break;
            case KeyEvent.VK_2:
                if (player.useDraught()) setMessage("Dùng thuốc hồi máu, hồi 60 máu.");
                else setMessage("Không dùng được thuốc (hết hoặc đã đầy máu).");
                break;
            case KeyEvent.VK_TAB: showInventory = !showInventory; break;
            case KeyEvent.VK_ESCAPE: state = State.PAUSED; break;
            case KeyEvent.VK_F5: saveGame(); break;
            case KeyEvent.VK_L:
                player.blocking = true;
                player.blockPressedAtMs = System.currentTimeMillis();
                break;
            default: break;
        }
    }

    @Override
    public void keyReleased(KeyEvent e) {
        keys.remove(e.getKeyCode());
        if (e.getKeyCode() == KeyEvent.VK_L) player.blocking = false;
    }

    @Override
    public void keyTyped(KeyEvent e) {
    }
}
