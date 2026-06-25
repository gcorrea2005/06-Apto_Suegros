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
    warm = sum(1 for r,g,b in pixels if r>150 and g<r*0.85 and b<g*0.9) / total
    hsv = [colorsys.rgb_to_hsv(r/255, g/255, b/255) for r,g,b in pixels]
    avg_h = sum(h for h,s,v in hsv) / total
    avg_s = sum(s for h,s,v in hsv) / total
    avg_v = sum(v for h,s,v in hsv) / total
    w, h = 60, 45
    top = list(img.crop((0, 0, w, h//3)).getdata())
    bot = list(img.crop((0, 2*h//3, w, h)).getdata())
    avg_top = sum((r+g+b)/3 for r,g,b in top) / len(top)
    avg_bot = sum((r+g+b)/3 for r,g,b in bot) / len(bot)
    return [white*100, beige*100, gray*100, dark*100, cream*100, warm*100, avg_h*100, avg_s*100, avg_v*100, avg_top, avg_bot]

data = []
file_names = []
for f in imgs:
    feat = features(os.path.join(img_dir, f))
    data.append(feat)
    file_names.append(f)

k = 3
n = len(data)
dims = len(data[0])

# K-means++
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

for iteration in range(50):
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

# Sort cluster labels by average timestamp for consistent ordering
cluster_times = []
for c in range(k):
    cluster_files = [(file_names[i], data[i]) for i in range(n) if labels[i] == c]
    timestamps = [int(f[0].split("_")[2].split(".")[0]) for f in cluster_files]
    avg_ts = sum(timestamps) / len(timestamps) if timestamps else 0
    cluster_times.append((avg_ts, c, cluster_files))

cluster_times.sort(key=lambda x: x[0])

for idx, (avg_ts, c, cluster_files) in enumerate(cluster_times, 1):
    cluster_files.sort(key=lambda x: x[0])
    
    # Determine dominant color characteristic
    avg_feat = [sum(f[j] for _, f in cluster_files) / len(cluster_files) for j in range(dims)]
    desc_parts = []
    if avg_feat[2] > 60: desc_parts.append("gris")
    if avg_feat[1] > 20: desc_parts.append("beige")
    if avg_feat[3] > 15: desc_parts.append("oscuro")
    if avg_feat[5] > 3: desc_parts.append("cálido")
    if avg_feat[0] > 10: desc_parts.append("blanco")
    desc = ", ".join(desc_parts) if desc_parts else "mixto"
    
    print(f"\n=== BAÑO {idx} (predominio: {desc}) -- {len(cluster_files)} fotos ===")
    for fname, feat in cluster_files:
        ts = fname.split("_")[2].split(".")[0]
        h, m = ts[:2], ts[2:4]
        print(f"  {fname}")

print("\n\n--- LIST BY BATHROOM FOR LaTeX ---")
for idx, (avg_ts, c, cluster_files) in enumerate(cluster_times, 1):
    cluster_files.sort(key=lambda x: x[0])
    names = [f[0] for f in cluster_files]
    print(f"\n# Baño {idx}:")
    for n in names:
        print(f'  "{n}",')
