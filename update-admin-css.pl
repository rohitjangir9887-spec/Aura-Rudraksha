#!/usr/bin/perl

undef $/;
my $file = "src/styles.css";
open(my $fh, '<', $file) or die $!;
my $content = <$fh>;
close($fh);

# First remove the old .admin styles
$content =~ s/\.admin\{display:flex;min-height:100vh;background:#f4f5f6\}.*?\.mini\{[^\}]+\}//s;

# And remove admin media queries
$content =~ s/\.admin aside\{width:185px\}//g;
$content =~ s/\.admin\{display:block;padding-bottom:20px\}.*?\.table-head,\.table-row\{grid-template-columns:1\.5fr \.8fr \.5fr;font-size:9px\}//s;


my $newAdminCSS = << 'CSS';
/* Admin Styles */
.admin-wrapper {
  display: flex;
  min-height: 100vh;
  background: #fdf5ef;
  color: #2b170d;
}
.admin-desktop-sidebar {
  width: 250px;
  background: #2b170d;
  color: #fff;
  padding: 25px 15px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.admin-mobile-header {
  display: none;
  background: #2b170d;
  color: white;
  padding: 15px 20px;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}
.admin-brand {
  font: 600 27px "Cormorant Garamond";
  padding: 0 12px 30px;
  color: white;
}
.admin-brand span {
  display: block;
  font: 700 8px Inter;
  letter-spacing: 3px;
}
.nav-links {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.nav-links a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  border-radius: 8px;
  font-size: 13px;
  color: #e6d6c8;
  text-decoration: none;
  transition: all 0.2s;
}
.nav-links a:hover, .nav-links a.active {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}
.nav-links a.logout-link {
  margin-top: 20px;
  color: #e88c7d;
}
.nav-links a.logout-link:hover {
  background: rgba(232, 140, 125, 0.1);
}
.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.admin-top-bar {
  height: 70px;
  background: #fff;
  border-bottom: 1px solid var(--line);
  padding: 0 35px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  flex-shrink: 0;
}
.page-title {
  font-weight: 600;
  font-size: 16px;
}
.admin-user-info {
  display: flex;
  align-items: center;
  gap: 15px;
  color: #806f62;
}
.admin-user-info .avatar {
  width: 32px;
  height: 32px;
  background: #fdf5ef;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--copper);
}
.admin-content-wrapper {
  padding: 35px;
  flex: 1;
  overflow-y: auto;
}
.admin-page-header {
  margin-bottom: 25px;
}
.admin-page-header h1 {
  font: 600 36px "Cormorant Garamond";
  margin: 5px 0;
}
.admin-page-header p {
  color: #806f62;
  font-size: 13px;
}
.admin-back {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: var(--copper);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  margin-bottom: 15px;
}
.admin-content h1 {
  font: 600 36px "Cormorant Garamond";
  margin-bottom: 25px;
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}
.stats > div {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 22px;
}
.stats small {
  display: block;
  color: #806f62;
  font-size: 11px;
}
.stats b {
  font-size: 30px;
  display: block;
  margin-top: 10px;
  font-family: "Cormorant Garamond";
}
.admin-panels {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 20px;
  margin-top: 25px;
}
.admin-panels > div, .admin-table {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 25px;
}
.admin-panels h2 {
  font: 600 24px "Cormorant Garamond";
  margin-bottom: 15px;
}
.admin-panels p {
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
  padding: 14px 0;
}
.table-head, .table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 0.6fr;
  gap: 15px;
  padding: 15px 10px;
  border-bottom: 1px solid var(--line);
  font-size: 12px;
}
.mini {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 11px;
  cursor: pointer;
}
.admin-action-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
}
.admin-action-card:hover {
  border-color: var(--copper);
  background: #fdfaf6;
}
.admin-action-card b {
  display: block;
  font-size: 15px;
}
.admin-action-card span {
  font-size: 12px;
  color: #806f62;
  margin-top: 5px;
  display: block;
}
.hero-slots-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.hero-slot-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 25px;
}
.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.slot-header h2 {
  font: 600 22px "Cormorant Garamond";
}
.success-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #e5f6ea;
  color: #1d9450;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}
.preview-container {
  width: 100%;
  height: 200px;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
  border: 1px solid var(--line);
}
.preview-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.replace-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid var(--copper);
  color: var(--copper);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.replace-btn:hover {
  background: var(--copper);
  color: white;
}
.edit-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.edit-controls label {
  font-size: 12px;
  font-weight: 600;
  color: #2b170d;
}
.edit-controls input {
  padding: 12px 15px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 13px;
  outline: none;
}
.edit-controls input:focus {
  border-color: var(--copper);
}
.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}
.cancel-btn {
  padding: 10px 20px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}
.save-btn {
  padding: 10px 20px;
  background: var(--copper);
  border: none;
  color: white;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* Mobile Admin specific */
@media(max-width: 900px) {
  .admin-desktop-sidebar {
    display: none;
  }
  .admin-mobile-header {
    display: flex;
  }
  .admin-wrapper {
    flex-direction: column;
  }
  .admin-top-bar {
    display: none;
  }
  .admin-mobile-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 10000;
  }
  .admin-mobile-drawer {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: 280px;
    background: #2b170d;
    z-index: 10001;
    display: flex;
    flex-direction: column;
  }
  .drawer-header {
    display: flex;
    justify-content: flex-end;
    padding: 15px;
    color: white;
  }
  .drawer-header button {
    background: none;
    border: none;
    color: white;
  }
  .mobile-aside {
    padding: 0 20px 20px;
    overflow-y: auto;
  }
  .admin-content-wrapper {
    padding: 20px;
  }
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .admin-panels {
    grid-template-columns: 1fr;
  }
  .action-buttons {
    flex-direction: column;
  }
  .action-buttons button {
    width: 100%;
  }
}
@media(max-width: 600px) {
  .stats {
    gap: 10px;
  }
  .stats > div {
    padding: 15px;
  }
  .stats b {
    font-size: 24px;
  }
  .table-head, .table-row {
    grid-template-columns: 1.5fr 1fr 0.6fr;
    font-size: 10px;
  }
  .hero-slot-card {
    padding: 15px;
  }
  .preview-container {
    height: 150px;
  }
}
CSS

$content .= "\n" . $newAdminCSS;

open(my $fh_out, '>', $file) or die $!;
print $fh_out $content;
close($fh_out);
