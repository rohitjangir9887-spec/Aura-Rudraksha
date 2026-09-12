with open("server/controllers/orderController.js", "r") as f:
    content = f.read()

idx = content.find('t.js";')
if idx == -1:
    print("Could not find t.js")
    exit(1)

rest = content[idx + len('t.js";'):]

# Ensure we remove any leading whitespace/newlines from rest
rest = rest.lstrip()

final_content = 'import { Order } from "../models/Order.js";\nimport { Product } from "../models/Product.js";\n' + rest

with open("server/controllers/orderController.js", "w") as f:
    f.write(final_content)

print("Repaired for real!")
