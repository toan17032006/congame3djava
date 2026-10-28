package vn.samurai.gdx;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.audio.Music;
import com.badlogic.gdx.audio.Sound;
import com.badlogic.gdx.files.FileHandle;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

/**
 * Synthesized music and sound effects, modelled on the original web game's
 * WebAudio AudioMgr (web/src/gfx/audio.js): no audio files are shipped.
 * Everything is generated as WAV at startup with plain Java PCM synthesis
 * and then played through LibGDX (Music for loops, Sound for one-shots).
 *
 * - Music: pentatonic-ish D scale [220, 247.5, 293.33, 329.63, 392, 440,
 *   493.88], triangle pluck + sine harmonic, random-walk melody replaced
 *   here by a fixed walk so the loop is seamless, one pluck every 1.45s,
 *   bass every 4th note, taiko drum every 2nd note.
 * - Ambient: filtered noise wind, lowpass ~380 Hz, slow LFO gusts.
 * - SFX: same names and rough parameters as the original (swing, hit,
 *   block, parry, clang, dodge, step, pickup, coin, levelup, quest,
 *   death, roar, arrow, fire, thud, heal, gate, ui, craft, unlock).
 *
 * All audio work is wrapped in try/catch: if the machine has no audio
 * device (headless VM, ALSA warnings), the game keeps running silently.
 */
public class AudioManager {
    private static final int SR = 44100;
    private static final String[] SFX_NAMES = {
            "swing", "swingHeavy", "hit", "hitHeavy", "block", "parry", "clang",
            "dodge", "step", "pickup", "coin", "levelup", "quest", "death",
            "roar", "arrow", "fire", "thud", "heal", "gate", "ui", "craft", "unlock"
    };

    private final Map<String, Sound> sfx = new HashMap<>();
    private Music music;
    private Music wind;
    private boolean musicOn = true;
    private boolean enabled = false;

    public boolean isEnabled() {
        return enabled;
    }

    public boolean isMusicOn() {
        return musicOn;
    }

    public void init() {
        try {
            File dir = new File("audio");
            if (!dir.exists()) dir.mkdirs();
            // Music + wind loops (reused if already generated).
            File bgm = new File(dir, "bgm.wav");
            if (!bgm.exists()) writeWav(bgm, makeBgm());
            File windFile = new File(dir, "wind.wav");
            if (!windFile.exists()) writeWav(windFile, makeWind());
            for (String name : SFX_NAMES) {
                File f = new File(dir, name + ".wav");
                if (!f.exists()) writeWav(f, makeSfx(name));
            }
            music = Gdx.audio.newMusic(Gdx.files.local("audio/bgm.wav"));
            music.setLooping(true);
            music.setVolume(0.4f);
            music.play();
            wind = Gdx.audio.newMusic(Gdx.files.local("audio/wind.wav"));
            wind.setLooping(true);
            wind.setVolume(0.07f);
            wind.play();
            for (String name : SFX_NAMES) {
                FileHandle h = Gdx.files.local("audio/" + name + ".wav");
                sfx.put(name, Gdx.audio.newSound(h));
            }
            enabled = true;
        } catch (Exception e) {
            // No audio device, missing files, etc: play silently.
            enabled = false;
        }
    }

    public void play(String name) {
        if (!enabled) return;
        try {
            Sound s = sfx.get(name);
            if (s != null) s.play(0.8f);
        } catch (Exception ignored) {
        }
    }

    public void toggleMusic() {
        musicOn = !musicOn;
        try {
            if (musicOn) {
                if (music != null) music.play();
                if (wind != null) wind.play();
            } else {
                if (music != null) music.pause();
                if (wind != null) wind.pause();
            }
        } catch (Exception ignored) {
        }
    }

    public void dispose() {
        try {
            if (music != null) music.dispose();
            if (wind != null) wind.dispose();
            for (Sound s : sfx.values()) s.dispose();
        } catch (Exception ignored) {
        }
    }

    // ---------- PCM synthesis ----------

    private enum Wave { SINE, TRIANGLE, SQUARE, SAWTOOTH }

    private static float waveSample(Wave w, double phase) {
        double p = phase - Math.floor(phase);
        switch (w) {
            case SINE: return (float) Math.sin(2 * Math.PI * p);
            case TRIANGLE: return (float) (p < 0.5 ? 4 * p - 1 : 3 - 4 * p);
            case SQUARE: return p < 0.5 ? 1f : -1f;
            case SAWTOOTH: return (float) (2 * p - 1);
            default: return 0f;
        }
    }

    /** Tone with frequency sweep and exponential decay. */
    private static void addTone(float[] buf, int start, double f0, double f1,
                                double dur, Wave w, float vol) {
        int n = (int) (dur * SR);
        for (int i = 0; i < n && start + i < buf.length; i++) {
            double t = (double) i / SR;
            double f = f1 > 0 ? f0 * Math.pow(f1 / Math.max(f0, 1), t / dur) : f0;
            // Phase by integrating frequency: approximate with average freq.
            double phase = (f0 + f) / 2 * t;
            double env = Math.exp(-t / (dur * 0.35));
            // Attack 15ms.
            if (t < 0.015) env *= t / 0.015;
            buf[start + i] += waveSample(w, phase) * vol * (float) env;
        }
    }

    /** Pluck (koto-like): triangle + sine harmonic, long decay, like the original. */
    private static void addPluck(float[] buf, int start, double freq, float vol) {
        int n = (int) (1.6 * SR);
        for (int i = 0; i < n && start + i < buf.length; i++) {
            double t = (double) i / SR;
            double env;
            if (t < 0.015) env = t / 0.015;
            else env = Math.exp(-(t - 0.015) / 0.55);
            float v = (float) (waveSample(Wave.TRIANGLE, freq * t) * 0.75
                    + waveSample(Wave.SINE, freq * 2.01 * t) * 0.25);
            buf[start + i] += v * vol * (float) env;
        }
    }

    /** White noise through a one-pole lowpass whose cutoff sweeps. */
    private static void addNoise(float[] buf, int start, double dur, float vol,
                                 double cut0, double cut1, Random rng) {
        int n = (int) (dur * SR);
        double prev = 0;
        for (int i = 0; i < n && start + i < buf.length; i++) {
            double t = (double) i / SR;
            double cut = cut0 * Math.pow(cut1 / Math.max(cut0, 1), t / dur);
            double a = cut / (cut + SR * 0.5);
            double white = rng.nextDouble() * 2 - 1;
            prev = prev + a * (white - prev);
            double env = Math.exp(-t / (dur * 0.4));
            if (t < 0.01) env *= t / 0.01;
            buf[start + i] += (float) (prev * 2.2 * vol * env);
        }
    }

    private static float[] makeBgm() {
        double[] scale = {220, 247.5, 293.33, 329.63, 392, 440, 493.88};
        int[] walk = {3, 4, 5, 4, 3, 4, 2, 3, 4, 3, 5, 4, 3, 2, 3, 4};
        double step = 1.45;
        int total = (int) (walk.length * step * SR);
        float[] buf = new float[total];
        Random rng = new Random(1234);
        for (int i = 0; i < walk.length; i++) {
            int start = (int) (i * step * SR);
            double f = scale[walk[i]];
            addPluck(buf, start, f, 0.32f);
            if (i % 4 == 3) {
                int bassStart = start + (int) (0.4 * SR);
                addPluck(buf, bassStart, scale[Math.max(0, walk[i] - 2)] / 2, 0.24f);
            }
            if (i % 2 == 0) {
                // Taiko: low sine burst + a little noise thump.
                addTone(buf, start, 90, 40, 0.3, Wave.SINE, 0.5f);
                addNoise(buf, start, 0.15, 0.15f, 300, 120, rng);
            }
        }
        return buf;
    }

    private static float[] makeWind() {
        int total = 6 * SR;
        float[] buf = new float[total];
        Random rng = new Random(77);
        double prev = 0;
        for (int i = 0; i < total; i++) {
            double t = (double) i / SR;
            double a = 380.0 / (380.0 + SR * 0.5);
            double white = rng.nextDouble() * 2 - 1;
            prev = prev + a * (white - prev);
            double lfo = 0.05 + 0.025 * Math.sin(2 * Math.PI * 0.13 * t)
                    + 0.02 * Math.sin(2 * Math.PI * 0.05 * t + 1.3);
            buf[i] = (float) (prev * 2.2 * lfo);
        }
        return buf;
    }

    private static float[] makeSfx(String name) {
        Random rng = new Random(name.hashCode());
        float[] buf;
        switch (name) {
            case "swing": {
                buf = new float[(int) (0.2 * SR)];
                addNoise(buf, 0, 0.18, 0.5f, 900, 3800, rng);
                break;
            }
            case "swingHeavy": {
                buf = new float[(int) (0.35 * SR)];
                addNoise(buf, 0, 0.3, 0.6f, 500, 2400, rng);
                addTone(buf, 0, 160, 60, 0.25, Wave.SINE, 0.25f);
                break;
            }
            case "hit": {
                buf = new float[(int) (0.2 * SR)];
                addNoise(buf, 0, 0.12, 0.7f, 2400, 2400, rng);
                addTone(buf, 0, 180, 50, 0.14, Wave.SQUARE, 0.35f);
                break;
            }
            case "hitHeavy": {
                buf = new float[(int) (0.3 * SR)];
                addNoise(buf, 0, 0.2, 0.8f, 1400, 1400, rng);
                addTone(buf, 0, 120, 35, 0.24, Wave.SQUARE, 0.5f);
                break;
            }
            case "block": {
                buf = new float[(int) (0.15 * SR)];
                addTone(buf, 0, 2200, 1400, 0.1, Wave.SQUARE, 0.3f);
                addNoise(buf, 0, 0.08, 0.4f, 4000, 4000, rng);
                break;
            }
            case "parry": {
                buf = new float[(int) (0.35 * SR)];
                addTone(buf, 0, 2600, 3400, 0.22, Wave.TRIANGLE, 0.5f);
                addTone(buf, (int) (0.02 * SR), 3900, 2600, 0.3, Wave.SINE, 0.3f);
                break;
            }
            case "clang": {
                buf = new float[(int) (0.25 * SR)];
                addTone(buf, 0, 1800, 900, 0.18, Wave.SQUARE, 0.4f);
                addNoise(buf, 0, 0.1, 0.35f, 3200, 3200, rng);
                break;
            }
            case "dodge": {
                buf = new float[(int) (0.25 * SR)];
                addNoise(buf, 0, 0.22, 0.4f, 600, 2000, rng);
                break;
            }
            case "step": {
                buf = new float[(int) (0.08 * SR)];
                addNoise(buf, 0, 0.06, 0.25f, 300, 300, rng);
                break;
            }
            case "pickup": {
                buf = new float[(int) (0.25 * SR)];
                addTone(buf, 0, 660, 880, 0.1, Wave.TRIANGLE, 0.4f);
                addTone(buf, (int) (0.08 * SR), 990, 1320, 0.12, Wave.TRIANGLE, 0.3f);
                break;
            }
            case "coin": {
                buf = new float[(int) (0.2 * SR)];
                addTone(buf, 0, 1320, 1760, 0.08, Wave.SQUARE, 0.25f);
                addTone(buf, (int) (0.06 * SR), 1760, 2200, 0.1, Wave.SQUARE, 0.2f);
                break;
            }
            case "levelup": {
                buf = new float[(int) (0.7 * SR)];
                int[] notes = {523, 659, 784, 1047};
                for (int i = 0; i < notes.length; i++) {
                    addTone(buf, (int) (i * 0.1 * SR), notes[i], notes[i], 0.24, Wave.TRIANGLE, 0.4f);
                }
                break;
            }
            case "quest": {
                buf = new float[(int) (0.45 * SR)];
                int[] notes = {659, 784, 988};
                for (int i = 0; i < notes.length; i++) {
                    addTone(buf, (int) (i * 0.09 * SR), notes[i], notes[i], 0.2, Wave.SINE, 0.35f);
                }
                break;
            }
            case "death": {
                buf = new float[(int) (1.0 * SR)];
                addTone(buf, 0, 220, 55, 0.9, Wave.SAWTOOTH, 0.45f);
                addNoise(buf, 0, 0.7, 0.35f, 400, 90, rng);
                break;
            }
            case "roar": {
                buf = new float[(int) (1.2 * SR)];
                addTone(buf, 0, 90, 45, 1.1, Wave.SAWTOOTH, 0.6f);
                addNoise(buf, 0, 1.0, 0.5f, 250, 70, rng);
                break;
            }
            case "arrow": {
                buf = new float[(int) (0.35 * SR)];
                addNoise(buf, 0, 0.3, 0.4f, 2600, 500, rng);
                break;
            }
            case "fire": {
                buf = new float[(int) (0.55 * SR)];
                addNoise(buf, 0, 0.5, 0.5f, 700, 300, rng);
                addTone(buf, 0, 140, 70, 0.4, Wave.SAWTOOTH, 0.2f);
                break;
            }
            case "thud": {
                buf = new float[(int) (0.3 * SR)];
                addTone(buf, 0, 90, 38, 0.26, Wave.SINE, 0.7f);
                addNoise(buf, 0, 0.16, 0.5f, 500, 500, rng);
                break;
            }
            case "heal": {
                buf = new float[(int) (0.5 * SR)];
                addTone(buf, 0, 520, 780, 0.25, Wave.SINE, 0.35f);
                addTone(buf, (int) (0.12 * SR), 780, 1170, 0.3, Wave.SINE, 0.25f);
                break;
            }
            case "gate": {
                buf = new float[(int) (0.8 * SR)];
                addTone(buf, 0, 196, 98, 0.7, Wave.TRIANGLE, 0.5f);
                addTone(buf, (int) (0.05 * SR), 392, 196, 0.7, Wave.SINE, 0.35f);
                break;
            }
            case "ui": {
                buf = new float[(int) (0.08 * SR)];
                addTone(buf, 0, 880, 940, 0.05, Wave.TRIANGLE, 0.2f);
                break;
            }
            case "craft": {
                buf = new float[(int) (0.4 * SR)];
                addTone(buf, 0, 440, 330, 0.12, Wave.SQUARE, 0.3f);
                addNoise(buf, (int) (0.04 * SR), 0.14, 0.3f, 3000, 3000, rng);
                addTone(buf, (int) (0.16 * SR), 550, 660, 0.16, Wave.TRIANGLE, 0.3f);
                break;
            }
            case "unlock": {
                buf = new float[(int) (0.6 * SR)];
                addTone(buf, 0, 523, 523, 0.15, Wave.TRIANGLE, 0.35f);
                addTone(buf, (int) (0.12 * SR), 784, 784, 0.2, Wave.TRIANGLE, 0.35f);
                addTone(buf, (int) (0.24 * SR), 1047, 1047, 0.3, Wave.TRIANGLE, 0.35f);
                break;
            }
            default: {
                buf = new float[(int) (0.1 * SR)];
                addTone(buf, 0, 440, 440, 0.1, Wave.SINE, 0.2f);
                break;
            }
        }
        return buf;
    }

    private static void writeWav(File file, float[] samples) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        DataOutputStream out = new DataOutputStream(baos);
        int dataSize = samples.length * 2;
        out.writeBytes("RIFF");
        out.writeInt(Integer.reverseBytes(36 + dataSize));
        out.writeBytes("WAVE");
        out.writeBytes("fmt ");
        out.writeInt(Integer.reverseBytes(16));
        out.writeShort(Short.reverseBytes((short) 1)); // PCM
        out.writeShort(Short.reverseBytes((short) 1)); // mono
        out.writeInt(Integer.reverseBytes(SR));
        out.writeInt(Integer.reverseBytes(SR * 2));
        out.writeShort(Short.reverseBytes((short) 2)); // block align
        out.writeShort(Short.reverseBytes((short) 16)); // bits
        out.writeBytes("data");
        out.writeInt(Integer.reverseBytes(dataSize));
        for (float s : samples) {
            float c = Math.max(-1f, Math.min(1f, s));
            out.writeShort(Short.reverseBytes((short) (c * 32767)));
        }
        out.flush();
        try (FileOutputStream fos = new FileOutputStream(file)) {
            fos.write(baos.toByteArray());
        }
    }
}
