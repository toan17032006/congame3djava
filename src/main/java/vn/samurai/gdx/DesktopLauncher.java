package vn.samurai.gdx;

import com.badlogic.gdx.backends.lwjgl3.Lwjgl3Application;
import com.badlogic.gdx.backends.lwjgl3.Lwjgl3ApplicationConfiguration;

/** Desktop entry point for the LibGDX 3D version. Run with: ./gradlew run */
public class DesktopLauncher {
    public static void main(String[] args) {
        // Test hook for automated checks under Xvfb: --test-screenshot makes
        // the game auto-start and save one frame, then exit. Normal runs
        // pass no arguments and are unaffected.
        for (String a : args) {
            if (a.equals("--test-screenshot")) System.setProperty("samurai.testScreenshot", "true");
        }
        Lwjgl3ApplicationConfiguration config = new Lwjgl3ApplicationConfiguration();
        config.setTitle("Đạo Của Kẻ Vô Danh - Samurai 3D (LibGDX)");
        config.setWindowedMode(1024, 640);
        config.setForegroundFPS(60);
        config.setResizable(false);
        new Lwjgl3Application(new SamuraiGame(), config);
    }
}
