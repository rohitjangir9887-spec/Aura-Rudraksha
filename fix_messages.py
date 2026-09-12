import re

with open("src/components/OrderMessages.jsx", "r") as f:
    content = f.read()

content = content.replace("import { useAuth } from '../context/AuthContext';", "")
content = content.replace("const { user } = useAuth();", "")

with open("src/components/OrderMessages.jsx", "w") as f:
    f.write(content)

print("Successfully updated OrderMessages.jsx")
