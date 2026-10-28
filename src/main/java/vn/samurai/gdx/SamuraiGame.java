package vn.samurai.gdx;

import com.badlogic.gdx.Game;

/** LibGDX application: one screen holds the whole game, like the old Swing GamePanel. */
public class SamuraiGame extends Game {
    @Override
    public void create() {
        setScreen(new SamuraiScreen());
    }
}
