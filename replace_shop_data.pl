#!/usr/bin/perl
undef $/;
open(my $fh, '<', 'src/pages/Shop.jsx');
my $content = <$fh>;
close($fh);

$content =~ s/import \{ products \} from "\.\.\/data";/import { db } from "..\/lib\/db";/;
$content =~ s/export function Shop\(\) \{/export function Shop() {\n  const [products, setProducts] = useState([]);\n  useEffect(() => {\n    setProducts(db.getProducts().filter(p => p.status === 'Active'));\n  }, []);\n/;

open(my $fh_out, '>', 'src/pages/Shop.jsx');
print $fh_out $content;
close($fh_out);
