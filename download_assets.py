import json
import urllib.request
import re
import os

with open(r'C:\Users\ADMIN\.gemini\antigravity-ide\brain\1c48e055-b3b0-4850-abe1-df8824019e5f\.system_generated\steps\15\output.txt', 'r', encoding='utf-8') as f:
    project_data = json.load(f)

design_md = project_data['projects'][0].get('designMd', '')
with open('docs/stitch-design-system.md', 'w', encoding='utf-8') as f:
    f.write(design_md)

with open(r'C:\Users\ADMIN\.gemini\antigravity-ide\brain\1c48e055-b3b0-4850-abe1-df8824019e5f\.system_generated\steps\27\output.txt', 'r', encoding='utf-8') as f:
    data = json.load(f)

image_urls = set()

for screen in data['screens']:
    if 'htmlCode' in screen and 'downloadUrl' in screen['htmlCode']:
        url = screen['htmlCode']['downloadUrl']
        print(f"Downloading HTML for {screen['name']}...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req) as response:
                html = response.read().decode('utf-8')
                with open(f"docs/{screen['name'].split('/')[-1]}.html", 'w', encoding='utf-8') as hf:
                    hf.write(html)
                images = re.findall(r'<img[^>]+src="([^">]+)"', html)
                for img in images:
                    if img.startswith('http'):
                        image_urls.add(img)
        except Exception as e:
            print(f"Error fetching HTML: {e}")

print(f"Downloading {len(image_urls)} images...")
for i, url in enumerate(image_urls):
    try:
        urllib.request.urlretrieve(url, f"src/assets/images/image_{i}.jpg")
    except Exception as e:
        print(f"Failed to download image {url}: {e}")

print("Assets downloaded.")
