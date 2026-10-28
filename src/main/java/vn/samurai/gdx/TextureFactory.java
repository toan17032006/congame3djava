package vn.samurai.gdx;

import com.badlogic.gdx.graphics.Pixmap;
import com.badlogic.gdx.graphics.Texture;

import java.util.Random;

/**
 * Procedural textures, in the spirit of the original web game's canvas
 * textures (terrain detail albedo, soil speckles, grass strokes, blob
 * shadow). No image files are needed: every texture is painted into a
 * Pixmap at startup with a fixed seed, so the result is deterministic
 * and the repo stays free of binary image assets.
 *
 * Textures are mostly greyscale detail (bricks, speckles, weave) so a
 * material tint colour can colour them: stone + brown tint = stone wall,
 * weave + cloth colour = kimono, and so on.
 */
public final class TextureFactory {
    private TextureFactory() {}

    private static Texture fromPixmap(Pixmap p) {
        Texture t = new Texture(p);
        t.setWrap(Texture.TextureWrap.Repeat, Texture.TextureWrap.Repeat);
        t.setFilter(Texture.TextureFilter.Linear, Texture.TextureFilter.Linear);
        p.dispose();
        return t;
    }

    private static void speckle(Pixmap p, Random r, int count, int maxAlpha) {
        for (int i = 0; i < count; i++) {
            int x = r.nextInt(p.getWidth());
            int y = r.nextInt(p.getHeight());
            int v = 120 + r.nextInt(120);
            int a = 30 + r.nextInt(maxAlpha);
            p.setColor(v / 255f, v / 255f, v / 255f, a / 255f);
            p.drawPixel(x, y);
            if (r.nextFloat() < 0.5) p.drawPixel((x + 1) % p.getWidth(), y);
        }
    }

    /** Stone bricks: horizontal courses, staggered vertical joints, speckles. */
    public static Texture stone() {
        int s = 256;
        Pixmap p = new Pixmap(s, s, Pixmap.Format.RGBA8888);
        p.setColor(0.72f, 0.72f, 0.72f, 1f);
        p.fill();
        Random r = new Random(42);
        // Per-brick shade variation.
        for (int row = 0; row < 4; row++) {
            int y0 = row * 64;
            int offset = (row % 2 == 0) ? 0 : 64;
            for (int col = -1; col < 3; col++) {
                int x0 = col * 128 + offset;
                float shade = 0.62f + r.nextFloat() * 0.18f;
                p.setColor(shade, shade, shade, 1f);
                p.fillRectangle(x0, y0, 128, 64);
            }
        }
        speckle(p, r, 4000, 60);
        // Mortar lines.
        p.setColor(0.35f, 0.35f, 0.35f, 1f);
        for (int row = 0; row <= 4; row++) p.fillRectangle(0, row * 64, s, 3);
        for (int row = 0; row < 4; row++) {
            int offset = (row % 2 == 0) ? 0 : 64;
            for (int x = offset; x < s; x += 128) p.fillRectangle(x, row * 64, 3, 64);
        }
        return fromPixmap(p);
    }

    /** Dirt + grass strokes, like the original terrain detail texture. */
    public static Texture dirt() {
        int s = 256;
        Pixmap p = new Pixmap(s, s, Pixmap.Format.RGBA8888);
        p.setColor(0.55f, 0.48f, 0.38f, 1f);
        p.fill();
        Random r = new Random(123);
        speckle(p, r, 5200, 80);
        // Grass blade strokes.
        for (int i = 0; i < 900; i++) {
            int x = r.nextInt(s), y = r.nextInt(s);
            float g = 0.45f + r.nextFloat() * 0.3f;
            p.setColor(g * 0.55f, g, g * 0.45f, 0.35f);
            p.drawLine(x, y, x + r.nextInt(5) - 2, y - 2 - r.nextInt(4));
        }
        return fromPixmap(p);
    }

    /** Dense green foliage noise. */
    public static Texture foliage() {
        int s = 256;
        Pixmap p = new Pixmap(s, s, Pixmap.Format.RGBA8888);
        p.setColor(0.25f, 0.45f, 0.22f, 1f);
        p.fill();
        Random r = new Random(7);
        for (int i = 0; i < 6000; i++) {
            int x = r.nextInt(s), y = r.nextInt(s);
            float g = 0.3f + r.nextFloat() * 0.4f;
            p.setColor(g * 0.5f, g, g * 0.4f, 0.6f);
            p.fillRectangle(x, y, 2 + r.nextInt(3), 2 + r.nextInt(3));
        }
        return fromPixmap(p);
    }

    /** Vertical wood grain. */
    public static Texture wood() {
        int s = 256;
        Pixmap p = new Pixmap(s, s, Pixmap.Format.RGBA8888);
        p.setColor(0.6f, 0.5f, 0.35f, 1f);
        p.fill();
        Random r = new Random(99);
        for (int x = 0; x < s; x++) {
            float shade = 0.5f + (float) Math.sin(x * 0.15 + r.nextFloat()) * 0.08f;
            p.setColor(shade, shade * 0.82f, shade * 0.58f, 1f);
            p.drawLine(x, 0, x, s);
        }
        speckle(p, r, 1500, 40);
        return fromPixmap(p);
    }

    /** Light weave, used as a tint texture for kimono cloth. */
    public static Texture weave() {
        int s = 128;
        Pixmap p = new Pixmap(s, s, Pixmap.Format.RGBA8888);
        p.setColor(0.92f, 0.92f, 0.92f, 1f);
        p.fill();
        p.setColor(0.78f, 0.78f, 0.78f, 1f);
        for (int y = 0; y < s; y += 4) p.fillRectangle(0, y, s, 1);
        for (int x = 0; x < s; x += 4) p.fillRectangle(x, 0, 1, s);
        Random r = new Random(5);
        speckle(p, r, 800, 40);
        return fromPixmap(p);
    }

    /** Dark lacquered metal with horizontal lacing lines (armour plate). */
    public static Texture plate() {
        int s = 128;
        Pixmap p = new Pixmap(s, s, Pixmap.Format.RGBA8888);
        p.setColor(0.55f, 0.56f, 0.6f, 1f);
        p.fill();
        p.setColor(0.25f, 0.25f, 0.28f, 1f);
        for (int y = 0; y < s; y += 16) p.fillRectangle(0, y, s, 2);
        Random r = new Random(11);
        speckle(p, r, 1000, 50);
        return fromPixmap(p);
    }
}
