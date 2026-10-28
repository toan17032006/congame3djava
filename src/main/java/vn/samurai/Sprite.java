package vn.samurai;

/** A billboard in the world: an item, the goal torii, or a healing shrine. */
public class Sprite {
    public enum Type { BANDAGE, DRAUGHT, BAMBOO, HERB, IRON, GOAL, SHRINE }

    public Type type;
    public double x, y;
    public boolean taken = false;
    public String label;

    public Sprite(Type type, double x, double y, String label) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.label = label;
    }
}
