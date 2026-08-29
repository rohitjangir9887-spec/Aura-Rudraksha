#!/usr/bin/perl
undef $/;
open(my $fh, '<', 'src/pages/Product.jsx');
my $content = <$fh>;
close($fh);

$content =~ s/\/\/ replaced useffect.*?\}, \[id, p\.img\]\);//s;

open(my $fh_out, '>', 'src/pages/Product.jsx');
print $fh_out $content;
close($fh_out);
