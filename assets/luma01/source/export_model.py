#!/usr/bin/env python3
"""Build the original LUMA01 chair geometry using only Python and NumPy.

OBJ uses metres and Z-up; GLB uses metres and glTF's Y-up convention.
Run: python export_model.py --out .
"""
from __future__ import annotations

import argparse
import json
import math
import struct
from pathlib import Path

import numpy as np


MATERIALS = {
    "ivory_boucle": {"rgb": [0.73, 0.67, 0.55], "roughness": 0.93},
    "warm_walnut": {"rgb": [0.25, 0.12, 0.055], "roughness": 0.43},
}


def specifications():
    objects = [
        dict(name="seat_cushion", type="rounded_box", center=[0, 0, .44],
             half_sizes=[.30, .29, .075], radius=.055, rotation_x=0,
             material="ivory_boucle"),
        dict(name="back_cushion", type="rounded_box", center=[0, .245, .725],
             half_sizes=[.30, .065, .225], radius=.055, rotation_x=-.10,
             material="ivory_boucle"),
    ]
    for label, sign in (("left", -1), ("right", 1)):
        objects.append(dict(name=f"arm_{label}", type="rounded_box",
                            center=[sign * .355, 0, .655],
                            half_sizes=[.035, .35, .028], radius=.025,
                            rotation_x=0, material="warm_walnut"))
        objects.append(dict(name=f"side_rail_{label}", type="rounded_box",
                            center=[sign * .27, 0, .355],
                            half_sizes=[.025, .30, .035], radius=.012,
                            rotation_x=0, material="warm_walnut"))
        for depth, sy in (("front", -1), ("rear", 1)):
            objects.append(dict(name=f"arm_post_{label}_{depth}", type="rounded_box",
                                center=[sign * .335, sy * .24, .51],
                                half_sizes=[.022, .022, .13], radius=.012,
                                rotation_x=0, material="warm_walnut"))
            objects.append(dict(name=f"leg_{label}_{depth}", type="tapered_cylinder",
                                top=[sign * .27, sy * .23, .40],
                                bottom=[sign * .34, sy * .31, .0052],
                                radius_top=.025, radius_bottom=.018,
                                segments=24, material="warm_walnut"))
    for depth, sign in (("front", -1), ("rear", 1)):
        objects.append(dict(name=f"cross_rail_{depth}", type="rounded_box",
                            center=[0, sign * .255, .355],
                            half_sizes=[.345, .022, .035], radius=.012,
                            rotation_x=0, material="warm_walnut"))
    return objects


def rounded_box(spec, subdivisions=24):
    """Six subdivided cube faces projected onto core-box + radius surface.

    Vertices on separate faces intentionally have independent indices but matching
    positions and smooth analytic normals; faces also retain planar normals.
    """
    half = np.array(spec["half_sizes"], dtype=float)
    radius = float(spec["radius"])
    core = half - radius
    vertices, normals, faces = [], [], []
    for fixed_axis in range(3):
        varying = [a for a in range(3) if a != fixed_axis]
        j, k = varying
        # Add exact flat/round transition locations to the uniform subdivision.
        u_values = np.unique(np.r_[np.linspace(-half[j], half[j], subdivisions + 1), -core[j], core[j]])
        v_values = np.unique(np.r_[np.linspace(-half[k], half[k], subdivisions + 1), -core[k], core[k]])
        for sign in (-1, 1):
            offset = len(vertices)
            for u in u_values:
                for v in v_values:
                    cube = np.zeros(3)
                    cube[fixed_axis] = sign * half[fixed_axis]
                    cube[j], cube[k] = u, v
                    nearest = np.clip(cube, -core, core)
                    excess = cube - nearest
                    normal = excess / np.linalg.norm(excess)
                    vertices.append(nearest + radius * normal)
                    normals.append(normal)
            n_v = len(v_values)
            tangent_u, tangent_v = np.eye(3)[j], np.eye(3)[k]
            flip = np.cross(tangent_u, tangent_v)[fixed_axis] != sign
            for ui in range(len(u_values) - 1):
                for vi in range(n_v - 1):
                    a = offset + ui * n_v + vi
                    b, d, c = a + n_v, a + 1, a + n_v + 1
                    triangles = [(a, b, c), (a, c, d)]
                    faces.extend([(x, z, y) if flip else (x, y, z) for x, y, z in triangles])
    angle = spec.get("rotation_x", 0)
    ca, sa = math.cos(angle), math.sin(angle)
    rotation = np.array([[1, 0, 0], [0, ca, -sa], [0, sa, ca]])
    vertices = np.array(vertices) @ rotation.T + np.array(spec["center"])
    normals = np.array(normals) @ rotation.T
    return vertices, normals, np.array(faces, dtype=np.uint32)


def tapered_cylinder(spec):
    bottom, top = np.array(spec["bottom"]), np.array(spec["top"])
    axis = top - bottom
    length = np.linalg.norm(axis)
    axis /= length
    reference = np.array([1., 0, 0]) if abs(axis[0]) < .9 else np.array([0., 1, 0])
    u = np.cross(reference, axis)
    u /= np.linalg.norm(u)
    v = np.cross(axis, u)
    segments = spec["segments"]
    r0, r1 = spec["radius_bottom"], spec["radius_top"]
    vertices, normals, faces = [], [], []
    for center, radius in ((bottom, r0), (top, r1)):
        for i in range(segments):
            angle = 2 * math.pi * i / segments
            radial = math.cos(angle) * u + math.sin(angle) * v
            normal = radial + axis * ((r0 - r1) / length)
            normal /= np.linalg.norm(normal)
            vertices.append(center + radius * radial)
            normals.append(normal)
    for i in range(segments):
        j = (i + 1) % segments
        faces.extend(((i, j, j + segments), (i, j + segments, i + segments)))
    for center, radius, normal, is_top in ((bottom, r0, -axis, False), (top, r1, axis, True)):
        base = len(vertices)
        vertices.append(center)
        normals.append(normal)
        for i in range(segments):
            angle = 2 * math.pi * i / segments
            vertices.append(center + radius * (math.cos(angle) * u + math.sin(angle) * v))
            normals.append(normal)
        for i in range(segments):
            a, b = base + 1 + i, base + 1 + (i + 1) % segments
            faces.append((base, a, b) if is_top else (base, b, a))
    return np.array(vertices), np.array(normals), np.array(faces, dtype=np.uint32)


def write_obj(meshes, out):
    mtl = ["# Original LUMA01 chair; RGB values are linear appearance controls."]
    for name, material in MATERIALS.items():
        rgb = material["rgb"]
        mtl.extend((f"newmtl {name}", "Ka 0.02 0.02 0.02", "Kd " + " ".join(map(str, rgb)),
                    "Ks 0.06 0.06 0.06", f"Ns {8 if 'boucle' in name else 45}", "d 1", "illum 2", ""))
    (out / "LUMA01.mtl").write_text("\n".join(mtl), encoding="utf-8")
    lines = ["# LUMA01 original concept; metres; Z-up; front = -Y", "mtllib LUMA01.mtl"]
    offset = 1
    for spec, vertices, normals, triangles in meshes:
        lines.extend((f"o {spec['name']}", f"usemtl {spec['material']}"))
        lines.extend("v %.8f %.8f %.8f" % tuple(p) for p in vertices)
        lines.extend("vn %.8f %.8f %.8f" % tuple(n) for n in normals)
        lines.extend("f " + " ".join(f"{int(i)+offset}//{int(i)+offset}" for i in tri) for tri in triangles)
        offset += len(vertices)
    (out / "LUMA01.obj").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_glb(meshes, out):
    buffer = bytearray()
    views, accessors, gltf_meshes, nodes = [], [], [], []
    material_ids = {name: i for i, name in enumerate(MATERIALS)}

    def add_array(array, target, component_type, accessor_type, include_bounds=False):
        while len(buffer) % 4:
            buffer.append(0)
        position = len(buffer)
        data = array.tobytes(order="C")
        buffer.extend(data)
        views.append(dict(buffer=0, byteOffset=position, byteLength=len(data), target=target))
        accessor = dict(bufferView=len(views) - 1, componentType=component_type,
                        count=len(array), type=accessor_type)
        if include_bounds:
            accessor.update(min=array.min(axis=0).astype(float).tolist(),
                            max=array.max(axis=0).astype(float).tolist())
        accessors.append(accessor)
        return len(accessors) - 1

    # Rigid orientation-preserving transform: native (x,y,z) -> glTF (x,z,-y).
    transform = np.array([[1., 0, 0], [0, 0, 1], [0, -1, 0]])
    for mesh_index, (spec, vertices, normals, triangles) in enumerate(meshes):
        vp = (vertices @ transform.T).astype("<f4")
        vn = (normals @ transform.T).astype("<f4")
        ix = triangles.astype("<u4").reshape(-1)
        pos_id = add_array(vp, 34962, 5126, "VEC3", True)
        normal_id = add_array(vn, 34962, 5126, "VEC3")
        index_id = add_array(ix, 34963, 5125, "SCALAR")
        gltf_meshes.append(dict(name=spec["name"], primitives=[dict(
            attributes={"POSITION": pos_id, "NORMAL": normal_id}, indices=index_id,
            material=material_ids[spec["material"]], mode=4)]))
        nodes.append(dict(name=spec["name"], mesh=mesh_index))
    gltf = dict(asset=dict(version="2.0", generator="LUMA01 stdlib+NumPy exporter",
                           copyright="Original educational furniture concept, 2026"),
                scene=0, scenes=[dict(name="LUMA01", nodes=list(range(len(nodes))))],
                nodes=nodes, meshes=gltf_meshes,
                materials=[dict(name=name, pbrMetallicRoughness=dict(
                    baseColorFactor=material["rgb"] + [1], metallicFactor=0,
                    roughnessFactor=material["roughness"]), doubleSided=False)
                    for name, material in MATERIALS.items()],
                buffers=[dict(byteLength=len(buffer))], bufferViews=views, accessors=accessors,
                extras=dict(units="metres", upAxis="Y", frontAxis="+Z",
                            nativeToGltf="(x,y,z) -> (x,z,-y)"))
    json_bytes = json.dumps(gltf, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    json_bytes += b" " * ((-len(json_bytes)) % 4)
    buffer += b"\x00" * ((-len(buffer)) % 4)
    total_length = 12 + 8 + len(json_bytes) + 8 + len(buffer)
    with (out / "LUMA01.glb").open("wb") as file:
        file.write(struct.pack("<III", 0x46546C67, 2, total_length))
        file.write(struct.pack("<II", len(json_bytes), 0x4E4F534A))
        file.write(json_bytes)
        file.write(struct.pack("<II", len(buffer), 0x004E4942))
        file.write(buffer)


def validate(meshes, glb_path):
    vertex_count = triangle_count = 0
    bounds = []
    for spec, vertices, normals, triangles in meshes:
        assert np.isfinite(vertices).all() and np.isfinite(normals).all()
        assert np.allclose(np.linalg.norm(normals, axis=1), 1, atol=1e-6)
        assert triangles.min() >= 0 and triangles.max() < len(vertices)
        corners = vertices[triangles]
        cross = np.cross(corners[:, 1] - corners[:, 0], corners[:, 2] - corners[:, 0])
        area2 = np.linalg.norm(cross, axis=1)
        assert (area2 > 1e-12).all(), f"Degenerate triangle: {spec['name']}"
        face_normal = normals[triangles].sum(axis=1)
        assert (np.sum(cross * face_normal, axis=1) > 0).all(), f"Winding: {spec['name']}"
        vertex_count += len(vertices)
        triangle_count += len(triangles)
        bounds.extend((vertices.min(axis=0), vertices.max(axis=0)))
    data = glb_path.read_bytes()
    magic, version, length = struct.unpack_from("<III", data)
    assert (magic, version, length) == (0x46546C67, 2, len(data))
    json_length, json_type = struct.unpack_from("<II", data, 12)
    assert json_type == 0x4E4F534A
    gltf = json.loads(data[20:20 + json_length])
    binary_length, binary_type = struct.unpack_from("<II", data, 20 + json_length)
    assert binary_type == 0x004E4942
    assert binary_length + 28 + json_length == length
    assert len(gltf["nodes"]) == len(meshes)
    assert gltf["buffers"][0]["byteLength"] <= binary_length
    for view in gltf["bufferViews"]:
        assert view["byteOffset"] % 4 == 0
        assert view["byteOffset"] + view["byteLength"] <= binary_length
    # Independent binary accessor readback verifies every native vertex survives
    # both the coordinate transform and the little-endian GLB serialization.
    bin_start = 28 + json_length
    inverse = np.array([[1., 0, 0], [0, 0, -1], [0, 1, 0]])
    for mesh_index, (_, vertices, normals, triangles) in enumerate(meshes):
        prim = gltf["meshes"][mesh_index]["primitives"][0]
        acc = gltf["accessors"][prim["attributes"]["POSITION"]]
        view = gltf["bufferViews"][acc["bufferView"]]
        loaded = np.frombuffer(data, dtype="<f4", count=acc["count"] * 3,
                               offset=bin_start + view["byteOffset"]).reshape(-1, 3)
        assert np.allclose(loaded @ inverse.T, vertices, atol=1e-7)
    all_bounds = np.array(bounds)
    return dict(status="passed", objects=len(meshes), vertices=vertex_count,
                triangles=triangle_count, native_bounds_m=dict(
                    min=all_bounds.min(axis=0).tolist(), max=all_bounds.max(axis=0).tolist()),
                checks=["finite vertices", "unit normals", "indices in bounds",
                        "nondegenerate triangles", "outward triangle winding",
                        "GLB header and chunks", "aligned buffer views",
                        "GLB accessor readback and coordinate transform"])


def main():
    global MATERIALS
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument("--scene", type=Path, help="Input scene JSON; defaults to adjacent scene.json when present")
    parser.add_argument("--subdivisions", type=int, default=24)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    scene_path = args.scene or Path(__file__).resolve().parent / "scene.json"
    if args.scene and not scene_path.is_file():
        parser.error("--scene must name an existing scene JSON file")
    scene = dict(name="LUMA01", version=1, units="metres",
                 coordinates=dict(x="width; positive right", y="depth; negative front", z="up"),
                 materials=MATERIALS, objects=specifications(),
                 geometry_notes=["Rounded boxes: SDF box with core half_sizes-radius, then radius offset",
                                 "Box rotation_x in radians around the specified center",
                                 "Tapered legs have flat caps perpendicular to their centerline"],
                 educational_concept=True, manufacturing_ready=False)
    if scene_path.is_file():
        scene = json.loads(scene_path.read_text(encoding="utf-8"))
        if scene.get("units") != "metres":
            parser.error("Scene units must be metres")
    specs = scene["objects"]
    MATERIALS = scene["materials"]
    (args.out / "scene.json").write_text(json.dumps(scene, indent=2) + "\n", encoding="utf-8")
    meshes = [(s, *(rounded_box(s, args.subdivisions) if s["type"] == "rounded_box"
                    else tapered_cylinder(s))) for s in specs]
    write_obj(meshes, args.out)
    write_glb(meshes, args.out)
    report = validate(meshes, args.out / "LUMA01.glb")
    (args.out / "geometry_validation.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
