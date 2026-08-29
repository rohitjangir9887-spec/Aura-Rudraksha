#!/usr/bin/perl

undef $/;

my $adminFile = "src/pages/admin/Admin.jsx";
open(my $fh1, '<', $adminFile) or die $!;
my $adminContent = <$fh1>;
close($fh1);
$adminContent =~ s/<div className="admin-content">\s*<h1>Dashboard<\/h1>/<div className="admin-content">\n      <div className="admin-page-header">\n        <h1>Dashboard<\/h1>\n        <p>Overview of your store's performance.<\/p>\n      <\/div>/g;
open(my $fh1_out, '>', $adminFile) or die $!;
print $fh1_out $adminContent;
close($fh1_out);

my $adminSimpleFile = "src/pages/admin/AdminSimple.jsx";
open(my $fh2, '<', $adminSimpleFile) or die $!;
my $adminSimpleContent = <$fh2>;
close($fh2);
$adminSimpleContent =~ s/<div className="admin-content">\s*<h1>\{title\}<\/h1>/<div className="admin-content">\n      <div className="admin-page-header">\n        <h1>\{title\}<\/h1>\n        <p>Manage your {title.toLowerCase()}.<\/p>\n      <\/div>/g;
open(my $fh2_out, '>', $adminSimpleFile) or die $!;
print $fh2_out $adminSimpleContent;
close($fh2_out);
