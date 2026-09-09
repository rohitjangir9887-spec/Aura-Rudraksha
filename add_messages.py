import re

with open("server/models/Order.js", "r") as f:
    content = f.read()

start_str = """    refundHistory: { type: Array, default: [] },"""
end_str = start_str

start_idx = content.find(start_str)
end_idx = content.find(end_str) + len(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find block!")
    exit(1)

new_block = """    refundHistory: { type: Array, default: [] },
    messages: { type: Array, default: [] },"""

with open("server/models/Order.js", "w") as f:
    f.write(content[:start_idx] + new_block + content[end_idx:])

print("Successfully updated Order.js")
