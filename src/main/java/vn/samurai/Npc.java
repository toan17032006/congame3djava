package vn.samurai;

/**
 * A non-hostile character in a level: a villager to talk to, or an ally
 * samurai who fights alongside the player. Mirrors the original web game's
 * NPC system (villager / ally_samurai, faction system) in a condensed form.
 *
 * Rendering reuses the humanoid rig: the NPC owns a dummy Enemy object
 * (kind "villager" or "ally") whose position/state the rig reads. Villagers
 * never attack; allies do, with the same windup/cooldown pattern as enemies
 * but targeting enemies instead of the player.
 */
public class Npc {
    public String id, name, faction;
    public double x, y;
    public String[] dialogue;
    public int dialogueIndex = 0;
    public boolean isAlly;
    public Enemy body;

    public Npc(String id, String name, String faction, double x, double y,
               boolean isAlly, String... dialogue) {
        this.id = id;
        this.name = name;
        this.faction = faction;
        this.x = x;
        this.y = y;
        this.isAlly = isAlly;
        this.dialogue = dialogue;
        this.body = Enemy.create(isAlly ? "ally" : "villager", x, y);
    }

    /** Next dialogue line, cycling through the lines in order. */
    public String talk() {
        if (dialogue.length == 0) return "...";
        String line = dialogue[Math.min(dialogueIndex, dialogue.length - 1)];
        if (dialogueIndex < dialogue.length - 1) dialogueIndex++;
        return line;
    }
}
