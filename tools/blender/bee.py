"""제대로 만든 꿀벌: 마디진 배, 털 난 가슴, 겹눈, 더듬이, 날개 네 장, 다리 여섯.
뼈대를 넣고 비행 동작을 키프레임한 뒤 glTF(GLB)로 내보낸다."""
import math
import os
import sys

import bpy
from mathutils import Vector

OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def mat(name, rgb, rough=0.55, metallic=0.0, alpha=1.0, emit=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, alpha)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metallic
    if alpha < 1.0:
        b.inputs["Alpha"].default_value = alpha
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1.0)
        b.inputs["Emission Strength"].default_value = 0.35
    return m


FUR = mat("fur", (0.86, 0.62, 0.18), rough=0.92)
BAND = mat("band", (0.09, 0.06, 0.03), rough=0.75)
AMBER = mat("amber", (0.95, 0.72, 0.22), rough=0.5)
CHITIN = mat("chitin", (0.12, 0.09, 0.05), rough=0.35)
EYE = mat("eye", (0.07, 0.05, 0.09), rough=0.18, metallic=0.2)
WING = mat("wing", (0.88, 0.94, 1.0), rough=0.06, alpha=0.28)


def sphere(name, loc, scale, material, segs=20, rings=12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    o.rotation_euler = rot
    o.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return o


def tube(name, start, end, radius, material, verts=8):
    s, e = Vector(start), Vector(end)
    d = e - s
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=d.length,
                                        location=(s + e) / 2)
    o = bpy.context.active_object
    o.name = name
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = d.to_track_quat("Z", "Y")
    o.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return o


parts = []

# ── 배: 뒤로 갈수록 가늘어지는 마디 ──────────────────────────────────────
for i in range(5):
    t = i / 4
    x = -0.45 - i * 0.36
    r = 0.52 * (1 - t * 0.55)
    parts.append(sphere(f"seg{i}", (x, 0, -t * 0.06), (r * 1.05, r, r * 0.92),
                        BAND if i % 2 else AMBER, segs=18, rings=10))
parts.append(sphere("tip", (-2.0, 0, -0.1), (0.2, 0.16, 0.15), CHITIN, segs=12, rings=8))

# ── 가슴: 털이 난 덩어리 ─────────────────────────────────────────────────
parts.append(sphere("thorax", (0.18, 0, 0.06), (0.62, 0.58, 0.56), FUR))
for i in range(14):
    a = i / 14 * math.tau
    parts.append(sphere(f"fuzz{i}", (0.18 + math.cos(a) * 0.3, math.sin(a) * 0.5,
                                     0.06 + math.sin(a * 2) * 0.28),
                        (0.17, 0.17, 0.17), FUR, segs=8, rings=5))

# ── 머리와 겹눈, 더듬이 ──────────────────────────────────────────────────
parts.append(sphere("head", (0.92, 0, 0.1), (0.4, 0.42, 0.42), CHITIN))
for side in (1, -1):
    parts.append(sphere(f"eye{side}", (1.0, side * 0.3, 0.16), (0.2, 0.14, 0.26), EYE, segs=14, rings=9))
    parts.append(tube(f"ant{side}a", (1.05, side * 0.16, 0.32), (1.45, side * 0.3, 0.6), 0.035, CHITIN))
    parts.append(tube(f"ant{side}b", (1.45, side * 0.3, 0.6), (1.9, side * 0.26, 0.5), 0.028, CHITIN))

# ── 날개 네 장 ───────────────────────────────────────────────────────────
wing_objs = []
for side in (1, -1):
    for idx, (ln, wd, off, tilt) in enumerate(((1.55, 0.42, 0.0, 0.22), (1.0, 0.3, -0.42, 0.45))):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=5,
                                             location=(-0.1 + off, side * (0.55 + idx * 0.1), 0.5))
        w = bpy.context.active_object
        w.name = f"wing_{'L' if side > 0 else 'R'}{idx}"
        w.scale = (ln, wd, 0.022)
        w.rotation_euler = (0, 0, side * tilt)
        w.data.materials.append(WING)
        bpy.ops.object.shade_smooth()
        wing_objs.append((w, side, idx))
        parts.append(w)

# ── 다리 여섯 ────────────────────────────────────────────────────────────
for side in (1, -1):
    for i, (hx, drop) in enumerate(((0.55, -0.1), (0.1, -0.05), (-0.4, 0.0))):
        knee = (hx - 0.25, side * 0.62, -0.5 + drop)
        parts.append(tube(f"leg{side}{i}a", (hx, side * 0.34, -0.3), knee, 0.045, CHITIN))
        parts.append(tube(f"leg{side}{i}b", knee, (hx - 0.5, side * 0.5, -0.78 + drop), 0.035, CHITIN))

# 한 덩어리로 합친다
bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
body = bpy.context.active_object
body.name = "bee"

# ── 뼈대 ─────────────────────────────────────────────────────────────────
arm = bpy.data.armatures.new("rig")
rig = bpy.data.objects.new("bee_rig", arm)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")

BONES = {
    "root": ((0.18, 0, 0.06), (0.18, 0, -0.7), None),
    "thorax": ((0.18, 0, 0.06), (0.62, 0, 0.08), "root"),
    "head": ((0.62, 0, 0.08), (1.35, 0, 0.12), "thorax"),
    "abdomen1": ((0.18, 0, 0.06), (-0.75, 0, 0.0), "root"),
    "abdomen2": ((-0.75, 0, 0.0), (-2.1, 0, -0.12), "abdomen1"),
}
for side, s in (("L", 1), ("R", -1)):
    for idx in (0, 1):
        BONES[f"wing_{side}{idx}"] = (
            (-0.1, s * 0.2, 0.5),
            (-0.1 - idx * 0.4, s * 1.7, 0.62),
            "thorax",
        )
    for i, hx in enumerate((0.55, 0.1, -0.4)):
        BONES[f"leg_{side}{i}"] = ((hx, s * 0.3, -0.28), (hx - 0.5, s * 0.55, -0.8), "root")

for name, (h, t, p) in BONES.items():
    b = arm.edit_bones.new(name)
    b.head, b.tail = h, t
    if p:
        b.parent = arm.edit_bones[p]
bpy.ops.object.mode_set(mode="OBJECT")

bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type="ARMATURE_AUTO")
print("뼈 개수:", len(arm.bones), "| 모디파이어:", [m.type for m in body.modifiers])

# ── 비행 동작 ────────────────────────────────────────────────────────────
scene.frame_start = 1
scene.frame_end = 12
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="POSE")
for pb in rig.pose.bones:
    pb.rotation_mode = "XYZ"

# 날개는 빠르게 (3프레임 주기), 몸은 느리게 (12프레임 주기)
for f in range(1, 13):
    scene.frame_set(f)
    flap = math.sin((f - 1) / 3 * math.tau) * 0.95
    for side, s in (("L", 1), ("R", -1)):
        for idx in (0, 1):
            pb = rig.pose.bones[f"wing_{side}{idx}"]
            pb.rotation_euler = (s * flap, flap * 0.25, 0)
            pb.keyframe_insert("rotation_euler", frame=f)
    bob = math.sin((f - 1) / 12 * math.tau)
    rig.pose.bones["abdomen1"].rotation_euler = (0, bob * 0.09, 0)
    rig.pose.bones["abdomen1"].keyframe_insert("rotation_euler", frame=f)
    rig.pose.bones["abdomen2"].rotation_euler = (0, bob * 0.14, 0)
    rig.pose.bones["abdomen2"].keyframe_insert("rotation_euler", frame=f)
    rig.pose.bones["head"].rotation_euler = (0, -bob * 0.05, 0)
    rig.pose.bones["head"].keyframe_insert("rotation_euler", frame=f)
    for side, s in (("L", 1), ("R", -1)):
        for i in range(3):
            pb = rig.pose.bones[f"leg_{side}{i}"]
            pb.rotation_euler = (0, 0.35 + bob * 0.08 + i * 0.1, 0)
            pb.keyframe_insert("rotation_euler", frame=f)

rig.animation_data.action.name = "fly"
bpy.ops.object.mode_set(mode="OBJECT")

# ── 미리보기 렌더 ────────────────────────────────────────────────────────
bpy.ops.object.light_add(type="SUN", location=(5, -6, 7))
bpy.context.active_object.data.energy = 3.5
bpy.ops.object.light_add(type="AREA", location=(-5, 4, 2))
bpy.context.active_object.data.energy = 220
bpy.context.active_object.data.size = 8
bpy.ops.object.light_add(type="AREA", location=(-2, -6, -3))
bpy.context.active_object.data.energy = 90
bpy.context.active_object.data.size = 6

bpy.ops.object.camera_add(location=(3.6, -5.6, 2.0), rotation=(math.radians(76), 0, math.radians(33)))
scene.camera = bpy.context.active_object
world = bpy.data.worlds.new("w")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.08, 0.13, 0.22, 1)
scene.world = world

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.resolution_x = 640
scene.render.resolution_y = 480
scene.frame_set(2)
scene.render.filepath = os.path.join(OUT, "bee2.png")
bpy.ops.render.render(write_still=True)

glb = os.path.join(OUT, "bee2.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", export_animations=True,
                          export_frame_range=True, export_yup=True)
print("GLB:", os.path.getsize(glb), "바이트 | 정점:", len(body.data.vertices),
      "| 면:", len(body.data.polygons))
