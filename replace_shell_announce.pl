#!/usr/bin/perl
undef $/;
open(my $fh, '<', 'src/components/Shell.jsx');
my $content = <$fh>;
close($fh);

$content =~ s/<div className="announce">✨ Authentic Rudraksha .*?<\/div>/<div className="announce">\n          <div className="announce-marquee">\n            <span>✓ 100% Authentic | 🔬 Lab Tested | 🚚 Free Shipping | 🔒 Secure Payment | ❤️ Support | 📞 +91 9672996531<\/span>\n            <span>✓ 100% Authentic | 🔬 Lab Tested | 🚚 Free Shipping | 🔒 Secure Payment | ❤️ Support | 📞 +91 9672996531<\/span>\n          <\/div>\n        <\/div>/;

open(my $fh_out, '>', 'src/components/Shell.jsx');
print $fh_out $content;
close($fh_out);
