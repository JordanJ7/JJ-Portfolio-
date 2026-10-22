#!/usr/bin/env bash
# Prepare media for the site. Output goes to assets/media/ (docs/ in the repo, site/ in the package).
#   tools/optimize.sh image  path/to/file.png   my-name     -> my-name.webp (max 1100px wide)
#   tools/optimize.sh video  path/to/file.mov   my-name     -> my-name.mp4 (muted, 720px wide) + my-name_poster.webp
# Needs ffmpeg. After running, add an entry to MEDIA in site/js/data.js (src, alt, w, h, and poster for video).
set -euo pipefail
kind="$1"; in="$2"; name="$3"; root="$(cd "$(dirname "$0")/.." && pwd)"
if [ -d "$root/docs/assets/media" ]; then out="$root/docs/assets/media"; else out="$root/site/assets/media"; fi
case "$kind" in
  image) ffmpeg -v error -y -i "$in" -vf "scale='min(1100,iw)':-2" -quality 80 "$out/$name.webp"
         ffprobe -v error -show_entries stream=width,height -of csv=p=0 "$out/$name.webp" ;;
  video) ffmpeg -v error -y -i "$in" -an -vf "scale=720:-2" -c:v libx264 -crf 30 -preset slow -pix_fmt yuv420p -movflags +faststart "$out/$name.mp4"
         ffmpeg -v error -y -ss 0.6 -i "$out/$name.mp4" -frames:v 1 -quality 70 "$out/${name}_poster.webp"
         ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$out/$name.mp4" ;;
  *) echo "usage: $0 image|video input name"; exit 1 ;;
esac
echo "Done. Add it to MEDIA in site/js/data.js."
