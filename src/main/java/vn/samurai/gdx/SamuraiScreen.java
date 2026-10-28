package vn.samurai.gdx;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input.Keys;
import com.badlogic.gdx.Screen;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.PerspectiveCamera;
import com.badlogic.gdx.graphics.VertexAttributes;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.GlyphLayout;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.freetype.FreeTypeFontGenerator;
import com.badlogic.gdx.graphics.g3d.Environment;
import com.badlogic.gdx.graphics.g3d.ModelBatch;
import com.badlogic.gdx.graphics.g3d.ModelInstance;
import com.badlogic.gdx.graphics.g3d.attributes.ColorAttribute;
import com.badlogic.gdx.graphics.g3d.environment.DirectionalLight;
import com.badlogic.gdx.graphics.g3d.utils.ModelBuilder;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.math.Vector3;
import com.badlogic.gdx.utils.Array;
import vn.samurai.Combat;
import vn.samurai.Enemy;
import vn.samurai.Level;
import vn.samurai.Levels;
import vn.samurai.Player;
import vn.samurai.SaveData;
import vn.samurai.Sprite;

import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * True 3D first-person game built on LibGDX (LWJGL3).
 *
 * Game rules, maps, enemies, bosses, combat maths, crafting, XP and saves are
 * reused unchanged from the old Swing version (vn.samurai.Player, Enemy,
 * Level, Levels, Combat, SaveData). Only the presentation changed: instead of
 * raycasting flat walls with Graphics2D, the world is real 3D geometry
 * (PerspectiveCamera + ModelBatch), with box/cone/sphere models for walls,
 * trees, torii, shrines, enemies and items, real lighting, head-bob and a
 * 3D view model feel. Map coordinates are the same: map x -> world X,
 * map y -> world Z, up is world Y.
 */
public class SamuraiScreen implements Screen {
    private enum State { MENU, PLAYING, PAUSED, DEAD, LEVEL_COMPLETE, VICTORY }

    private static class Projectile {
        double x, y, dx, dy, damage;
        boolean fire;
    }

    private static final int W = 1024, H = 640;
    private static final int[] ACTION_KEYS = {
            Keys.ENTER, Keys.L, Keys.R, Keys.N, Keys.M, Keys.ESCAPE, Keys.F5,
            Keys.TAB, Keys.J, Keys.K, Keys.U, Keys.I, Keys.F, Keys.C,
            Keys.NUM_1, Keys.NUM_2
    };

    private final File saveFile = new File("samurai_save.txt");
    private final Random rng = new Random();
    private final List<Projectile> projectiles = new ArrayList<>();
    private final Set<Integer> prevPressed = new HashSet<>();

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

    // LibGDX rendering.
    private PerspectiveCamera camera;
    private ModelBatch modelBatch;
    private Environment environment;
    private SpriteBatch batch;
    private BitmapFont font;
    private BitmapFont bigFont;
    private ShapeRenderer shapes;
    private final GlyphLayout layout = new GlyphLayout();
    private final Array<com.badlogic.gdx.graphics.g3d.Model> allModels = new Array<>();
    private final Map<Enemy, ModelInstance[]> enemyModels = new HashMap<>();
    private com.badlogic.gdx.graphics.g3d.Model wallModel;
    private com.badlogic.gdx.graphics.g3d.Model treeModel;
    private com.badlogic.gdx.graphics.g3d.Model groundModel;
    private com.badlogic.gdx.graphics.g3d.Model headModel;
    private com.badlogic.gdx.graphics.g3d.Model swordModel;
    private com.badlogic.gdx.graphics.g3d.Model sphereSmallModel;
    private com.badlogic.gdx.graphics.g3d.Model boxSmallModel;
    private com.badlogic.gdx.graphics.g3d.Model toriiPillarModel;
    private com.badlogic.gdx.graphics.g3d.Model toriiBeamModel;
    private final Map<String, com.badlogic.gdx.graphics.g3d.Model> bodyModels = new HashMap<>();

    @Override
    public void show() {
        camera = new PerspectiveCamera(67, W, H);
        camera.near = 0.1f;
        camera.far = 100f;
        modelBatch = new ModelBatch();
        environment = new Environment();
        environment.set(new ColorAttribute(ColorAttribute.AmbientLight, 0.55f, 0.55f, 0.55f, 1f));
        environment.add(new DirectionalLight().set(0.9f, 0.9f, 0.85f, -0.5f, -1f, -0.3f));
        batch = new SpriteBatch();
        shapes = new ShapeRenderer();
        font = loadFont(16);
        bigFont = loadFont(32);
        buildModels();
        saveExists = saveFile.exists();
        player.x = level.startX;
        player.y = level.startY;
        player.angle = level.startAngle;
    }

    private BitmapFont loadFont(int size) {
        try {
            FreeTypeFontGenerator generator =
                    new FreeTypeFontGenerator(Gdx.files.classpath("fonts/DejaVuSans.ttf"));
            FreeTypeFontGenerator.FreeTypeFontParameter p =
                    new FreeTypeFontGenerator.FreeTypeFontParameter();
            p.size = size;
            p.characters = FreeTypeFontGenerator.DEFAULT_CHARS
                    + "àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợ"
                    + "ùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊ"
                    + "ÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ–—·";
            BitmapFont f = generator.generateFont(p);
            generator.dispose();
            return f;
        } catch (Exception e) {
            // Fallback: plain LibGDX font (ASCII only, but the game still runs).
            return new BitmapFont();
        }
    }

    private static Color awt(vn.samurai.RgbColor c) {
        return new Color(c.r / 255f, c.g / 255f, c.b / 255f, 1f);
    }

    private com.badlogic.gdx.graphics.g3d.Model box(Color color, float w, float h, float d) {
        ModelBuilder b = new ModelBuilder();
        com.badlogic.gdx.graphics.g3d.Model m = b.createBox(w, h, d,
                new com.badlogic.gdx.graphics.g3d.Material(ColorAttribute.createDiffuse(color)),
                VertexAttributes.Usage.Position | VertexAttributes.Usage.Normal);
        allModels.add(m);
        return m;
    }

    private com.badlogic.gdx.graphics.g3d.Model sphere(Color color, float r) {
        ModelBuilder b = new ModelBuilder();
        com.badlogic.gdx.graphics.g3d.Model m = b.createSphere(r * 2, r * 2, r * 2, 12, 12,
                new com.badlogic.gdx.graphics.g3d.Material(ColorAttribute.createDiffuse(color)),
                VertexAttributes.Usage.Position | VertexAttributes.Usage.Normal);
        allModels.add(m);
        return m;
    }

    private com.badlogic.gdx.graphics.g3d.Model cone(Color color, float w, float h, float d) {
        ModelBuilder b = new ModelBuilder();
        com.badlogic.gdx.graphics.g3d.Model m = b.createCone(w, h, d, 10,
                new com.badlogic.gdx.graphics.g3d.Material(ColorAttribute.createDiffuse(color)),
                VertexAttributes.Usage.Position | VertexAttributes.Usage.Normal);
        allModels.add(m);
        return m;
    }

    private void buildModels() {
        wallModel = box(new Color(0.49f, 0.41f, 0.31f, 1f), 1f, 1f, 1f);
        treeModel = cone(new Color(0.18f, 0.37f, 0.20f, 1f), 1.1f, 1.6f, 1.1f);
        groundModel = box(new Color(0.30f, 0.28f, 0.22f, 1f), 1f, 0.1f, 1f);
        headModel = sphere(new Color(0.78f, 0.67f, 0.55f, 1f), 0.22f);
        swordModel = box(new Color(0.85f, 0.87f, 0.90f, 1f), 0.07f, 0.95f, 0.07f);
        sphereSmallModel = sphere(Color.WHITE, 0.22f);
        boxSmallModel = box(Color.WHITE, 0.4f, 0.4f, 0.4f);
        toriiPillarModel = box(new Color(0.70f, 0.12f, 0.12f, 1f), 0.2f, 2.2f, 0.2f);
        toriiBeamModel = box(new Color(0.70f, 0.12f, 0.12f, 1f), 1.8f, 0.2f, 0.3f);
    }

    private com.badlogic.gdx.graphics.g3d.Model bodyModelFor(Enemy e) {
        String key = e.kind;
        com.badlogic.gdx.graphics.g3d.Model m = bodyModels.get(key);
        if (m == null) {
            m = box(awt(e.cloth), 0.7f, 1.1f, 0.35f);
            bodyModels.put(key, m);
        }
        return m;
    }

    private ModelInstance[] enemyInstances(Enemy e) {
        ModelInstance[] parts = enemyModels.get(e);
        if (parts == null) {
            parts = new ModelInstance[]{
                    new ModelInstance(bodyModelFor(e)),
                    new ModelInstance(headModel),
                    new ModelInstance(swordModel)
            };
            enemyModels.put(e, parts);
        }
        return parts;
    }

    /** Place a model instance in the world, facing yaw degrees around Y. */
    private static void place(ModelInstance inst, float wx, float wy, float wz,
                              float yawDeg, float scale,
                              float lx, float ly, float lz, float rollDeg) {
        inst.transform.idt()
                .translate(wx, wy, wz)
                .rotate(Vector3.Y, yawDeg)
                .translate(lx, ly, lz)
                .rotate(Vector3.Z, rollDeg)
                .scale(scale, scale, scale);
    }

    private static void place(ModelInstance inst, float wx, float wy, float wz,
                              float yawDeg, float scale) {
        place(inst, wx, wy, wz, yawDeg, scale, 0, 0, 0, 0);
    }

    // ---------- game flow (same rules as the Swing version) ----------

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
        enemyModels.clear();
        showInventory = false;
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
        if (leveled) setMessage("LÊN CẤP! Cấp " + player.level + " - Máu tối đa +10, sát thương +2.");
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

    private static double normalizeAngle(double a) {
        while (a > Math.PI) a -= 2 * Math.PI;
        while (a < -Math.PI) a += 2 * Math.PI;
        return a;
    }

    // ---------- update ----------

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

        player.blocking = Gdx.input.isKeyPressed(Keys.L);

        boolean sprint = Gdx.input.isKeyPressed(Keys.SHIFT_LEFT) || Gdx.input.isKeyPressed(Keys.SHIFT_RIGHT);
        double speed = 3.0;
        if (sprint && player.stamina > 0) {
            speed = 4.5;
            player.stamina = Math.max(0, player.stamina - 15 * dt);
            lastStaminaUse = gameTime;
        }
        if (Gdx.input.isKeyPressed(Keys.A) || Gdx.input.isKeyPressed(Keys.LEFT)) player.angle -= 2.4 * dt;
        if (Gdx.input.isKeyPressed(Keys.D) || Gdx.input.isKeyPressed(Keys.RIGHT)) player.angle += 2.4 * dt;
        double mx = 0, my = 0;
        double dx = Math.cos(player.angle), dy = Math.sin(player.angle);
        if (Gdx.input.isKeyPressed(Keys.W) || Gdx.input.isKeyPressed(Keys.UP)) {
            mx += dx;
            my += dy;
        }
        if (Gdx.input.isKeyPressed(Keys.S) || Gdx.input.isKeyPressed(Keys.DOWN)) {
            mx -= dx;
            my -= dy;
        }
        if (Gdx.input.isKeyPressed(Keys.Q)) {
            mx += dy;
            my -= dx;
        }
        if (Gdx.input.isKeyPressed(Keys.E)) {
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
            if (e.boss) {
                if (e.hpPct() < 0.6 && !e.phase2Done) {
                    e.phase2Done = true;
                    String summon = e.bossId.equals("boss_yamikage") ? "shadow"
                            : e.bossId.equals("boss_ashura") ? "ashura"
                            : e.bossId.equals("boss_oni") ? "oni_shield"
                            : e.bossId.equals("boss_kagemune") ? "ronin" : "grunt";
                    for (int i = 0; i < 2; i++) {
                        level.enemies.add(Enemy.create(summon, e.x + (i == 0 ? 1 : -1), e.y + 1));
                    }
                    setMessage("BOSS CHUYỂN PHA! " + e.name + " triệu hồi thêm tay chân!");
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

    // ---------- input (edge detection: a key press fires once, not every frame) ----------

    private boolean justPressed(int key) {
        return Gdx.input.isKeyPressed(key) && !prevPressed.contains(key);
    }

    private void handleInput() {
        if (state == State.MENU) {
            if (justPressed(Keys.ENTER)) startNew();
            else if (justPressed(Keys.L)) loadGame();
            else if (justPressed(Keys.ESCAPE)) Gdx.app.exit();
            return;
        }
        if (state == State.PAUSED) {
            if (justPressed(Keys.ESCAPE)) state = State.PLAYING;
            else if (justPressed(Keys.M)) state = State.MENU;
            else if (justPressed(Keys.F5)) saveGame();
            return;
        }
        if (state == State.DEAD) {
            if (justPressed(Keys.R)) restartLevel();
            else if (justPressed(Keys.M)) state = State.MENU;
            return;
        }
        if (state == State.LEVEL_COMPLETE) {
            if (justPressed(Keys.N)) nextLevel();
            else if (justPressed(Keys.M)) state = State.MENU;
            return;
        }
        if (state == State.VICTORY) {
            if (justPressed(Keys.ENTER) || justPressed(Keys.M)) state = State.MENU;
            return;
        }
        // PLAYING (works even while the inventory is open, which pauses the world).
        if (justPressed(Keys.J)) tryAttack(1);
        else if (justPressed(Keys.K)) tryAttack(2);
        else if (justPressed(Keys.U)) tryAttack(3);
        else if (justPressed(Keys.I)) tryDodge();
        else if (justPressed(Keys.F)) interactShrine();
        else if (justPressed(Keys.C)) tryCraft();
        else if (justPressed(Keys.NUM_1)) {
            if (player.useBandage()) setMessage("Dùng băng gạc, hồi 30 máu.");
            else setMessage("Không dùng được băng gạc (hết hoặc đã đầy máu).");
        } else if (justPressed(Keys.NUM_2)) {
            if (player.useDraught()) setMessage("Dùng thuốc hồi máu, hồi 60 máu.");
            else setMessage("Không dùng được thuốc (hết hoặc đã đầy máu).");
        } else if (justPressed(Keys.TAB)) showInventory = !showInventory;
        else if (justPressed(Keys.ESCAPE)) state = State.PAUSED;
        else if (justPressed(Keys.F5)) saveGame();
        if (justPressed(Keys.L)) player.blockPressedAtMs = System.currentTimeMillis();
    }

    private void refreshPrevPressed() {
        prevPressed.clear();
        for (int k : ACTION_KEYS) {
            if (Gdx.input.isKeyPressed(k)) prevPressed.add(k);
        }
    }

    // ---------- rendering ----------

    @Override
    public void render(float delta) {
        float dt = Math.min(delta, 0.05f);
        handleInput();
        update(dt);
        refreshPrevPressed();

        if (state == State.MENU) {
            Gdx.gl.glClearColor(0.08f, 0.10f, 0.14f, 1f);
            Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT | GL20.GL_DEPTH_BUFFER_BIT);
            drawMenu();
            return;
        }

        render3d();
        drawHud();
        if (showInventory) drawInventory();
        if (state == State.PAUSED) drawOverlay("TẠM DỪNG", "Esc: tiếp tục  ·  M: về menu  ·  F5: lưu game");
        if (state == State.DEAD) drawOverlay("BẠN ĐÃ GỤC NGÃ", "R: chơi lại màn này  ·  M: về menu");
        if (state == State.LEVEL_COMPLETE) drawOverlay("HOÀN THÀNH MÀN!",
                "Thưởng: +" + level.rewardXp + " XP, +" + level.rewardCoins + " vàng  ·  N: sang màn tiếp  ·  M: về menu");
        if (state == State.VICTORY) drawOverlay("CHIẾN THẮNG!",
                "Bạn đã hạ Yamikage và hoàn thành hành trình.  ·  Enter / M: về menu");
    }

    private void render3d() {
        // Head bob while moving.
        boolean moving = Gdx.input.isKeyPressed(Keys.W) || Gdx.input.isKeyPressed(Keys.S)
                || Gdx.input.isKeyPressed(Keys.Q) || Gdx.input.isKeyPressed(Keys.E);
        double bob = (state == State.PLAYING && moving) ? Math.sin(gameTime * 10) * 0.04 : 0;
        double dirX = Math.cos(player.angle), dirZ = Math.sin(player.angle);
        camera.position.set((float) player.x, (float) (1.6 + bob), (float) player.y);
        camera.lookAt((float) (player.x + dirX), (float) (1.6 + bob), (float) (player.y + dirZ));
        camera.up.set(0, 1, 0);
        camera.update();

        Gdx.gl.glClearColor(level.ceiling.r / 255f, level.ceiling.g / 255f, level.ceiling.b / 255f, 1f);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT | GL20.GL_DEPTH_BUFFER_BIT);

        modelBatch.begin(camera);
        // Ground: one wide thin box, centred on the map.
        ModelInstance ground = new ModelInstance(groundModel);
        ground.transform.idt()
                .translate(level.width / 2f, -0.05f, level.height / 2f)
                .scale(level.width, 1f, level.height);
        modelBatch.render(ground, environment);

        for (int y = 0; y < level.height; y++) {
            for (int x = 0; x < level.width; x++) {
                if (level.wall[y][x] == 1) {
                    ModelInstance w = new ModelInstance(wallModel);
                    w.transform.idt().translate(x + 0.5f, 0.5f, y + 0.5f);
                    modelBatch.render(w, environment);
                } else if (level.wall[y][x] == 2) {
                    ModelInstance t = new ModelInstance(treeModel);
                    t.transform.idt().translate(x + 0.5f, 0.8f, y + 0.5f);
                    modelBatch.render(t, environment);
                }
            }
        }

        for (Sprite s : level.sprites) {
            if (s.taken) continue;
            renderSprite(s);
        }

        for (Enemy e : level.enemies) {
            if (!e.alive()) continue;
            float yaw = (float) Math.toDegrees(Math.atan2(player.x - e.x, player.y - e.y));
            float scale = (float) e.scale;
            ModelInstance[] parts = enemyInstances(e);
            float windup = e.state == Enemy.WINDUP ? 0.15f : 0f;
            place(parts[0], (float) e.x, 0.55f * scale, (float) e.y, yaw, scale);
            place(parts[1], (float) e.x, 1.35f * scale, (float) e.y, yaw, scale);
            // Sword in the enemy's right hand, flashing red while winding up.
            place(parts[2], (float) e.x, 0.85f * scale, (float) e.y, yaw, scale, 0.45f, 0f, 0.15f, 45f + windup * 100);
            for (ModelInstance p : parts) modelBatch.render(p, environment);
            if (e.state == Enemy.WINDUP) {
                ModelInstance flash = new ModelInstance(boxSmallModel);
                flash.transform.idt().translate((float) e.x, 1.0f * scale, (float) e.y).scale(scale, scale, scale);
                modelBatch.render(flash, environment);
            }
        }

        for (Projectile p : projectiles) {
            ModelInstance pr = new ModelInstance(sphereSmallModel);
            pr.transform.idt().translate((float) p.x, 1.0f, (float) p.y);
            modelBatch.render(pr, environment);
        }
        modelBatch.end();

        if (damageFlash > 0) {
            shapes.begin(ShapeRenderer.ShapeType.Filled);
            shapes.setColor(1f, 0f, 0f, 0.18f);
            shapes.rect(0, 0, W, H);
            shapes.end();
        }
        if (attackTimer > 0) {
            // Slash arc across the centre of the screen.
            shapes.begin(ShapeRenderer.ShapeType.Line);
            shapes.setColor(1f, 0.94f, 0.7f, 0.9f);
            shapes.arc(W / 2f, H / 2f, 70, 20, 140);
            shapes.arc(W / 2f, H / 2f, 50, 30, 120);
            shapes.end();
        }
    }

    private void renderSprite(Sprite s) {
        float x = (float) s.x, z = (float) s.y;
        switch (s.type) {
            case GOAL: {
                // Torii: two pillars and two beams, red. Models are built once.
                ModelInstance p1 = new ModelInstance(toriiPillarModel);
                p1.transform.idt().translate(x - 0.6f, 1.1f, z);
                ModelInstance p2 = new ModelInstance(toriiPillarModel);
                p2.transform.idt().translate(x + 0.6f, 1.1f, z);
                ModelInstance b1 = new ModelInstance(toriiBeamModel);
                b1.transform.idt().translate(x, 2.2f, z);
                ModelInstance b2 = new ModelInstance(toriiBeamModel);
                b2.transform.idt().translate(x, 1.9f, z).scale(0.8f, 1f, 1f);
                modelBatch.render(p1, environment);
                modelBatch.render(p2, environment);
                modelBatch.render(b1, environment);
                modelBatch.render(b2, environment);
                break;
            }
            case SHRINE: {
                ModelInstance stone = new ModelInstance(boxSmallModel);
                stone.transform.idt().translate(x, 0.4f, z).scale(1.5f, 2f, 1.5f);
                ModelInstance glow = new ModelInstance(sphereSmallModel);
                glow.transform.idt().translate(x, 1.1f, z);
                modelBatch.render(stone, environment);
                modelBatch.render(glow, environment);
                break;
            }
            case BANDAGE: {
                ModelInstance it = new ModelInstance(boxSmallModel);
                it.transform.idt().translate(x, 0.3f, z);
                modelBatch.render(it, environment);
                break;
            }
            case DRAUGHT:
            case HERB: {
                ModelInstance it = new ModelInstance(sphereSmallModel);
                it.transform.idt().translate(x, 0.3f, z);
                modelBatch.render(it, environment);
                break;
            }
            case BAMBOO: {
                ModelInstance it = new ModelInstance(boxSmallModel);
                it.transform.idt().translate(x, 0.6f, z).scale(0.3f, 3f, 0.3f);
                modelBatch.render(it, environment);
                break;
            }
            case IRON: {
                ModelInstance it = new ModelInstance(boxSmallModel);
                it.transform.idt().translate(x, 0.25f, z).scale(1.2f, 0.8f, 1.2f);
                modelBatch.render(it, environment);
                break;
            }
            default:
                break;
        }
    }

    // ---------- 2D HUD (LibGDX screen space is Y-up, so top = H - y) ----------

    private void rectTop(float x, float yTop, float w, float h, Color c) {
        shapes.setColor(c);
        shapes.rect(x, H - yTop - h, w, h);
    }

    private void text(BitmapFont f, String s, float x, float yTop) {
        f.draw(batch, s, x, H - yTop);
    }

    private void textCentered(BitmapFont f, String s, float yTop) {
        layout.setText(f, s);
        f.draw(batch, s, W / 2f - layout.width / 2f, H - yTop);
    }

    private void drawHud() {
        shapes.begin(ShapeRenderer.ShapeType.Filled);
        rectTop(8, 8, 430, 118, new Color(0, 0, 0, 0.55f));
        rectTop(110, 38, 200, 12, Color.DARK_GRAY);
        rectTop(110, 38, (int) (200 * Math.max(0, (double) player.hp / player.maxHp)), 12, Color.RED);
        rectTop(110, 58, 200, 12, Color.DARK_GRAY);
        rectTop(110, 58, (int) (200 * player.stamina / 100), 12, Color.YELLOW);
        rectTop(8, 132, 430, 20 + level.objectives.size() * 16, new Color(0, 0, 0, 0.55f));
        Enemy boss = level.boss();
        if (boss != null) {
            rectTop(W / 2f - 200, 36, 400, 14, Color.DARK_GRAY);
            rectTop(W / 2f - 200, 36, (int) (400 * boss.hpPct()), 14, Color.RED);
        }
        drawMinimapShapes();
        shapes.end();

        batch.begin();
        text(font, level.id + " - " + level.name, 18, 28);
        text(font, "Máu: " + player.hp + "/" + player.maxHp, 18, 48);
        text(font, "Khí lực: " + (int) player.stamina, 18, 68);
        text(font, "Cấp " + player.level + " | XP " + player.xp + "/" + player.xpNext
                + " | Vàng " + player.coins + " | Sát thương " + player.damage + " | Kiếm cấp " + player.katanaLevel, 18, 88);
        text(font, "Nhiệm vụ:", 18, 108);
        int oy = 150;
        for (Level.Objective o : level.objectives) {
            text(font, (o.done() ? "[x] " : "[ ] ") + o.text + " (" + o.progress + "/" + o.required + ")", 18, oy);
            oy += 16;
        }
        if (boss != null) {
            layout.setText(font, boss.name);
            font.draw(batch, boss.name, W / 2f - layout.width / 2f, H - 30);
        }
        if (messageTimer > 0) {
            font.setColor(Color.YELLOW);
            textCentered(font, message, H - 42);
            font.setColor(Color.WHITE);
        }
        text(font, "W/S di chuyển · A/D xoay · Q/E lách · Shift chạy nhanh · J đánh nhẹ · K đánh mạnh · U Nhất Đao Trảm · L đỡ (đúng lúc = Parry) · I né · F đài hồi sinh · 1/2 dùng thuốc · C chế tạo · Tab túi đồ · Esc tạm dừng · F5 lưu", 12, H - 16);
        batch.end();
    }

    private void drawMinimapShapes() {
        int cell = 5;
        int x0 = W - level.width * cell - 12, y0 = 12;
        shapes.setColor(0, 0, 0, 0.62f);
        shapes.rect(x0 - 4, H - y0 - (level.height * cell + 8), level.width * cell + 8, level.height * cell + 8);
        for (int y = 0; y < level.height; y++) {
            for (int x = 0; x < level.width; x++) {
                if (level.wall[y][x] == 1) shapes.setColor(Color.WHITE);
                else if (level.wall[y][x] == 2) shapes.setColor(0.16f, 0.55f, 0.24f, 1f);
                else shapes.setColor(0.24f, 0.24f, 0.24f, 1f);
                shapes.rect(x0 + x * cell, H - y0 - y * cell - cell + 1, cell - 1, cell - 1);
            }
        }
        for (Sprite s : level.sprites) {
            if (s.taken) continue;
            if (s.type == Sprite.Type.GOAL) shapes.setColor(Color.YELLOW);
            else if (s.type == Sprite.Type.SHRINE) shapes.setColor(Color.CYAN);
            else shapes.setColor(Color.GREEN);
            shapes.rect(x0 + (int) s.x * cell, H - y0 - (int) s.y * cell - cell + 1, 4, 4);
        }
        for (Enemy e : level.enemies) {
            if (!e.alive()) continue;
            shapes.setColor(e.boss ? Color.RED : Color.ORANGE);
            shapes.rect(x0 + (int) e.x * cell, H - y0 - (int) e.y * cell - cell + 1, 4, 4);
        }
        shapes.setColor(Color.YELLOW);
        shapes.circle(x0 + (int) player.x * cell, H - y0 - (int) player.y * cell - cell + 1, 3);
    }

    private void drawInventory() {
        shapes.begin(ShapeRenderer.ShapeType.Filled);
        shapes.setColor(0, 0, 0, 0.78f);
        shapes.rect(W / 2f - 220, H / 2f - 150, 440, 300);
        shapes.end();
        batch.begin();
        textCentered(bigFont, "TÚI ĐỒ", H / 2f - 120);
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
            text(font, line, W / 2f - 200, y);
            y += 24;
        }
        batch.end();
    }

    private void drawMenu() {
        batch.begin();
        textCentered(bigFont, "ĐẠO CỦA KẺ VÔ DANH", 110);
        textCentered(font, "Samurai 3D - bản LibGDX (3D thật, camera góc nhìn thứ nhất)", 150);
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
            textCentered(font, line, y);
            y += 30;
        }
        if (!menuMessage.isEmpty()) {
            font.setColor(Color.YELLOW);
            textCentered(font, menuMessage, y + 20);
            font.setColor(Color.WHITE);
        } else if (saveExists) {
            font.setColor(Color.GREEN);
            textCentered(font, "Đã tìm thấy file lưu samurai_save.txt - bấm L để tiếp tục.", y + 20);
            font.setColor(Color.WHITE);
        }
        batch.end();
    }

    private void drawOverlay(String title, String hint) {
        shapes.begin(ShapeRenderer.ShapeType.Filled);
        shapes.setColor(0, 0, 0, 0.67f);
        shapes.rect(0, 0, W, H);
        shapes.end();
        batch.begin();
        textCentered(bigFont, title, H / 2f - 20);
        textCentered(font, hint, H / 2f + 30);
        batch.end();
    }

    @Override
    public void resize(int width, int height) {
        camera.viewportWidth = width;
        camera.viewportHeight = height;
        camera.update();
    }

    @Override
    public void pause() {
    }

    @Override
    public void resume() {
    }

    @Override
    public void hide() {
    }

    @Override
    public void dispose() {
        if (modelBatch != null) modelBatch.dispose();
        if (batch != null) batch.dispose();
        if (font != null) font.dispose();
        if (bigFont != null) bigFont.dispose();
        if (shapes != null) shapes.dispose();
        for (com.badlogic.gdx.graphics.g3d.Model m : allModels) m.dispose();
    }
}
