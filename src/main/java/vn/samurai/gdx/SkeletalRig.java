package vn.samurai.gdx;

import com.badlogic.gdx.math.Matrix4;
import com.badlogic.gdx.math.Vector3;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * A true skeletal rig: joints in a parent-child tree, solved by forward
 * kinematics. A child's world transform is its parent's world transform
 * multiplied by its own local offset and rotation, so leaning the torso
 * moves the head and arms, swinging a thigh moves the shin and foot, and
 * swinging a shoulder moves the elbow, hand and sword.
 *
 * This replaces the previous flat rig, where every part was placed
 * independently in world space and therefore could not inherit a parent
 * joint's motion. The rig itself holds no meshes: the screen owns the
 * ModelInstances and places them from the joint matrices (see
 * SamuraiScreen.placeJoint), so textures and materials stay as before.
 *
 * Joint tree (offsets in local units, before the enemy scale):
 *   root (ground, yaw + root pitch for death fall)
 *    └ hips (0, 0.90, 0)
 *       ├ torso (0, 0.25, 0)          -> 1.15
 *       │   ├ head (0, 0.37, 0)       -> 1.52
 *       │   ├ shoulderR (0.42, 0.23, 0)
 *       │   │   └ elbowR (0, -0.50, 0) -> handR (0, -0.25, 0)
 *       │   └ shoulderL (-0.42, 0.23, 0)
 *       │       └ elbowL (0, -0.50, 0) -> handL (0, -0.25, 0)
 *       ├ hipR (0.16, -0.05, 0)
 *       │   └ kneeR (0, -0.45, 0) -> footR (0, -0.45, 0)
 *       └ hipL (-0.16, -0.05, 0)
 *           └ kneeL (0, -0.45, 0) -> footL (0, -0.45, 0)
 *
 * Pose angles are in degrees, pitch = rotation around X (swing forward /
 * back), roll = rotation around Z (outward tilt). The root also carries
 * the enemy yaw (around Y) and a root pitch used for the death fall.
 */
public class SkeletalRig {
    public static class Joint {
        public String name;
        public Vector3 offset = new Vector3();
        public float pitch, roll;
        public Joint parent;
        public List<Joint> children = new ArrayList<>();
        public Matrix4 world = new Matrix4();

        public Joint(String name, float ox, float oy, float oz) {
            this.name = name;
            this.offset.set(ox, oy, oz);
        }

        public Joint child(String name, float ox, float oy, float oz) {
            Joint c = new Joint(name, ox, oy, oz);
            c.parent = this;
            children.add(c);
            return c;
        }
    }

    public Joint root, hips, torso, head;
    public Joint shoulderR, elbowR, handR, shoulderL, elbowL, handL;
    public Joint hipR, kneeR, footR, hipL, kneeL, footL;
    private Map<String, Joint> byName = new HashMap<>();

    public SkeletalRig() {
        root = new Joint("root", 0, 0, 0);
        hips = root.child("hips", 0, 0.90f, 0);
        torso = hips.child("torso", 0, 0.25f, 0);
        head = torso.child("head", 0, 0.37f, 0);
        shoulderR = torso.child("shoulderR", 0.42f, 0.23f, 0);
        elbowR = shoulderR.child("elbowR", 0, -0.50f, 0);
        handR = elbowR.child("handR", 0, -0.25f, 0);
        shoulderL = torso.child("shoulderL", -0.42f, 0.23f, 0);
        elbowL = shoulderL.child("elbowL", 0, -0.50f, 0);
        handL = elbowL.child("handL", 0, -0.25f, 0);
        hipR = hips.child("hipR", 0.16f, -0.05f, 0);
        kneeR = hipR.child("kneeR", 0, -0.45f, 0);
        footR = kneeR.child("footR", 0, -0.45f, 0);
        hipL = hips.child("hipL", -0.16f, -0.05f, 0);
        kneeL = hipL.child("kneeL", 0, -0.45f, 0);
        footL = kneeL.child("footL", 0, -0.45f, 0);
        collect(root);
    }

    private void collect(Joint j) {
        byName.put(j.name, j);
        for (Joint c : j.children) collect(c);
    }

    public Joint joint(String name) {
        return byName.get(name);
    }

    /** Pose the rig and solve forward kinematics. */
    public void pose(float rootX, float rootY, float rootZ, float yawDeg, float scale,
                     float rootPitchDeg,
                     float torsoLean, float headTilt,
                     float shoulderRPitch, float shoulderLPitch,
                     float elbowRPitch, float elbowLPitch,
                     float hipRPitch, float hipLPitch,
                     float kneeRPitch, float kneeLPitch) {
        // Reset all joint rotations, then set the posed ones.
        for (Joint j : byName.values()) {
            j.pitch = 0;
            j.roll = 0;
        }
        torso.pitch = torsoLean;
        head.pitch = headTilt;
        shoulderR.pitch = shoulderRPitch;
        shoulderR.roll = 12f;
        shoulderL.pitch = shoulderLPitch;
        shoulderL.roll = -12f;
        elbowR.pitch = elbowRPitch;
        elbowL.pitch = elbowLPitch;
        hipR.pitch = hipRPitch;
        hipL.pitch = hipLPitch;
        kneeR.pitch = kneeRPitch;
        kneeL.pitch = kneeLPitch;

        // Root: translate, yaw, root pitch (death fall), scale.
        // Scale is applied at the root so every joint offset scales with it.
        root.world.idt()
                .translate(rootX, rootY, rootZ)
                .rotate(Vector3.Y, yawDeg)
                .rotate(Vector3.X, rootPitchDeg)
                .scale(scale, scale, scale);
        solve(hips, root.world);
    }

    private void solve(Joint j, Matrix4 parentWorld) {
        // world = parentWorld * T(offset) * R_x(pitch) * R_z(roll)
        j.world.set(parentWorld)
                .translate(j.offset)
                .rotate(Vector3.X, j.pitch)
                .rotate(Vector3.Z, j.roll);
        for (Joint c : j.children) solve(c, j.world);
    }

    /** Translation component of a joint's world matrix, for tests and debugging. */
    public Vector3 jointPosition(String name) {
        Joint j = byName.get(name);
        if (j == null) return new Vector3();
        return j.world.getTranslation(new Vector3());
    }
}
