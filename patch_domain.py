import os
import glob

def replace_in_file(filepath):
    with open(filepath, "r") as f:
        content = f.read()
    
    new_content = content.replace("https://aura-rudraksha.vercel.app", "https://aurarudraksha.com")
    new_content = new_content.replace("aura-rudraksha.vercel.app", "aurarudraksha.com")
    
    if new_content != content:
        with open(filepath, "w") as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk("server"):
    for file in files:
        if file.endswith(".js"):
            replace_in_file(os.path.join(root, file))

for root, _, files in os.walk("src"):
    for file in files:
        if file.endswith((".js", ".jsx", ".ts", ".tsx")):
            replace_in_file(os.path.join(root, file))

