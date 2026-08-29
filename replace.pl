#!/usr/bin/perl

undef $/;
my $file = "src/styles.css";
open(my $fh, '<', $file) or die $!;
my $content = <$fh>;
close($fh);

my $search = '\.account\{display:grid;grid-template-columns:220px 1fr;gap:40px;min-height:60vh\}\.account-side\{background:#2b170d;color:#fff;border-radius:12px;padding:20px;height:max-content;display:flex;flex-direction:column\}\.account-side h3\{font-family:"Cormorant Garamond";font-size:23px\}\.account-side a\{font-size:11px;padding:11px 0;color:#e6d6c8\}\.account-cards\{display:grid;grid-template-columns:repeat\(3,1fr\);gap:12px\}\.account-cards a\{background:#fff;border:1px solid var\(--line\);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:8px\}\.account-cards svg\{color:var\(--copper\)\}\.account-cards b\{font-size:12px\}\.account-cards span\{font-size:9px;color:#806f62\}';

my $replace = '.account-container{max-width:800px;margin:0 auto;min-height:60vh}.account-header{display:flex;align-items:center;gap:20px;margin-bottom:35px;background:#fffdf9;border:1px solid var(--line);padding:30px;border-radius:15px}.account-avatar{width:70px;height:70px;background:var(--copper);color:white;border-radius:50%;display:grid;place-items:center}.account-header h1{font:600 32px "Cormorant Garamond";margin:5px 0 2px}.account-header p{font-size:13px;color:#806f62}.account-nav-grid{display:flex;flex-direction:column;gap:12px}.account-action-card{display:flex;align-items:center;gap:18px;background:#fffdf9;border:1px solid var(--line);padding:20px 25px;border-radius:12px;color:inherit;text-decoration:none;transition:all 0.2s}.account-action-card:hover{border-color:var(--copper);background:white;box-shadow:0 4px 15px rgba(0,0,0,0.02)}.icon-wrapper{color:var(--copper);display:grid;place-items:center;background:#fdf5ef;width:45px;height:45px;border-radius:10px}.card-content{flex:1}.card-content b{display:block;font-size:14px}.card-content span{display:block;font-size:11px;color:#806f62;margin-top:3px}.account-action-card .arrow{color:#a29286}.account-action-card.logout .icon-wrapper{color:#d64b2e;background:#fff0ed}';

$content =~ s/$search/$replace/g;

$content =~ s/\.account\{grid-template-columns:1fr\}//g;

open(my $fh_out, '>', $file) or die $!;
print $fh_out $content;
close($fh_out);
