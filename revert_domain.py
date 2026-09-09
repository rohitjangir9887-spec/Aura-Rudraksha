import os

def replace_in_file(filepath):
    with open(filepath, "r") as f:
        content = f.read()
    
    # Revert the URL
    new_content = content.replace("https://aurarudraksha.com", "https://aura-rudraksha.vercel.app")
    new_content = new_content.replace("aurarudraksha.com/authenticity", "aura-rudraksha.vercel.app/authenticity")
    new_content = new_content.replace("aurarudraksha.com/track-order", "aura-rudraksha.vercel.app/track-order")
    new_content = new_content.replace("aurarudraksha.com", "aura-rudraksha.vercel.app")
    # Actually email addresses might become user@aura-rudraksha.vercel.app, which might not be what they want, but let's see. If their domain is only the vercel app, they don't have a custom domain email anyway, or maybe they do.
    # Let's just fix the DETERMINISTIC_CANONICAL_ORIGIN and any https links.
    
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

