package vn.samurai.gdx;

import java.util.ArrayList;
import java.util.List;

/**
 * Skill tree, mirroring the original web SKILL_TREE (3 branches x 5 nodes).
 * Active skills blade_4 / wind_4 / spirit_4 are new actions in SamuraiScreen
 * (keys Y / T / G). blade_2 upgrades the existing U skill instead of adding
 * a second one, because U is already Nhất Đao Trảm in this game.
 */
public final class SkillTree {
    public static final class Node {
        public final String id, branch, name, desc;
        public final int tier, cost;
        public final String[] requires;
        public final boolean active;

        public Node(String id, String branch, String name, int tier, int cost,
                    String[] requires, boolean active, String desc) {
            this.id = id;
            this.branch = branch;
            this.name = name;
            this.tier = tier;
            this.cost = cost;
            this.requires = requires;
            this.active = active;
            this.desc = desc;
        }
    }

    public static final List<Node> NODES = new ArrayList<>();

    static {
        // Blade (Đao)
        NODES.add(new Node("blade_1", "Đao", "Thế Kiếm Vững", 1, 1, new String[]{}, false, "+4 công kích."));
        NODES.add(new Node("blade_2", "Đao", "Nhất Đao Trảm (nâng cấp)", 2, 1, new String[]{"blade_1"}, false, "U hồi chiêu 5s -> 3s, sát thương +10."));
        NODES.add(new Node("blade_3", "Đao", "Điểm Huyết", 2, 2, new String[]{"blade_1"}, false, "+6% chí mạng."));
        NODES.add(new Node("blade_4", "Đao", "Cuồng Phong Trảm", 3, 2, new String[]{"blade_2", "blade_3"}, true, "Phím Y: xoay tròn chém diện rộng quanh mình, tốn 45 khí lực, hồi 12s."));
        NODES.add(new Node("blade_5", "Đao", "Sát Khí", 4, 3, new String[]{"blade_4"}, false, "+12% công kích."));
        // Wind (Gió)
        NODES.add(new Node("wind_1", "Gió", "Bước Nhẹ", 1, 1, new String[]{}, false, "-10% tiêu hao khí lực né và chạy nhanh."));
        NODES.add(new Node("wind_2", "Gió", "Né Ảnh", 2, 1, new String[]{"wind_1"}, false, "+0,12s bất khả xâm phạm khi né."));
        NODES.add(new Node("wind_3", "Gió", "Hành Vân", 2, 2, new String[]{"wind_1"}, false, "+10% tốc chạy."));
        NODES.add(new Node("wind_4", "Gió", "Tốc Ảnh", 3, 2, new String[]{"wind_2", "wind_3"}, true, "Phím T: lao nhanh về trước, đòn kế +80% sát thương, tốn 30 khí lực, hồi 9s."));
        NODES.add(new Node("wind_5", "Gió", "Hơi Thở Gió", 4, 3, new String[]{"wind_4"}, false, "+10 khí lực hồi mỗi giây."));
        // Spirit (Tâm)
        NODES.add(new Node("spirit_1", "Tâm", "Bản Lĩnh", 1, 1, new String[]{}, false, "+25 máu tối đa."));
        NODES.add(new Node("spirit_2", "Tâm", "Tâm Không", 2, 1, new String[]{"spirit_1"}, false, "+0,08s cửa sổ parry."));
        NODES.add(new Node("spirit_3", "Tâm", "Lưng Sắt", 2, 2, new String[]{"spirit_1"}, false, "+8 phòng thủ (giảm sát thương địch gây ra)."));
        NODES.add(new Node("spirit_4", "Tâm", "Thân Bất Hoại", 3, 2, new String[]{"spirit_2", "spirit_3"}, true, "Phím G: 10 giây sát thương nhận vào giảm một nửa, tốn 25 khí lực, hồi 20s."));
        NODES.add(new Node("spirit_5", "Tâm", "Kiếm Thánh", 4, 3, new String[]{"spirit_4"}, false, "+30 khí lực tối đa, +10% kinh nghiệm."));
    }

    private SkillTree() {}

    public static Node byId(String id) {
        for (Node n : NODES) if (n.id.equals(id)) return n;
        return null;
    }

    public static boolean canLearn(vn.samurai.Player p, Node n) {
        if (n == null || p.hasSkill(n.id)) return false;
        if (p.skillPoints < n.cost) return false;
        for (String r : n.requires) if (!p.hasSkill(r)) return false;
        return true;
    }
}
