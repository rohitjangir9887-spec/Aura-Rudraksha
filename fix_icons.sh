#!/bin/bash
set -e

# Download the real logo
curl -s -o real-logo.png "https://i.ibb.co/Q3C3gZTd/file-00000000fb188211907f8ce113ccb17a.png"

# Create a padded square version for favicons
convert real-logo.png -background transparent -gravity center -extent 640x640 square-logo.png

# Generate icons
convert square-logo.png -resize 16x16 public/favicon-16x16.png
convert square-logo.png -resize 32x32 public/favicon-32x32.png
convert square-logo.png -resize 48x48 public/favicon-48x48.png
convert square-logo.png -resize 180x180 public/apple-touch-icon.png
convert square-logo.png -resize 192x192 public/icon-192.png
convert square-logo.png -resize 512x512 public/icon-512.png
convert public/favicon-16x16.png public/favicon-32x32.png public/favicon-48x48.png public/favicon.ico

# Remove old corrupted favicon
rm -f public/favicon.jpg || true

