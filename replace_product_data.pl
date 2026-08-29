#!/usr/bin/perl
undef $/;
open(my $fh, '<', 'src/pages/Product.jsx');
my $content = <$fh>;
close($fh);

$content =~ s/import \{ products \} from "\.\.\/data";/import { db } from "..\/lib\/db";/;
$content =~ s/export function Product\(\) \{/export function Product() {\n  const [products, setProducts] = useState([]);\n  useEffect(() => {\n    setProducts(db.getProducts().filter(p => p.status === 'Active'));\n    db.logVisit();\n  }, []);\n/;
$content =~ s/const p = products\.find\(x => x\.id === id\) \|\| products\[0\];/const p = products.length ? (products.find(x => x.id === id) || products[0]) : null;/;

# If 'p' is null, it should return loading.
$content =~ s/useEffect\(\(\) => \{\n    window\.scrollTo\(0, 0\);/useEffect(() => {\n    window.scrollTo(0, 0);\n    if(p) { setActiveImg(p.img); setQty(1); setShowAllReviews(false); }\n  }, [id, p]);\n  if(!p) return <Shell><main className="page">Loading...<\/main><\/Shell>;\n\n  \/\/ replaced useffect/s;

open(my $fh_out, '>', 'src/pages/Product.jsx');
print $fh_out $content;
close($fh_out);
