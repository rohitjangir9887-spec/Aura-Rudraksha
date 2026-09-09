with open("server/controllers/orderController.js", "r") as f:
    lines = f.readlines()

# The actual start of the good code is line 154 (0-indexed 153)
# But let's find it dynamically: it's the line AFTER `    }t.js";`
start_idx = -1
for i, line in enumerate(lines):
    if 't.js";' in line and i > 5:
        start_idx = i + 1
        break

if start_idx == -1:
    print("Could not find second t.js")
    exit(1)

rest_lines = lines[start_idx:]
rest = "".join(rest_lines)
rest = rest.lstrip()

final_content = 'import { Order } from "../models/Order.js";\nimport { Product } from "../models/Product.js";\n' + rest

with open("server/controllers/orderController.js", "w") as f:
    f.write(final_content)

print("Repaired for real REAL!")
