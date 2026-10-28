package vn.samurai.gdx;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input.Keys;
import com.badlogic.gdx.Screen;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.PerspectiveCamera;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.VertexAttributes;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.GlyphLayout;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.freetype.FreeTypeFontGenerator;
import com.badlogic.gdx.graphics.g3d.Environment;
import com.badlogic.gdx.graphics.g3d.ModelBatch;
import com.badlogic.gdx.graphics.g3d.ModelInstance;
import com.badlogic.gdx.graphics.g3d.attributes.BlendingAttribute;
import com.badlogic.gdx.graphics.g3d.attributes.ColorAttribute;
import com.badlogic.gdx.graphics.g3d.attributes.TextureAttribute;
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

    private static class GrassBlade {
        ModelInstance inst;
        float x, z, phase;
    }

    private static class Cloud {
        float angle, radius, height, scale;
    }

    private static class Star {
        float angle, radius, height, scale;
    }

    private static class Particle {
        double x, y, z, vx, vy, vz, life, maxLife;
        Color color;
    }

    private static final int W = 1024, H = 640;
    private static final int[] ACTION_KEYS = {
            Keys.ENTER, Keys.L, Keys.R, Keys.N, Keys.M, Keys.ESCAPE, Keys.F5,
            Keys.TAB, Keys.J, Keys.K, Keys.U, Keys.I, Keys.F, Keys.C,
            Keys.NUM_1, Keys.NUM_2, Keys.F6
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
    private double stepTimer = 0;
    private final List<Particle> particles = new ArrayList<>();
    private final Map<Enemy, Double> deathTimes = new HashMap<>();

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
    private final List<ModelInstance> staticInstances = new ArrayList<>();
    private final List<GrassBlade> grassBlades = new ArrayList<>();
    private final List<Cloud> clouds = new ArrayList<>();
    private final List<Star> stars = new ArrayList<>();
    private AudioManager audio;
    private Texture stoneTex, dirtTex, foliageTex, woodTex, weaveTex, plateTex;
    private com.badlogic.gdx.graphics.g3d.Model wallModel;
    private com.badlogic.gdx.graphics.g3d.Model trunkModel;
    private com.badlogic.gdx.graphics.g3d.Model foliageModel;
    private com.badlogic.gdx.graphics.g3d.Model groundTileModel;
    private com.badlogic.gdx.graphics.g3d.Model headModel;
    private com.badlogic.gdx.graphics.g3d.Model hairModel;
    private com.badlogic.gdx.graphics.g3d.Model topknotModel;
    private com.badlogic.gdx.graphics.g3d.Model obiModel;
    private com.badlogic.gdx.graphics.g3d.Model swordBladeModel;
    private com.badlogic.gdx.graphics.g3d.Model swordGuardModel;
    private com.badlogic.gdx.graphics.g3d.Model shadowModel;
    private com.badlogic.gdx.graphics.g3d.Model cloudModel;
    private com.badlogic.gdx.graphics.g3d.Model sunModel;
    private com.badlogic.gdx.graphics.g3d.Model starModel;
    private com.badlogic.gdx.graphics.g3d.Model glowModel;
    private com.badlogic.gdx.graphics.g3d.Model grassModel;
    private com.badlogic.gdx.graphics.g3d.Model sphereSmallModel;
    private com.badlogic.gdx.graphics.g3d.Model boxSmallModel;
    private com.badlogic.gdx.graphics.g3d.Model toriiPillarModel;
    private com.badlogic.gdx.graphics.g3d.Model toriiBeamModel;
    private final Map<String, com.badlogic.gdx.graphics.g3d.Model> torsoModels = new HashMap<>();
    private final Map<String, com.badlogic.gdx.graphics.g3d.Model> armModels = new HashMap<>();
    private final Map<String, com.badlogic.gdx.graphics.g3d.Model> legModels = new HashMap<>();

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
        buildStaticForLevel();
        buildSkyForLevel();
        audio = new AudioManager();
        audio.init();
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

    private com.badlogic.gdx.graphics.g3d.Model texturedBox(Texture tex, Color tint, float w, float h, float d) {
        ModelBuilder b = new ModelBuilder();
        com.badlogic.gdx.graphics.g3d.Model m = b.createBox(w, h, d,
                new com.badlogic.gdx.graphics.g3d.Material(
                        TextureAttribute.createDiffuse(tex),
                        ColorAttribute.createDiffuse(tint)),
                VertexAttributes.Usage.Position | VertexAttributes.Usage.Normal
                        | VertexAttributes.Usage.TextureCoordinates);
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

    private com.badlogic.gdx.graphics.g3d.Model texturedSphere(Texture tex, Color tint, float r) {
        ModelBuilder b = new ModelBuilder();
        com.badlogic.gdx.graphics.g3d.Model m = b.createSphere(r * 2, r * 2, r * 2, 12, 12,
                new com.badlogic.gdx.graphics.g3d.Material(
                        TextureAttribute.createDiffuse(tex),
                        ColorAttribute.createDiffuse(tint)),
                VertexAttributes.Usage.Position | VertexAttributes.Usage.Normal
                        | VertexAttributes.Usage.TextureCoordinates);
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

    private com.badlogic.gdx.graphics.g3d.Model texturedCone(Texture tex, Color tint, float w, float h, float d) {
        ModelBuilder b = new ModelBuilder();
        com.badlogic.gdx.graphics.g3d.Model m = b.createCone(w, h, d, 10,
                new com.badlogic.gdx.graphics.g3d.Material(
                        TextureAttribute.createDiffuse(tex),
                        ColorAttribute.createDiffuse(tint)),
                VertexAttributes.Usage.Position | VertexAttributes.Usage.Normal
                        | VertexAttributes.Usage.TextureCoordinates);
        allModels.add(m);
        return m;
    }

    private com.badlogic.gdx.graphics.g3d.Model texturedCylinder(Texture tex, Color tint, float w, float h, float d) {
        ModelBuilder b = new ModelBuilder();
        com.badlogic.gdx.graphics.g3d.Model m = b.createCylinder(w, h, d, 10,
                new com.badlogic.gdx.graphics.g3d.Material(
                        TextureAttribute.createDiffuse(tex),
                        ColorAttribute.createDiffuse(tint)),
                VertexAttributes.Usage.Position | VertexAttributes.Usage.Normal
                        | VertexAttributes.Usage.TextureCoordinates);
        allModels.add(m);
        return m;
    }

    private com.badlogic.gdx.graphics.g3d.Model transparentBox(Color color, float opacity, float w, float h, float d) {
        ModelBuilder b = new ModelBuilder();
        com.badlogic.gdx.graphics.g3d.Model m = b.createBox(w, h, d,
                new com.badlogic.gdx.graphics.g3d.Material(
                        ColorAttribute.createDiffuse(color),
                        new BlendingAttribute(GL20.GL_SRC_ALPHA, GL20.GL_ONE_MINUS_SRC_ALPHA, opacity)),
                VertexAttributes.Usage.Position | VertexAttributes.Usage.Normal);
        allModels.add(m);
        return m;
    }

    private void buildModels() {
        stoneTex = TextureFactory.stone();
        dirtTex = TextureFactory.dirt();
        foliageTex = TextureFactory.foliage();
        woodTex = TextureFactory.wood();
        weaveTex = TextureFactory.weave();
        plateTex = TextureFactory.plate();
        wallModel = texturedBox(stoneTex, new Color(0.62f, 0.55f, 0.45f, 1f), 1f, 1f, 1f);
        trunkModel = texturedCylinder(woodTex, new Color(0.55f, 0.42f, 0.28f, 1f), 0.28f, 0.9f, 0.28f);
        foliageModel = texturedCone(foliageTex, new Color(0.7f, 0.9f, 0.7f, 1f), 1.3f, 1.8f, 1.3f);
        headModel = sphere(new Color(0.78f, 0.67f, 0.55f, 1f), 0.22f);
        hairModel = box(new Color(0.08f, 0.06f, 0.05f, 1f), 0.42f, 0.22f, 0.42f);
        topknotModel = sphere(new Color(0.08f, 0.06f, 0.05f, 1f), 0.12f);
        obiModel = texturedBox(weaveTex, new Color(0.55f, 0.16f, 0.16f, 1f), 0.68f, 0.12f, 0.38f);
        swordBladeModel = texturedBox(plateTex, new Color(0.9f, 0.92f, 0.95f, 1f), 0.07f, 0.95f, 0.03f);
        swordGuardModel = box(new Color(0.15f, 0.12f, 0.10f, 1f), 0.2f, 0.05f, 0.08f);
        shadowModel = transparentBox(Color.BLACK, 0.35f, 0.9f, 0.02f, 0.9f);
        cloudModel = transparentBox(Color.WHITE, 0.75f, 1f, 0.5f, 1f);
        sunModel = sphere(new Color(1f, 0.9f, 0.5f, 1f), 1.5f);
        starModel = sphere(Color.WHITE, 0.15f);
        glowModel = transparentBox(new Color(1f, 0.2f, 0.2f, 1f), 0.25f, 1f, 1f, 1f);
        grassModel = texturedBox(foliageTex, new Color(0.6f, 0.9f, 0.5f, 1f), 0.06f, 0.45f, 0.06f);
        sphereSmallModel = sphere(Color.WHITE, 0.22f);
        boxSmallModel = box(Color.WHITE, 0.4f, 0.4f, 0.4f);
        toriiPillarModel = texturedBox(woodTex, new Color(0.85f, 0.2f, 0.2f, 1f), 0.2f, 2.2f, 0.2f);
        toriiBeamModel = texturedBox(woodTex, new Color(0.85f, 0.2f, 0.2f, 1f), 1.8f, 0.2f, 0.3f);
    }

    /** Build walls, ground tiles and grass for the current level (once per level). */
    private void buildStaticForLevel() {
        // Note: do NOT dispose the previous ground model here. Its material
        // shares dirtTex with the new model, and disposing a LibGDX model
        // disposes its material's texture, which would break the new tiles.
        // Old ground models are disposed once at game exit via allModels.
        groundTileModel = texturedBox(dirtTex, awt(level.floor), 1f, 0.1f, 1f);
        staticInstances.clear();
        grassBlades.clear();
        Random r = new Random(levelIndex * 1000L + 31);
        for (int y = 0; y < level.height; y++) {
            for (int x = 0; x < level.width; x++) {
                if (level.wall[y][x] == 1) {
                    ModelInstance w = new ModelInstance(wallModel);
                    w.transform.idt().translate(x + 0.5f, 0.5f, y + 0.5f);
                    staticInstances.add(w);
                } else if (level.wall[y][x] == 2) {
                    ModelInstance trunk = new ModelInstance(trunkModel);
                    trunk.transform.idt().translate(x + 0.5f, 0.45f, y + 0.5f);
                    staticInstances.add(trunk);
                    ModelInstance fol = new ModelInstance(foliageModel);
                    fol.transform.idt().translate(x + 0.5f, 1.5f, y + 0.5f);
                    staticInstances.add(fol);
                } else {
                    ModelInstance g = new ModelInstance(groundTileModel);
                    g.transform.idt().translate(x + 0.5f, -0.05f, y + 0.5f);
                    staticInstances.add(g);
                    if (r.nextFloat() < 0.45) {
                        GrassBlade blade = new GrassBlade();
                        blade.inst = new ModelInstance(grassModel);
                        blade.x = x + 0.2f + r.nextFloat() * 0.6f;
                        blade.z = y + 0.2f + r.nextFloat() * 0.6f;
                        blade.phase = r.nextFloat() * (float) (2 * Math.PI);
                        grassBlades.add(blade);
                    }
                }
            }
        }
    }

    /** Clouds and stars that follow the player, like the original sky. */
    private void buildSkyForLevel() {
        clouds.clear();
        stars.clear();
        Random r = new Random(levelIndex * 777L + 13);
        for (int i = 0; i < 8; i++) {
            Cloud c = new Cloud();
            c.angle = r.nextFloat() * (float) (2 * Math.PI);
            c.radius = 26 + r.nextFloat() * 8;
            c.height = 10 + r.nextFloat() * 4;
            c.scale = 3 + r.nextFloat() * 3;
            clouds.add(c);
        }
        int avg = (level.ceiling.r + level.ceiling.g + level.ceiling.b) / 3;
        if (avg < 110) {
            for (int i = 0; i < 30; i++) {
                Star s = new Star();
                s.angle = r.nextFloat() * (float) (2 * Math.PI);
                s.radius = 32 + r.nextFloat() * 6;
                s.height = 12 + r.nextFloat() * 6;
                s.scale = 0.8f + r.nextFloat() * 0.6f;
                stars.add(s);
            }
        }
    }

    private com.badlogic.gdx.graphics.g3d.Model torsoModelFor(Enemy e) {
        com.badlogic.gdx.graphics.g3d.Model m = torsoModels.get(e.kind);
        if (m == null) {
            m = texturedBox(weaveTex, awt(e.cloth), 0.65f, 0.55f, 0.35f);
            torsoModels.put(e.kind, m);
        }
        return m;
    }

    private com.badlogic.gdx.graphics.g3d.Model armModelFor(Enemy e) {
        com.badlogic.gdx.graphics.g3d.Model m = armModels.get(e.kind);
        if (m == null) {
            m = texturedBox(weaveTex, awt(e.cloth), 0.13f, 0.5f, 0.13f);
            armModels.put(e.kind, m);
        }
        return m;
    }

    private com.badlogic.gdx.graphics.g3d.Model legModelFor(Enemy e) {
        com.badlogic.gdx.graphics.g3d.Model m = legModels.get(e.kind);
        if (m == null) {
            m = texturedBox(weaveTex, awt(e.cloth), 0.15f, 0.7f, 0.15f);
            legModels.put(e.kind, m);
        }
        return m;
    }

    // Rig part order: torso, obi, head, hair, topknot, armR, armL, legR, legL, swordBlade, swordGuard, shadow.
    private ModelInstance[] enemyInstances(Enemy e) {
        ModelInstance[] parts = enemyModels.get(e);
        if (parts == null) {
            parts = new ModelInstance[]{
                    new ModelInstance(torsoModelFor(e)),
                    new ModelInstance(obiModel),
                    new ModelInstance(headModel),
                    new ModelInstance(hairModel),
                    new ModelInstance(topknotModel),
                    new ModelInstance(armModelFor(e)),
                    new ModelInstance(armModelFor(e)),
                    new ModelInstance(legModelFor(e)),
                    new ModelInstance(legModelFor(e)),
                    new ModelInstance(swordBladeModel),
                    new ModelInstance(swordGuardModel),
                    new ModelInstance(shadowModel)
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

    /**
     * Place a rig part: world position, yaw, then a joint offset, then
     * pitch (swing forward/back, in degrees) and roll, then the part's
     * centre offset, then scale. This is how arms and legs swing around
     * their shoulder/hip joint instead of around their own centre.
     */
    private static void placePart(ModelInstance inst, float wx, float wy, float wz,
                                  float yawDeg, float scale,
                                  float jx, float jy, float jz,
                                  float pitchDeg, float rollDeg,
                                  float cx, float cy, float cz) {
        inst.transform.idt()
                .translate(wx, wy, wz)
                .rotate(Vector3.Y, yawDeg)
                .translate(jx, jy, jz)
                .rotate(Vector3.X, pitchDeg)
                .rotate(Vector3.Z, rollDeg)
                .translate(cx, cy, cz)
                .scale(scale, scale, scale);
    }

    private void spawnParticles(double x, double y, double z, Color color, int count) {
        for (int i = 0; i < count; i++) {
            Particle p = new Particle();
            p.x = x;
            p.y = y;
            p.z = z;
            double a = rng.nextDouble() * 2 * Math.PI;
            double sp = 1 + rng.nextDouble() * 2;
            p.vx = Math.cos(a) * sp;
            p.vz = Math.sin(a) * sp;
            p.vy = 1.5 + rng.nextDouble() * 2.5;
            p.maxLife = 0.4 + rng.nextDouble() * 0.3;
            p.life = p.maxLife;
            p.color = color;
            particles.add(p);
        }
    }

    // ---------- game flow (same rules as the Swing version) ----------

    private void startNew() {
        player = new Player();
        levelIndex = 0;
        loadLevel(0, true);
        state = State.PLAYING;
        if (audio != null) audio.play("ui");
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
        if (audio != null) audio.play("ui");
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
        particles.clear();
        deathTimes.clear();
        showInventory = false;
        if (healFull) player.hp = player.maxHp;
        if (wallModel != null) {
            buildStaticForLevel();
            buildSkyForLevel();
        }
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
        if (audio != null) {
            audio.play("gate");
            if (leveled) audio.play("levelup");
            else audio.play("quest");
        }
        spawnParticles(player.x, 1.2, player.y, Color.GOLD, 20);
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
            if (audio != null) audio.play("ui");
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
        if (audio != null) audio.play(kind == 1 ? "swing" : "swingHeavy");
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
            if (audio != null) audio.play(blocked ? "block" : (attackKind == 1 ? "hit" : "hitHeavy"));
            spawnParticles(e.x, 1.0, e.y, blocked ? Color.LIGHT_GRAY : Color.ORANGE, blocked ? 6 : 12);
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
        deathTimes.put(e, gameTime);
        if (audio != null) audio.play("coin");
        spawnParticles(e.x, 1.0, e.y, e.boss ? Color.RED : Color.YELLOW, e.boss ? 24 : 10);
        player.coins += e.coins;
        boolean leveled = player.addXp(e.xp);
        if (leveled && audio != null) audio.play("levelup");
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
        if (audio != null) audio.play("dodge");
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
                if (audio != null) audio.play("heal");
                saveGame();
                setMessage("Đài hồi sinh: hồi đầy máu và đã lưu game!");
                return;
            }
        }
        setMessage("Không có đài hồi sinh gần đây. Hãy đến gần đài (biểu tượng xanh) rồi bấm F.");
    }

    private void tryCraft() {
        if (audio != null) audio.play("craft");
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

        // Particles.
        List<Particle> deadP = new ArrayList<>();
        for (Particle pt : particles) {
            pt.life -= dt;
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.z += pt.vz * dt;
            pt.vy -= 6 * dt;
            if (pt.life <= 0 || pt.y < 0.05) deadP.add(pt);
        }
        particles.removeAll(deadP);
        // Footsteps while moving.
        boolean movingNow = Gdx.input.isKeyPressed(Keys.W) || Gdx.input.isKeyPressed(Keys.S)
                || Gdx.input.isKeyPressed(Keys.Q) || Gdx.input.isKeyPressed(Keys.E);
        if (movingNow) {
            stepTimer -= dt;
            if (stepTimer <= 0) {
                if (audio != null) audio.play("step");
                stepTimer = 0.4;
            }
        }

        if (player.hp <= 0) {
            player.hp = 0;
            state = State.DEAD;
            if (audio != null) audio.play("death");
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
                    if (audio != null) audio.play(e.fire ? "fire" : "arrow");
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
                    if (audio != null) audio.play("roar");
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
            if (audio != null) audio.play("parry");
            spawnParticles(player.x, 1.2, player.y, Color.CYAN, 12);
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
            if (audio != null) audio.play(player.blocking ? "block" : "hit");
            spawnParticles(player.x, 1.2, player.y, Color.RED, 8);
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
                if (audio != null) audio.play("pickup");
                spawnParticles(s.x, 0.5, s.y, Color.GREEN, 8);
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
        if (justPressed(Keys.F6) && audio != null) {
            audio.toggleMusic();
            String m = audio.isMusicOn() ? "Đã bật nhạc nền." : "Đã tắt nhạc nền (F6 để bật lại).";
            if (state == State.MENU) menuMessage = m;
            else setMessage(m);
        }
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
        for (ModelInstance inst : staticInstances) modelBatch.render(inst, environment);
        // Grass sway, like the original wind system.
        for (GrassBlade blade : grassBlades) {
            float sway = (float) Math.sin(gameTime * 2 + blade.phase) * 7f;
            blade.inst.transform.idt()
                    .translate(blade.x, 0.22f, blade.z)
                    .rotate(Vector3.Z, sway)
                    .rotate(Vector3.X, (float) Math.cos(gameTime * 1.7 + blade.phase) * 5f);
            modelBatch.render(blade.inst, environment);
        }

        for (Sprite s : level.sprites) {
            if (s.taken) continue;
            renderSprite(s);
        }

        for (Enemy e : level.enemies) {
            if (e.alive()) {
                renderEnemyRig(e, 0, false);
            } else {
                Double start = deathTimes.get(e);
                if (start != null) {
                    double prog = (gameTime - start) / 0.8;
                    if (prog >= 0 && prog < 1) renderEnemyRig(e, (float) prog, true);
                }
            }
        }

        for (Projectile pr : projectiles) {
            ModelInstance inst = new ModelInstance(sphereSmallModel);
            inst.transform.idt().translate((float) pr.x, 1.0f, (float) pr.y);
            // Tint projectiles: fire = orange, shadow = blue-grey.
            try {
                inst.materials.get(0).set(ColorAttribute.createDiffuse(pr.fire ? Color.ORANGE : new Color(0.7f, 0.78f, 1f, 1f)));
            } catch (Exception ignored) {
            }
            modelBatch.render(inst, environment);
        }

        for (Particle pt : particles) {
            float s = (float) (0.22 * Math.max(0.2, pt.life / pt.maxLife));
            ModelInstance inst = new ModelInstance(sphereSmallModel);
            inst.transform.idt().translate((float) pt.x, (float) pt.y, (float) pt.z).scale(s / 0.22f, s / 0.22f, s / 0.22f);
            try {
                inst.materials.get(0).set(ColorAttribute.createDiffuse(pt.color));
            } catch (Exception ignored) {
            }
            modelBatch.render(inst, environment);
        }

        renderSky();
        if (state == State.PLAYING || state == State.PAUSED) renderViewmodel();
        modelBatch.end();

        if (damageFlash > 0) {
            shapes.begin(ShapeRenderer.ShapeType.Filled);
            shapes.setColor(1f, 0f, 0f, 0.18f);
            shapes.rect(0, 0, W, H);
            shapes.end();
        }
        if (attackTimer > 0) {
            shapes.begin(ShapeRenderer.ShapeType.Line);
            shapes.setColor(1f, 0.94f, 0.7f, 0.9f);
            shapes.arc(W / 2f, H / 2f, 70, 20, 140);
            shapes.arc(W / 2f, H / 2f, 50, 30, 120);
            shapes.end();
        }
    }

    /** Sky that follows the player: sun, drifting clouds, night stars. */
    private void renderSky() {
        // Sun in the light direction.
        ModelInstance sun = new ModelInstance(sunModel);
        sun.transform.idt()
                .translate((float) (player.x + 18), 16f, (float) (player.y + 10))
                .scale(1.5f, 1.5f, 1.5f);
        modelBatch.render(sun, environment);
        for (Cloud c : clouds) {
            float ang = c.angle + (float) (gameTime * 0.005);
            float x = (float) (player.x + Math.cos(ang) * c.radius);
            float z = (float) (player.y + Math.sin(ang) * c.radius);
            ModelInstance cl = new ModelInstance(cloudModel);
            cl.transform.idt().translate(x, c.height, z).scale(c.scale, c.scale * 0.35f, c.scale * 0.7f);
            modelBatch.render(cl, environment);
        }
        for (Star s : stars) {
            float x = (float) (player.x + Math.cos(s.angle) * s.radius);
            float z = (float) (player.y + Math.sin(s.angle) * s.radius);
            ModelInstance st = new ModelInstance(starModel);
            st.transform.idt().translate(x, s.height, z).scale(s.scale, s.scale, s.scale);
            modelBatch.render(st, environment);
        }
    }

    /** First-person katana: bottom-right, swings on attack, guards on block. */
    private void renderViewmodel() {
        float dirX = (float) Math.cos(player.angle);
        float dirZ = (float) Math.sin(player.angle);
        float rightX = -dirZ, rightZ = dirX;
        float camX = camera.position.x, camY = camera.position.y, camZ = camera.position.z;
        float yawDeg = (float) Math.toDegrees(player.angle);
        // Attack swing: raised -> slash -> rest. Block: centred, vertical.
        float swingPitch;
        float offRight = 0.28f, offForward = 0.45f, offDown = 0.25f;
        if (player.blocking) {
            swingPitch = 0;
            offRight = 0.02f;
            offForward = 0.5f;
            offDown = 0.18f;
        } else if (attackTimer > 0) {
            float prog = (float) (1 - attackTimer / Math.max(attackDuration, 0.001));
            swingPitch = -60 + prog * 110;
        } else {
            swingPitch = -10 + (float) Math.sin(gameTime * 10) * 3f;
        }
        float baseX = camX + dirX * offForward + rightX * offRight;
        float baseY = camY - offDown;
        float baseZ = camZ + dirZ * offForward + rightZ * offRight;
        ModelInstance blade = new ModelInstance(swordBladeModel);
        blade.transform.idt()
                .translate(baseX, baseY, baseZ)
                .rotate(Vector3.Y, yawDeg)
                .rotate(Vector3.X, swingPitch)
                .translate(0, 0.45f, 0.1f)
                .scale(1.2f, 1.2f, 1.2f);
        modelBatch.render(blade, environment);
        ModelInstance guard = new ModelInstance(swordGuardModel);
        guard.transform.idt()
                .translate(baseX, baseY, baseZ)
                .rotate(Vector3.Y, yawDeg)
                .rotate(Vector3.X, swingPitch)
                .scale(1.2f, 1.2f, 1.2f);
        modelBatch.render(guard, environment);
    }

    /**
     * Detailed humanoid rig, after the original buildHumanoid + animator
     * clips: idle breathing, walk (legs/arms opposite), windup (sword
     * raised), slash (cooldown), stun (lean back, shake), death (fall).
     * Parts are cached per enemy; only their transforms change per frame.
     */
    private void renderEnemyRig(Enemy e, float deathProg, boolean dead) {
        float yaw = (float) Math.toDegrees(Math.atan2(player.x - e.x, player.y - e.y));
        float scale = (float) e.scale;
        float walkPhase = (float) (gameTime * e.speed * 2.5 + e.x * 10);
        float legSwing = 0, armSwing = 0, lean = 0, headTilt = 0, bob = 0, armRPitch = 0, armLPitch = 0;
        if (dead) {
            float p = deathProg;
            lean = -p * 90f;
            bob = -p * 0.7f;
            legSwing = 0;
            armSwing = 0;
            armRPitch = -p * 60f;
            armLPitch = -p * 60f;
        } else if (e.state == Enemy.CHASE) {
            legSwing = (float) Math.sin(walkPhase) * 35f;
            armSwing = -(float) Math.sin(walkPhase) * 28f;
            bob = (float) Math.abs(Math.cos(walkPhase)) * 0.05f;
            armRPitch = armSwing;
            armLPitch = -armSwing;
        } else if (e.state == Enemy.WINDUP) {
            lean = -12f;
            armRPitch = -110f;
            armLPitch = 20f;
            headTilt = -8f;
        } else if (e.state == Enemy.COOLDOWN) {
            float f = e.cooldownTime > 0 ? (float) (e.cooldownTimer / e.cooldownTime) : 0;
            armRPitch = 55f * f;
            armLPitch = 10f;
        } else if (e.state == Enemy.STUNNED) {
            lean = -25f;
            headTilt = -15f;
            armRPitch = -30f + (float) Math.sin(gameTime * 30) * 5f;
            armLPitch = -30f;
        } else {
            // IDLE: breathing + slight sway, like the original idle clip.
            bob = (float) Math.sin(gameTime * 2 + e.x * 5) * 0.02f;
            armRPitch = (float) Math.sin(gameTime * 2 + e.x) * 4f;
            armLPitch = (float) Math.sin(gameTime * 2 + e.x + 1) * 4f;
            headTilt = (float) Math.sin(gameTime * 1.3 + e.y) * 4f;
        }
        float yBase = (float) (bob + (dead ? -deathProg * 0.2f : 0));
        ModelInstance[] parts = enemyInstances(e);
        // 0 torso, 1 obi, 2 head, 3 hair, 4 topknot, 5 armR, 6 armL, 7 legR, 8 legL, 9 swordBlade, 10 swordGuard, 11 shadow.
        placePart(parts[0], (float) e.x, 1.15f * scale + yBase, (float) e.y, yaw, scale, 0, 0, 0, lean, 0, 0, 0, 0);
        placePart(parts[1], (float) e.x, 1.05f * scale + yBase, (float) e.y, yaw, scale, 0, 0, 0, lean, 0, 0, 0, 0);
        placePart(parts[2], (float) e.x, 1.52f * scale + yBase, (float) e.y, yaw, scale, 0, 0, 0, headTilt, 0, 0, 0, 0);
        placePart(parts[3], (float) e.x, 1.62f * scale + yBase, (float) e.y, yaw, scale, 0, 0, -0.05f, headTilt, 0, 0, 0, 0);
        placePart(parts[4], (float) e.x, 1.74f * scale + yBase, (float) e.y, yaw, scale, 0, 0, -0.12f, headTilt, 0, 0, 0, 0);
        placePart(parts[5], (float) e.x, 1.38f * scale + yBase, (float) e.y, yaw, scale, 0.42f, 0, 0, armRPitch, 12f, 0, -0.25f, 0);
        placePart(parts[6], (float) e.x, 1.38f * scale + yBase, (float) e.y, yaw, scale, -0.42f, 0, 0, armLPitch, -12f, 0, -0.25f, 0);
        placePart(parts[7], (float) e.x, 0.85f * scale + yBase, (float) e.y, yaw, scale, 0.16f, 0, 0, legSwing, 0, 0, -0.35f, 0);
        placePart(parts[8], (float) e.x, 0.85f * scale + yBase, (float) e.y, yaw, scale, -0.16f, 0, 0, -legSwing, 0, 0, -0.35f, 0);
        // Sword follows the right arm: hand at shoulder + arm pitch, blade tilted forward.
        placePart(parts[9], (float) e.x, 1.38f * scale + yBase, (float) e.y, yaw, scale, 0.42f, 0, 0, armRPitch - 55f, 0, 0, -0.6f, 0.12f);
        placePart(parts[10], (float) e.x, 1.38f * scale + yBase, (float) e.y, yaw, scale, 0.42f, 0, 0, armRPitch, 0, 0, -0.5f, 0.05f);
        place(parts[11], (float) e.x, 0.02f, (float) e.y, 0, scale);
        for (ModelInstance inst : parts) modelBatch.render(inst, environment);
        if (e.state == Enemy.WINDUP) {
            ModelInstance flash = new ModelInstance(boxSmallModel);
            flash.transform.idt().translate((float) e.x, 1.0f * scale, (float) e.y).scale(scale, scale, scale);
            try {
                flash.materials.get(0).set(ColorAttribute.createDiffuse(Color.RED));
            } catch (Exception ignored) {
            }
            modelBatch.render(flash, environment);
        }
        if (e.boss && e.hpPct() < 0.3 && !dead) {
            float pulse = 1.8f + (float) Math.sin(gameTime * 6) * 0.15f;
            ModelInstance glow = new ModelInstance(glowModel);
            glow.transform.idt().translate((float) e.x, 1.0f * scale, (float) e.y).scale(pulse, pulse, pulse);
            modelBatch.render(glow, environment);
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
        text(font, "W/S di chuyển · A/D xoay · Q/E lách · Shift chạy nhanh · J đánh nhẹ · K đánh mạnh · U Nhất Đao Trảm · L đỡ (đúng lúc = Parry) · I né · F đài hồi sinh · 1/2 dùng thuốc · C chế tạo · Tab túi đồ · Esc tạm dừng · F5 lưu · F6 nhạc", 12, H - 16);
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
                "I né · F tương tác đài hồi sinh · 1/2 dùng thuốc · C chế tạo · Tab túi đồ · Esc tạm dừng · F5 lưu · F6 bật/tắt nhạc",
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
        if (audio != null) audio.dispose();
        // allModels dispose also disposes the shared textures via their
        // materials, so do not dispose textures separately here.
        if (modelBatch != null) modelBatch.dispose();
        if (batch != null) batch.dispose();
        if (font != null) font.dispose();
        if (bigFont != null) bigFont.dispose();
        if (shapes != null) shapes.dispose();
        for (com.badlogic.gdx.graphics.g3d.Model m : allModels) m.dispose();
    }
}
