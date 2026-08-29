#!/usr/bin/perl
undef $/;
open(my $fh, '<', 'src/pages/Checkout.jsx');
my $content = <$fh>;
close($fh);

$content =~ s/import \{ products, money \} from "\.\.\/data";/import { money } from "..\/data";\nimport { db } from "..\/lib\/db";/;
$content =~ s/export function Checkout\(\) \{/export function Checkout() {\n  const [products, setProducts] = useState([]);\n  useEffect(() => {\n    setProducts(db.getProducts());\n  }, []);\n/;

$content =~ s/const placeOrder = \(e\) => \{/const placeOrder = (e) => {\n    e.preventDefault();\n    setLoading(true);\n    const email = e.target.querySelector('input[type="email"]').value;\n    const name = e.target.querySelector('input[placeholder="First Name"]').value;\n    const orderObj = {\n      customerEmail: email,\n      customerName: name,\n      amount: total,\n      items: cart,\n      status: "Pending"\n    };\n    const savedOrder = db.saveOrder(orderObj);\n/;
$content =~ s/Your order #AR-2025-000\{Math\.floor\(Math\.random\(\)\*900\+100\)\} has been placed successfully/Your order #{savedOrder?.id || ''} has been placed successfully/;

# Need to fix saveOrder passing to success state.
$content =~ s/setSuccess\(true\);/setSuccess(savedOrder.id);/;
$content =~ s/if \(success\)/if (success)/;
$content =~ s/\{savedOrder\?\.id \|\| ''\}/\{success\}/;

open(my $fh_out, '>', 'src/pages/Checkout.jsx');
print $fh_out $content;
close($fh_out);
