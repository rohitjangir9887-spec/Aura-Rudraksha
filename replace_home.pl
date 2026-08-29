#!/usr/bin/perl
undef $/;
open(my $fh, '<', 'src/pages/Home.jsx');
my $content = <$fh>;
close($fh);

my $banners_code = << 'CODE';
  const defaultBanners = [
    "https://i.ibb.co/Pvb9qZy7/file-00000000310082118c0c939fa357349f.png",
    "https://i.ibb.co/23zYS09n/file-00000000886c82118cc5dc60c8082572.png",
    "https://i.ibb.co/vvjdFqNQ/file-0000000057548208a095c1d1fc26f78c.jpg"
  ];
  
  const [banners, setBanners] = useState(() => {
    try {
      const stored = localStorage.getItem("hero_images");
      if (stored) return JSON.parse(stored);
    } catch(e){}
    return defaultBanners;
  });
CODE

$content =~ s/const banners = \[\s*"https:\/\/i.ibb.co\/Pvb9qZy7\/file-00000000310082118c0c939fa357349f.png",\s*"https:\/\/i.ibb.co\/23zYS09n\/file-00000000886c82118cc5dc60c8082572.png",\s*"https:\/\/i.ibb.co\/vvjdFqNQ\/file-0000000057548208a095c1d1fc26f78c.jpg"\s*\];/$banners_code/;

open(my $fh_out, '>', 'src/pages/Home.jsx');
print $fh_out $content;
close($fh_out);
