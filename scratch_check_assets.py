import json
import urllib.request
import re
import os

with open(r'C:\Users\ADMIN\.gemini\antigravity-ide\brain\1c48e055-b3b0-4850-abe1-df8824019e5f\.system_generated\steps\27\output.txt', 'r', encoding='utf-8') as f:
    data = json.load(f)

for screen in data['screens']:
    if 'htmlCode' in screen and 'downloadUrl' in screen['htmlCode']:
        url = screen['htmlCode']['downloadUrl']
        print(f"Downloading {screen['name']} ({screen.get('title', '')})...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req) as response:
                html = response.read().decode('utf-8')
                images = re.findall(r'<img[^>]+src="([^">]+)"', html)
                if images:
                    print(f"  Images found: {len(images)}")
                    for img in set(images):
                        print(f"    - {img}")
        except Exception as e:
            print(f"  Error: {e}")
