"""Reproduce LUMA 01 stills and turntable from the same scene.json as mesh exports."""
import argparse
import json
import math
import os
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent

def prepare_scene():
    scene = json.loads((ROOT / 'scene.json').read_text())
    rows = []
    for obj in scene['objects']:
        mat = 1 if obj['material'] == 'warm_walnut' else 2
        if obj['type'] == 'rounded_box':
            values = [0, mat, *obj['center'], *obj['half_sizes'], obj['radius'], obj['rotation_x']]
        else:
            values = [1, mat, *obj['bottom'], *obj['top'], obj['radius_bottom'], obj['radius_top']]
        rows.append(' '.join(map(str, values)))
    (ROOT / 'scene.txt').write_text('\n'.join(rows)+'\n')

def render(name, w, h, angle, elev=17, distance=2.1, aa=1):
    ppm = ROOT / (name+'.ppm')
    subprocess.run([str(ROOT/'render'),str(ROOT/'scene.txt'),str(ppm),str(w),str(h),str(angle),str(elev),str(distance),str(aa)],check=True,env={**os.environ,'OMP_NUM_THREADS':'8'},stdout=subprocess.DEVNULL)
    with Image.open(ppm) as image:
        image.save(ROOT/(name+'.png'))
        image.save(ROOT/(name+'.webp'),quality=92)
    ppm.unlink()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--preview',action='store_true');parser.add_argument('--stills',action='store_true');parser.add_argument('--animation',action='store_true');args=parser.parse_args()
    prepare_scene()
    subprocess.run(['g++','-O3','-fopenmp','-o',str(ROOT/'render'),str(ROOT/'render.cpp')],check=True)
    if args.preview:
        render('preview',640,800,-55,21,2.55)
    if args.stills:
        for name,angle,elev,d in [('hero',-55,21,2.55),('front',-90,16,2.48),('rear',60,21,2.55),('profile',0,18,2.48)]:
            render(name,1200,1500,angle,elev,d,2)
            print('still',name,flush=True)
    if args.animation:
        frames=ROOT/'frames';frames.mkdir(exist_ok=True)
        for i in range(144):
            # A continuous six-second orbit, including the matching loop endpoint.
            angle=-55+360*i/144
            ppm=frames/f'{i:04d}.ppm'
            subprocess.run([str(ROOT/'render'),str(ROOT/'scene.txt'),str(ppm),'720','900',str(angle),'21','2.65','1'],check=True,env={**os.environ,'OMP_NUM_THREADS':'8'},stdout=subprocess.DEVNULL)
            if i%24==0:print('frame',i,flush=True)
        subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','24','-i',str(frames/'%04d.ppm'),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(ROOT/'LUMA01_turntable.mp4')],check=True)
        # Include a compact contact sheet for direct visual verification.
        thumbs=[]
        for i in [0,24,48,72,96,120]:
            im=Image.open(frames/f'{i:04d}.ppm').resize((240,300))
            thumbs.append(im.copy())
        sheet=Image.new('RGB',(720,600),'#eee7db')
        for i,im in enumerate(thumbs):sheet.paste(im,((i%3)*240,(i//3)*300))
        sheet.save(ROOT/'animation_contact_sheet.jpg',quality=92)
        for f in frames.iterdir():f.unlink()
        frames.rmdir()

if __name__=='__main__':main()
