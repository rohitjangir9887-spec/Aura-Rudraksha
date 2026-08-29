#!/usr/bin/perl

undef $/;
my $file = "src/styles.css";
open(my $fh, '<', $file) or die $!;
my $content = <$fh>;
close($fh);

my $media = '@media(max-width:600px){';
my $add = '.account-header{padding:20px;gap:15px;margin-bottom:20px}.account-avatar{width:55px;height:55px}.account-header h1{font-size:26px}.account-action-card{padding:15px;gap:15px}.icon-wrapper{width:40px;height:40px}';

$content =~ s/\@media\(max-width:600px\)\{/\@media(max-width:600px){$add/g;

open(my $fh_out, '>', $file) or die $!;
print $fh_out $content;
close($fh_out);
