with open("src/App.jsx", "r") as f:
    code = f.read()

# Replace lazy loads with standard imports for critical paths
replacements = {
    'const Shop = lazy(() => import("./pages/Shop").then(m => ({ default: m.Shop })));': 'import { Shop } from "./pages/Shop";',
    'const Product = lazy(() => import("./pages/Product").then(m => ({ default: m.Product })));': 'import { Product } from "./pages/Product";',
    'const Cart = lazy(() => import("./pages/Cart").then(m => ({ default: m.Cart })));': 'import { Cart } from "./pages/Cart";',
    'const Checkout = lazy(() => import("./pages/Checkout").then(m => ({ default: m.Checkout })));': 'import { Checkout } from "./pages/Checkout";',
    'const PaymentResult = lazy(() => import("./pages/PaymentResult").then(m => ({ default: m.PaymentResult })));': 'import { PaymentResult } from "./pages/PaymentResult";',
    'const Orders = lazy(() => import("./pages/account/Orders").then(m => ({ default: m.Orders })));': 'import { Orders } from "./pages/account/Orders";',
    'const OrderDetail = lazy(() => import("./pages/account/OrderDetail").then(m => ({ default: m.OrderDetail })));': 'import { OrderDetail } from "./pages/account/OrderDetail";',
}

for old, new_val in replacements.items():
    code = code.replace(old, new_val)

with open("src/App.jsx", "w") as f:
    f.write(code)
