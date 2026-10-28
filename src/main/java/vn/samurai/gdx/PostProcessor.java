package vn.samurai.gdx;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Pixmap;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.FrameBuffer;
import com.badlogic.gdx.graphics.glutils.ShaderProgram;

/**
 * Post-processing in GLSL (not Java): the 3D scene is rendered into a
 * FrameBuffer, then drawn to the screen through a shader that does
 * bright-pass bloom, ACES tone mapping (the PBR-style filmic curve) and
 * a vignette. If the shader or the FrameBuffer cannot be created on a
 * machine, {@link #enabled} is false and the game renders normally
 * without post-processing, so a shader failure never breaks the game.
 *
 * GLSL is the only non-Java language in the game, and it is a small
 * fraction of the codebase: the game itself, its logic, rig, audio and
 * UI remain Java (LibGDX).
 */
public class PostProcessor {
    public boolean enabled = false;
    private FrameBuffer fbo;
    private SpriteBatch batch;
    private ShaderProgram shader;
    private int width, height;

    private static final String VERT =
            "attribute vec4 a_position;\n" +
            "attribute vec4 a_color;\n" +
            "attribute vec2 a_texCoord0;\n" +
            "uniform mat4 u_projTrans;\n" +
            "varying vec4 v_color;\n" +
            "varying vec2 v_texCoords;\n" +
            "void main() {\n" +
            "  v_color = a_color;\n" +
            "  v_texCoords = a_texCoord0;\n" +
            "  gl_Position = u_projTrans * a_position;\n" +
            "}\n";

    private static final String FRAG =
            "#ifdef GL_ES\n" +
            "precision mediump float;\n" +
            "#endif\n" +
            "varying vec4 v_color;\n" +
            "varying vec2 v_texCoords;\n" +
            "uniform sampler2D u_texture;\n" +
            "uniform vec2 u_resolution;\n" +
            "uniform float u_bloom;\n" +
            "void main() {\n" +
            "  vec4 col = texture2D(u_texture, v_texCoords);\n" +
            "  vec3 c = col.rgb;\n" +
            "  vec3 bloom = vec3(0.0);\n" +
            "  vec2 texel = 1.0 / u_resolution;\n" +
            "  for (int x = -1; x <= 1; x++) {\n" +
            "    for (int y = -1; y <= 1; y++) {\n" +
            "      vec3 s = texture2D(u_texture, v_texCoords + vec2(float(x), float(y)) * texel * 2.0).rgb;\n" +
            "      float lum = dot(s, vec3(0.2126, 0.7152, 0.0722));\n" +
            "      if (lum > 0.75) bloom += (s - 0.75) * 0.35;\n" +
            "    }\n" +
            "  }\n" +
            "  c += bloom * u_bloom;\n" +
            "  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);\n" +
            "  c = pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));\n" +
            "  vec2 d = v_texCoords - 0.5;\n" +
            "  float vig = 1.0 - dot(d, d) * 0.55;\n" +
            "  c *= vig;\n" +
            "  gl_FragColor = vec4(c, col.a);\n" +
            "}\n";

    public PostProcessor(int width, int height) {
        this.width = width;
        this.height = height;
        try {
            ShaderProgram.pedantic = false;
            shader = new ShaderProgram(VERT, FRAG);
            if (!shader.isCompiled()) {
                Gdx.app.log("Post", "Shader compile failed: " + shader.getLog());
                return;
            }
            fbo = new FrameBuffer(Pixmap.Format.RGBA8888, width, height, true);
            batch = new SpriteBatch();
            batch.setShader(shader);
            enabled = true;
        } catch (Exception e) {
            Gdx.app.log("Post", "Post-processing disabled: " + e.getMessage());
            enabled = false;
        }
    }

    public void begin() {
        if (enabled) fbo.begin();
    }

    /** End the scene render and draw it through the bloom/tone-mapping shader. */
    public void endAndDraw() {
        if (!enabled) return;
        try {
            fbo.end();
            batch.begin();
            shader.setUniformf("u_resolution", (float) width, (float) height);
            shader.setUniformf("u_bloom", 1.0f);
            Texture tex = fbo.getColorBufferTexture();
            batch.draw(tex, 0, 0, width, height);
            batch.end();
        } catch (Exception e) {
            // Never break the game for a post failure: fall back to direct rendering.
            Gdx.app.log("Post", "Post draw failed, disabling: " + e.getMessage());
            enabled = false;
        }
    }

    public void dispose() {
        try {
            if (fbo != null) fbo.dispose();
        } catch (Exception ignored) {
        }
        try {
            if (batch != null) batch.dispose();
        } catch (Exception ignored) {
        }
        try {
            if (shader != null) shader.dispose();
        } catch (Exception ignored) {
        }
    }
}
