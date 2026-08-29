#!/usr/bin/perl
undef $/;
open(my $fh, '<', 'src/pages/Cart.jsx');
my $content = <$fh>;
close($fh);

$content =~ s/import \{ products, money \} from "\.\.\/data";/import { money } from "..\/data";\nimport { db } from "..\/lib\/db";/;
$content =~ s/import React from "react";/import React, { useState, useEffect } from "react";/;
$content =~ s/export function Cart\(\) \{/export function Cart() {\n  const [products, setProducts] = useState([]);\n  useEffect(() => {\n    setProducts(db.getProducts());\n  }, []);\n/;

open(my $fh_out, '>', 'src/pages/Cart.jsx');
print $fh_out $content;
close($fh_out);
