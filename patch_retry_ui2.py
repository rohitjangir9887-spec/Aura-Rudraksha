with open("src/pages/account/Orders.jsx", "r") as f:
    code = f.read()

target = """                            {/* PayU Retry Button for Unpaid Orders */}
                            {!isPaid && !isRefunded && ("""

replacement = """                            {/* PayU Retry Button for Unpaid Orders */}
                            {!isPaid && !isRefunded && !isCancelled && ("""

code = code.replace(target, replacement)

with open("src/pages/account/Orders.jsx", "w") as f:
    f.write(code)
