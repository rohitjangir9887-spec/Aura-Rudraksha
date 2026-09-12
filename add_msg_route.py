import re

with open("server/routes/orders.js", "r") as f:
    content = f.read()

start_str = """router.route("/:id")
  .get(optionalAuth, getOrderById)
  .put(requireAuth, updateOrder);"""
end_str = start_str

start_idx = content.find(start_str)
end_idx = content.find(end_str) + len(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find block!")
    exit(1)

new_block = """router.route("/:id")
  .get(optionalAuth, getOrderById)
  .put(requireAuth, updateOrder);

import { addOrderMessage } from "../controllers/orderController.js";
router.post("/:id/message", requireAuth, addOrderMessage);"""

with open("server/routes/orders.js", "w") as f:
    f.write(content[:start_idx] + new_block + content[end_idx:])

print("Successfully updated orders.js")
