import re

with open("index.html", "r") as f:
    html = f.read()

# Remove all hardcoded OG and Twitter tags from index.html
html = re.sub(r'\s*<meta property="og:[^>]+>\n?', '', html)
html = re.sub(r'\s*<meta name="twitter:[^>]+>\n?', '', html)
html = re.sub(r'\s*<meta name="description"[^>]+>\n?', '', html)
html = re.sub(r'\s*<link rel="canonical"[^>]+>\n?', '', html)

with open("index.html", "w") as f:
    f.write(html)
