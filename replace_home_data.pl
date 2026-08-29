#!/usr/bin/perl
undef $/;
open(my $fh, '<', 'src/pages/Home.jsx');
my $content = <$fh>;
close($fh);

$content =~ s/import \{ products \} from "\.\.\/data";/import { db } from "..\/lib\/db";/;
$content =~ s/const defaultBanners = \[.*?\];\s+const \[banners, setBanners\] = useState\(\(\) => \{.*?\n  \}\);/const [banners, setBanners] = useState([]);\n  const [products, setProducts] = useState([]);\n\n  useEffect(() => {\n    setBanners(db.getBanners());\n    setProducts(db.getProducts().filter(p => p.status === 'Active'));\n    db.logVisit();\n  }, []);/s;

open(my $fh_out, '>', 'src/pages/Home.jsx');
print $fh_out $content;
close($fh_out);
