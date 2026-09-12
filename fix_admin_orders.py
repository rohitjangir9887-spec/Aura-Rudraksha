import re

with open("src/pages/admin/AdminOrders.jsx", "r") as f:
    content = f.read()

# find a place to insert the component
if 'import { OrderMessages }' not in content:
    content = content.replace('import { Shell }', 'import { OrderMessages } from "../../components/OrderMessages";\nimport { Shell }')

# find a place to render the component.
# Let's put it at the bottom of the Order Detail modal (dialog).
render_str = """                {selectedOrder.refundHistory && selectedOrder.refundHistory.length > 0 && ("""
if '<OrderMessages ' not in content:
    content = content.replace(render_str, """                <OrderMessages 
                  isAdmin={true}
                  orderId={selectedOrder.id || selectedOrder._id} 
                  messages={selectedOrder.messages || []} 
                  onMessageAdded={(msg) => {
                    setSelectedOrder(prev => ({...prev, messages: [...(prev.messages || []), msg]}));
                  }} 
                />\n\n                {selectedOrder.refundHistory && selectedOrder.refundHistory.length > 0 && (""")

with open("src/pages/admin/AdminOrders.jsx", "w") as f:
    f.write(content)

print("Successfully updated AdminOrders.jsx")
