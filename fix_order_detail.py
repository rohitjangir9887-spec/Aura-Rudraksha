import re

with open("src/pages/account/OrderDetail.jsx", "r") as f:
    content = f.read()

# find a place to insert the component
if 'import { OrderMessages }' not in content:
    content = content.replace('import { Shell }', 'import { OrderMessages } from "../../components/OrderMessages";\nimport { Shell }')

# find a place to render the component. Maybe before "Need help?" section?
render_str = """      <div className="order-help-section">"""
if '<OrderMessages ' not in content:
    content = content.replace(render_str, """      <OrderMessages 
        orderId={order.id} 
        messages={order.messages || []} 
        onMessageAdded={(msg) => {
          setOrder(prev => ({...prev, messages: [...(prev.messages || []), msg]}));
        }} 
      />\n\n      <div className="order-help-section">""")

with open("src/pages/account/OrderDetail.jsx", "w") as f:
    f.write(content)

print("Successfully updated OrderDetail.jsx")
