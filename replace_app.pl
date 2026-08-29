#!/usr/bin/perl
undef $/;
open(my $fh, '<', 'src/App.jsx');
my $content = <$fh>;
close($fh);

$content =~ s/import \{ AdminSimple \} from "\.\/pages\/admin\/AdminSimple";/import { AdminSimple } from ".\/pages\/admin\/AdminSimple";\nimport { AdminBanners } from ".\/pages\/admin\/AdminBanners";\nimport { HeroImages } from ".\/pages\/admin\/HeroImages";/;

$content =~ s/<Route path="\/admin\/banners" element=\{<AdminSimple title="Banners" \/>\} \/>/<Route path="\/admin\/banners" element=\{<AdminBanners \/>\} \/>\n      <Route path="\/admin\/banners\/hero" element=\{<HeroImages \/>\} \/>/;

open(my $fh_out, '>', 'src/App.jsx');
print $fh_out $content;
close($fh_out);
