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
    cream = sum(1 for r,g,b in pixels if 190<r<235 and 170<g<210 and 130<b<190) / total
    green = sum(1 for r,g,b in pixels if r<120 and g>100 and b<g*0.8 and g>r*1.2) / total
    brown = sum(1 for r,g,b in pixels if r>100 and g<r*0.8 and b<g*0.9 and r<180) / total
    hsv = [colorsys.rgb_to_hsv(r/255, g/255, b/255) for r,g,b in pixels]
    avg_h = sum(h for h,s,v in hsv) / total
    avg_s = sum(s for h,s,v in hsv) / total
    avg_v = sum(v for h,s,v in hsv) / total
    w, h = 60, 45
    top = list(img.crop((0, 0, w, h//3)).getdata())
    bot = list(img.crop((0, 2*h//3, w, h)).getdata())
    avg_top = sum((r+g+b)/3 for r,g,b in top) / len(top)
    avg_bot = sum((r+g+b)/3 for r,g,b in bot) / len(bot)
    return [white*100, beige*100, gray*100, dark*100, cream*100, green*100, brown*100, avg_h*100, avg_s*100, avg_v*100, avg_top, avg_bot]

data = []
file_names = []
for f in imgs:
    feat = features(os.path.join(img_dir, f))
    data.append(feat)
    file_names.append(f)

# K-means with k=4 (3 bathrooms + 1 laundry)
k = 4
n = len(data)
dims = len(data[0])

centroids = [data[0]]
for _ in range(1, k):
    dists = []
    for point in data:
        min_d = min(sum((point[j]-c[j])**2 for j in range(dims)) for c in centroids)
        dists.append(min_d)
    total = sum(dists)
    r = random.random() * total
    cum = 0
    for i, d in enumerate(dists):
        cum += d
        if cum >= r:
            centroids.append(data[i])
            break

for iteration in range(100):
    clusters = [[] for _ in range(k)]
    labels = []
    for point in data:
        dists = [sum((point[j]-centroids[c][j])**2 for j in range(dims)) for c in range(k)]
        label = dists.index(min(dists))
        labels.append(label)
        clusters[label].append(point)
    moved = False
    for c in range(k):
        if clusters[c]:
            new_c = [sum(p[j] for p in clusters[c]) / len(clusters[c]) for j in range(dims)]
            if sum((new_c[j]-centroids[c][j])**2 for j in range(dims)) > 0.001:
                moved = True
            centroids[c] = new_c
    if not moved:
        break

# Print all clusters with avg features to identify laundry
print("=" * 80)
for c in range(k):
    cfiles = [file_names[i] for i in range(n) if labels[i] == c]
    avg = [sum(data[i][j] for i in range(n) if labels[i] == c) / len(cfiles) for j in range(dims)]
    
    # Describe the cluster
    desc = []
    if avg[0] > 15: desc.append(f"blanco({avg[0]:.0f}%)")
    if avg[1] > 20: desc.append(f"beige({avg[1]:.0f}%)")
    if avg[2] > 60: desc.append(f"gris({avg[2]:.0f}%)")
    if avg[3] > 15: desc.append(f"oscuro({avg[3]:.0f}%)")
    if avg[4] > 10: desc.append(f"crema({avg[4]:.0f}%)")
    if avg[5] > 2: desc.append(f"verde({avg[5]:.0f}%)")
    if avg[6] > 2: desc.append(f"marrón({avg[6]:.0f}%)")
    
    print(f"\nCLUSTER {c+1} ({len(cfiles)} fotos) -- {' | '.join(desc)}")
    print(f"  Timestamps: {cfiles[0][:28]}... -> {cfiles[-1][:28]}")
    for f in sorted(cfiles):
        ts = f.split("_")[2].split(".")[0]
        h, m = ts[:2], ts[2:4]
        # get green% for this specific file
        gi = [i for i in range(n) if file_names[i] == f][0]
        grn = data[gi][5]
        brn = data[gi][6]
        wh = data[gi][0]
        extra = ""
        if grn > 3: extra = f" [VERDE:{grn:.0f}%]"
        if brn > 3: extra = f" [MARR:{brn:.0f}%]"
        if wh > 25: extra = f" [BLANCO:{wh:.0f}%]"
        print(f"    {f}  {h}:{m}{extra}")
