#!/usr/bin/perl
undef $/;
open(my $fh, '<', 'src/styles.css');
my $content = <$fh>;
close($fh);

$content =~ s/\.announce\{background:var\(--brown\).*?\}/.announce{background:var(--brown);color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:1px;padding:6px 0;display:flex;align-items:center;overflow:hidden;position:relative;width:100%}\n.announce-marquee {display:flex;white-space:nowrap;animation:marquee 25s linear infinite;width:max-content;}\n.announce-marquee span {padding:0 30px;}\n\@keyframes marquee {0% {transform:translateX(0);} 100% {transform:translateX(-50%);}}/s;

open(my $fh_out, '>', 'src/styles.css');
print $fh_out $content;
close($fh_out);
