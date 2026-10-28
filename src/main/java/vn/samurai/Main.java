package vn.samurai;

import javax.swing.JFrame;
import javax.swing.SwingUtilities;

/** Entry point: opens the samurai game window. */
public class Main {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame frame = new JFrame("Đạo Của Kẻ Vô Danh - Samurai 3D (Java)");
            GamePanel panel = new GamePanel();
            frame.add(panel);
            frame.pack();
            frame.setLocationRelativeTo(null);
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            frame.setVisible(true);
            panel.requestFocusInWindow();
        });
    }
}
