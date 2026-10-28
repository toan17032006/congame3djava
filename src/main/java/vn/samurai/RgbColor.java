package vn.samurai;

/**
 * A plain RGB colour (0-255 per channel), with no AWT or LibGDX dependency.
 * The old code used java.awt.Color here, but that pulls in AWT's Toolkit on
 * first use, which fails on minimal headless systems and is unnecessary for
 * a LibGDX game. Renderers convert this to their own colour type.
 */
public class RgbColor {
    public final int r, g, b;

    public RgbColor(int r, int g, int b) {
        this.r = r;
        this.g = g;
        this.b = b;
    }
}
