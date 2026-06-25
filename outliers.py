import os, math, random
from PIL import Image
import colorsys

img_dir = "/Users/gcorrea/Desktop/myProgs/06-Apto_Suegros/img"
imgs = sorted([f for f in os.listdir(img_dir) if f.startswith("IMG_") and f.endswith(".jpg")])

def features(path):
    img = Image.open(path).convert("RGB").resize((60, 45))
    pixels = list(img.getdata())
    total = len(pixels)
    white = sum(1 for r,g,b in pixels if r > 210 and g > 210 and b > 210) / total
    beige = sum(1 for r,g,b in pixels if 160<r<220 and 130<g<190 and 90<b<170) / total
    gray = sum(1 for r,g,b in pixels if 100<r<180 and 100<g<180 and 100<b<180) / total
    dark = sum(1 for r,g,b in pixels if r<60 and g<60 and b<60) / total
    green = sum(1 for r,g,b in pixels if r<120 and g>100 and b<g*0.8 and g>r*1.2) / total
    brown = sum(1 for r,g,b in pixels if r>100 and g<r*0.8 and b<g*0.9 and r<180) / total
    blue = sum(1 for r,g,b in pixels if b>g*1.2 and b>r*1.1 and b>100) / total
    hsv = [colorsys.rgb_to_hsv(r/255, g/255, b/255) for r,g,b in pixels]
    avg_h = sum(h for h,s,v in hsv) / total
    avg_s = sum(s for h,s,v in hsv) / total
    avg_v = sum(v for h,s,v in hsv) / total
    w, h = 60, 45
    top = list(img.crop((0, 0, w, h//3)).getdata())
    bot = list(img.crop((0, 2*h//3, w, h)).getdata())
    avg_top = sum((r+g+b)/3 for r,g,b in top) / len(top)
    avg_bot = sum((r+g+b)/3 for r,g,b in bot) / len(bot)
    return [white*100, beige*100, gray*100, dark*100, green*100, brown*100, blue*100, avg_h*100, avg_s*100, avg_v*100, avg_top, avg_bot]

data = []
file_names = []
for f in imgs:
    feat = features(os.path.join(img_dir, f))
    data.append(feat)
    file_names.append(f)

# Find photos with unusual features - high green, blue, or unusual hue
print("=== PHOTOS WITH UNUSUAL FEATURES (possible laundry/green/blue) ===")
print(f"{'FILE':50s} {'wh%':>4s} {'grn':>4s} {'brn':>4s} {'blu':>4s} {'hue':>5s} {'sat':>4s} {'top':>4s} {'bot':>4s}")
print("-"*85)
for i, f in enumerate(file_names):
    d = data[i]
    if d[4] > 2 or d[6] > 3 or d[0] > 25 or d[7] > 55 or d[7] < 3:
        ts = f.split("_")[2].split(".")[0]
        h, m = ts[:2], ts[2:4]
        print(f"{f:50s} {d[0]:4.0f} {d[4]:4.1f} {d[5]:4.1f} {d[6]:4.1f} {d[7]:5.1f} {d[8]:4.2f} {d[10]:4.0f} {d[11]:4.0f}")

# Also check for photos with unusual saturation/hue patterns  
print("\n=== ALL PHOTOS SORTED BY HUE ===")
sorted_by_hue = sorted([(data[i][7], file_names[i], data[i]) for i in range(len(file_names))])
for hue, fname, d in sorted_by_hue:
    ts = fname.split("_")[2].split(".")[0]
    hhh, mmm = ts[:2], ts[2:4]
    print(f"hue={hue:5.1f} sat={d[8]:.2f} val={d[9]:4.0f}  wh={d[0]:4.0f}% grn={d[4]:4.1f}% brn={d[5]:4.1f}% blu={d[6]:4.1f}%  {fname}")
