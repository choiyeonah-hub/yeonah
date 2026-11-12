"""정자의 여행 3D — Blender 에셋 생성기.

손으로 만든 바이너리 대신 이 스크립트가 모든 3D 모델을 만든다. 모양이나 비율을 바꾸고 싶으면
여기 숫자를 고치고 다시 돌리면 된다. 결과물은 ../assets/*.glb.

실행:
    blender --background --python tools/make_assets.py
    # 또는 bpy 파이썬 모듈로: python tools/make_assets.py

정자 꼬리는 뼈대(아마추어)를 심고 파동 애니메이션을 구워 넣는다. 기사에서 말한
"공통 골격을 설정하고 캐릭터마다 속도를 조정"하는 방식과 같은 접근이고,
재생 속도는 게임 쪽(three.js)에서 조절한다.
"""

import math
import os
import sys

import bpy
from mathutils import Euler, Vector

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")

TAIL_BONES = 8
TAIL_LENGTH = 3.4
RING_HOLE_RADIUS = 0.46  # 게임 쪽 js/game3d.js 의 RING_HOLE_RADIUS 와 같아야 한다
RING_HOLE_OFFSET = 0.42  # 같은 이유로 RING_HOLE_OFFSET 과 짝을 이룬다
SWIM_FRAMES = 24  # 한 번의 꼬리 파동이 도는 프레임 수


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, emission=0.0, roughness=0.45, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, alpha)
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        mat.blend_method = "BLEND"
    return mat


def shade_smooth(obj):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()


def export(name):
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.normpath(os.path.join(OUT_DIR, name + ".glb"))
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_animations=True,
        export_apply=False,
    )
    print("wrote", path, os.path.getsize(path), "bytes")


def jitter_vertices(obj, amount, freq=2.3, seed=1.0):
    """정규분포 노이즈 대신 꼭짓점 좌표의 삼각함수로 울퉁불퉁하게 만든다(결과가 항상 같도록)."""
    for v in obj.data.vertices:
        n = v.co.normalized()
        wobble = (
            math.sin(n.x * freq * 3.1 + seed)
            + math.sin(n.y * freq * 2.7 + seed * 2)
            + math.sin(n.z * freq * 3.7 + seed * 3)
        ) / 3.0
        v.co += n * wobble * amount


# --------------------------------- 정자 --------------------------------- #


def build_sperm():
    reset_scene()
    skin = material("sperm_skin", (0.86, 0.93, 1.0), roughness=0.25)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=1.0)
    head = bpy.context.object
    head.name = "head"
    head.scale = (1.0, 0.66, 0.52)
    head.data.materials.append(skin)
    shade_smooth(head)

    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.42, radius2=0.16, depth=0.9)
    mid = bpy.context.object
    mid.name = "midpiece"
    mid.rotation_euler = Euler((0, math.radians(90), 0))
    mid.location = (-1.25, 0, 0)
    mid.data.materials.append(skin)
    shade_smooth(mid)

    # 꼬리: x축을 따라 길게 눕힌 원통. 뼈대가 구부릴 수 있도록 촘촘히 자른다.
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.12, depth=TAIL_LENGTH)
    tail = bpy.context.object
    tail.name = "tail"
    tail.rotation_euler = Euler((0, math.radians(90), 0))
    tail.location = (-1.7 - TAIL_LENGTH / 2, 0, 0)
    tail.data.materials.append(skin)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.modifier_add(type="SUBSURF")
    tail.modifiers["Subdivision"].levels = 0
    tail.modifiers["Subdivision"].render_levels = 0
    bpy.ops.object.modifier_remove(modifier="Subdivision")

    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.subdivide(number_cuts=TAIL_BONES * 3)
    bpy.ops.object.mode_set(mode="OBJECT")

    # 아마추어: 머리 뒤에서 꼬리 끝까지 -x 방향으로 뼈를 잇는다.
    bpy.ops.object.armature_add(location=(0, 0, 0))
    rig = bpy.context.object
    rig.name = "rig"
    bpy.ops.object.mode_set(mode="EDIT")
    edit_bones = rig.data.edit_bones
    for b in list(edit_bones):
        edit_bones.remove(b)

    seg = TAIL_LENGTH / TAIL_BONES
    start_x = -1.7
    parent = None
    for i in range(TAIL_BONES):
        bone = edit_bones.new("tail_%d" % i)
        bone.head = Vector((start_x - i * seg, 0, 0))
        bone.tail = Vector((start_x - (i + 1) * seg, 0, 0))
        if parent:
            bone.parent = parent
            bone.use_connect = True
        parent = bone
    bpy.ops.object.mode_set(mode="OBJECT")

    for obj in (head, mid, tail):
        obj.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")

    bake_swim(rig)

    bpy.context.scene.frame_set(1)
    export("sperm")


def bake_swim(rig):
    """꼬리를 따라 흐르는 파동을 프레임마다 구워 넣는다."""
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = SWIM_FRAMES

    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    for frame in range(1, SWIM_FRAMES + 1):
        scene.frame_set(frame)
        phase = (frame - 1) / SWIM_FRAMES * math.tau
        for i, name in enumerate("tail_%d" % i for i in range(TAIL_BONES)):
            bone = rig.pose.bones[name]
            # 뿌리는 거의 안 움직이고 끝으로 갈수록 크게 흔들린다.
            amplitude = math.radians(6 + 20 * (i / (TAIL_BONES - 1)) ** 1.6)
            bone.rotation_mode = "XYZ"
            bone.rotation_euler = Euler((0, 0, math.sin(phase - i * 0.9) * amplitude))
            bone.keyframe_insert(data_path="rotation_euler", frame=frame)
    bpy.ops.object.mode_set(mode="OBJECT")

    action = rig.animation_data.action
    action.name = "swim"
    # 첫 프레임과 끝 프레임이 이어지도록 보간을 선형으로 둔다.
    for fcurve in action_fcurves(action):
        for kp in fcurve.keyframe_points:
            kp.interpolation = "LINEAR"


def action_fcurves(action):
    """블렌더 4.4부터 액션의 커브가 레이어/슬롯 아래로 옮겨졌다. 양쪽 모두 지원한다."""
    if hasattr(action, "fcurves"):
        return list(action.fcurves)
    curves = []
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                curves.extend(bag.fcurves)
    return curves


# ------------------------------- 그 밖의 에셋 ------------------------------- #


def build_cell():
    """백혈구: 울퉁불퉁한 구체에 어두운 핵."""
    reset_scene()
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.0)
    body = bpy.context.object
    body.name = "cell"
    jitter_vertices(body, 0.12, freq=2.0, seed=0.7)
    body.data.materials.append(material("cell_body", (0.93, 0.93, 0.99), roughness=0.5))
    shade_smooth(body)

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.45, location=(-0.15, 0, 0.1))
    nucleus = bpy.context.object
    nucleus.name = "nucleus"
    jitter_vertices(nucleus, 0.08, freq=3.0, seed=1.9)
    nucleus.data.materials.append(material("cell_nucleus", (0.46, 0.42, 0.72), roughness=0.6))
    shade_smooth(nucleus)
    export("cell")


def build_acid():
    """산성 방울: 한쪽이 뾰족한 물방울."""
    reset_scene()
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=14, radius=1.0)
    drop = bpy.context.object
    drop.name = "acid"
    for v in drop.data.vertices:
        t = max(0.0, v.co.z)
        v.co.x *= 1.0 - 0.35 * t
        v.co.y *= 1.0 - 0.35 * t
        v.co.z *= 1.0 + 0.45 * t
    drop.data.materials.append(
        material("acid", (0.53, 0.92, 0.36), emission=0.85, roughness=0.2, alpha=0.86)
    )
    shade_smooth(drop)
    export("acid")


def build_energy():
    """에너지: 각진 보석 모양이라 빛을 받으면 반짝인다."""
    reset_scene()
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.0)
    orb = bpy.context.object
    orb.name = "energy"
    orb.data.materials.append(
        material("energy", (1.0, 0.82, 0.3), emission=1.5, roughness=0.15)
    )
    export("energy")


def build_egg():
    """난자: 큰 구체 + 투명대 껍질 + 주변을 둘러싼 난구세포."""
    reset_scene()
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, radius=1.0)
    core = bpy.context.object
    core.name = "egg_core"
    core.data.materials.append(
        material("egg_core", (1.0, 0.88, 0.62), emission=0.9, roughness=0.3)
    )
    shade_smooth(core)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, radius=1.16)
    zona = bpy.context.object
    zona.name = "zona_pellucida"
    zona.data.materials.append(
        material("zona", (1.0, 0.95, 0.85), emission=0.4, roughness=0.1, alpha=0.32)
    )
    shade_smooth(zona)

    # 난구세포: 난자를 둘러싼 작은 세포들을 황금각으로 고르게 뿌린다.
    golden = math.pi * (3 - math.sqrt(5))
    count = 46
    for i in range(count):
        y = 1 - (i / (count - 1)) * 2
        radius = math.sqrt(max(0.0, 1 - y * y))
        theta = golden * i
        pos = Vector((math.cos(theta) * radius, y, math.sin(theta) * radius)) * 1.42
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.17, location=pos)
        corona = bpy.context.object
        corona.name = "corona_%d" % i
        corona.data.materials.append(
            material("corona_%d" % i, (0.99, 0.78, 0.55), emission=0.3, roughness=0.5)
        )
    export("egg")


def build_ring():
    """점액 벽: 가운데가 아니라 한쪽에 구멍이 뚫린 고리. 게임에서는 이 고리를 돌려
    구멍 위치를 바꾼다."""
    reset_scene()
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1.0, depth=0.16)
    plate = bpy.context.object
    plate.name = "ring"

    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32, radius=RING_HOLE_RADIUS, depth=0.5, location=(RING_HOLE_OFFSET, 0, 0)
    )
    hole = bpy.context.object

    bpy.context.view_layer.objects.active = plate
    mod = plate.modifiers.new("hole", type="BOOLEAN")
    mod.object = hole
    mod.operation = "DIFFERENCE"
    bpy.ops.object.modifier_apply(modifier="hole")
    bpy.data.objects.remove(hole, do_unlink=True)

    plate.data.materials.append(material("mucus", (1.0, 0.93, 0.78), roughness=0.35, alpha=0.9))
    export("ring")


def write_bundle():
    """모든 .glb를 base64로 묶어 하나의 JSON으로 만든다.

    .glb 확장자를 서빙하지 않는 정적 호스팅이 있어서, 게임은 이 번들 하나만 읽는다.
    요청도 여섯 번에서 한 번으로 준다.
    """
    import base64
    import json

    bundle = {}
    for name in ("sperm", "cell", "acid", "energy", "egg", "ring"):
        path = os.path.normpath(os.path.join(OUT_DIR, name + ".glb"))
        with open(path, "rb") as f:
            bundle[name] = base64.b64encode(f.read()).decode("ascii")
    out = os.path.normpath(os.path.join(OUT_DIR, "models.json"))
    with open(out, "w") as f:
        json.dump(bundle, f)
    print("wrote", out, os.path.getsize(out), "bytes")


def main():
    build_sperm()
    build_cell()
    build_acid()
    build_energy()
    build_egg()
    build_ring()
    write_bundle()
    print("done")


if __name__ == "__main__":
    main()
    sys.exit(0)
