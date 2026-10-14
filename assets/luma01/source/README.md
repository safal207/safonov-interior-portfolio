# LUMA 01 — procedural product study

Educational chair concept created with code and AI assistance for the Safonov Interiors portfolio. No client or commercial results are claimed. The construction is not engineering-validated or manufacturing-ready. This case does not by itself demonstrate independent proficiency in Blender, 3ds Max or Corona.

## Files

- `scene.json`: common geometry parameters in metres, Z up. Sixteen named parts.
- `export_model.py`: rounded-box and tapered-cylinder mesh generator; exports OBJ/MTL and self-contained GLB.
- `LUMA01.glb`: geometry and basic PBR material colours; Y up as required by glTF.
- `geometry_validation.json`: recorded numerical mesh/export checks.
- `render.cpp`: deterministic CPU signed-distance renderer with procedural shading, ambient occlusion and approximate soft shadows.
- `build_media.py`: maps the scene parameters to the renderer, renders four views and a 144-frame camera orbit, then encodes MP4 with FFmpeg.
- `requirements.txt`: Python library versions used for this build.

The OBJ and GLB exports have basic material colours. The procedural wood/fabric shading in the rendered images is defined in `render.cpp`; it is not baked into image textures. No UV-unwrapping, baked PBR maps, upholstery seams, rigging, physical simulation or manufactured specimen is claimed.

## Reproduce

Requires Python 3, a C++ compiler with OpenMP, FFmpeg, NumPy and Pillow. Run from the repository root in a disposable output directory:

```bash
mkdir -p output/luma01
cp -R assets/luma01/source/. output/luma01/
cd output/luma01
python3 -m pip install -r requirements.txt
python3 export_model.py
python3 build_media.py --stills --animation
```

Outputs: `hero`, `front`, `profile` and `rear` PNG/WebP images (1200 × 1500), `LUMA01_turntable.mp4` (720 × 900, 24 fps, six seconds, no audio), `LUMA01.glb`, `LUMA01.obj` and `LUMA01.mtl`.

Mesh validation checks finite coordinates, unit normals, triangle winding, nondegenerate faces, GLB buffer bounds and independently decoded coordinate bounds. These checks do not establish construction safety or ergonomic suitability.

Renderer notes: signed-distance surfaces and their tessellated mesh exports share the same shape parameters. The GLB/OBJ are an approximation of those surfaces. Meshes use smooth normals; the renderer computes normals from the distance field. The cylinder distance and soft-shadow model are approximations, rather than a physically based path tracer.
