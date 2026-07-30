#!/bin/bash

set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK="$ROOT/.render/scroll-world"
SCENES="$ROOT/public/assets/scenes"
PROMPTS="$ROOT/prompts/video"
ASSETS="$ROOT/public/assets/video"
API_BASE="https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks"
MODEL="dreamina-seedance-2-0-260128"
NAMES="01-restaurant 02-menu-builder 03-brand-engine 04-reach 05-growth 06-delivery"
MODE=${1:-dry-run}

mkdir -p "$WORK/canvas" "$WORK/raw" "$WORK/frames" "$WORK/tasks" "$ASSETS"

if [ "$MODE" = "dry-run" ]; then
  echo "No generation started."
  echo "pilot: one 8-second 1080p Seedance clip"
  echo "full: six dives plus five frame-locked connectors"
  echo "Run only after setting ARK_API_KEY and CONFIRM_SEEDANCE_SPEND=YES."
  exit 0
fi

if [ "$MODE" != "pilot" ] && [ "$MODE" != "full" ]; then
  echo "Usage: $0 [dry-run|pilot|full]" >&2
  exit 1
fi

if [ "${CONFIRM_SEEDANCE_SPEND:-}" != "YES" ]; then
  echo "Set CONFIRM_SEEDANCE_SPEND=YES to authorize paid Seedance generation." >&2
  exit 1
fi

if [ -z "${ARK_API_KEY:-}" ]; then
  echo "ARK_API_KEY is required for direct BytePlus ModelArk access." >&2
  exit 1
fi

for command in curl ffmpeg ffprobe jq base64; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command" >&2
    exit 1
  fi
done

make_canvas() {
  name=$1
  input="$SCENES/$name.jpg"
  output="$WORK/canvas/$name.jpg"
  if [ ! -s "$output" ]; then
    ffmpeg -v error -y -i "$input" \
      -vf "scale=1920:-2,crop=1920:1080" -q:v 2 "$output"
  fi
}

write_base64() {
  input=$1
  output=$2
  base64 < "$input" | tr -d '\n' > "$output"
}

wait_for_task() {
  task_id=$1
  result_file=$2
  while :; do
    curl -fsS "$API_BASE/$task_id" \
      -H "Authorization: Bearer $ARK_API_KEY" > "$result_file"
    status=$(jq -r '.status // empty' "$result_file")
    case "$status" in
      succeeded)
        return 0
        ;;
      failed|cancelled|expired)
        jq -r '.error // .' "$result_file" >&2
        return 1
        ;;
    esac
    sleep 8
  done
}

submit_task() {
  prompt_file=$1
  first_image=$2
  last_image=$3
  duration=$4
  output_video=$5
  task_name=$6

  first_b64="$WORK/tasks/$task_name-first.b64"
  last_b64="$WORK/tasks/$task_name-last.b64"
  body="$WORK/tasks/$task_name-body.json"
  created="$WORK/tasks/$task_name-created.json"
  result="$WORK/tasks/$task_name-result.json"

  write_base64 "$first_image" "$first_b64"

  if [ -n "$last_image" ]; then
    write_base64 "$last_image" "$last_b64"
    jq -n \
      --arg model "$MODEL" \
      --rawfile prompt "$prompt_file" \
      --rawfile first "$first_b64" \
      --rawfile last "$last_b64" \
      --argjson duration "$duration" \
      '{
        model: $model,
        content: [
          {type: "text", text: $prompt},
          {
            type: "image_url",
            image_url: {url: ("data:image/jpeg;base64," + $first)},
            role: "first_frame"
          },
          {
            type: "image_url",
            image_url: {url: ("data:image/jpeg;base64," + $last)},
            role: "last_frame"
          }
        ],
        resolution: "1080p",
        duration: $duration,
        ratio: "16:9",
        generate_audio: false,
        watermark: false,
        return_last_frame: true
      }' > "$body"
  else
    jq -n \
      --arg model "$MODEL" \
      --rawfile prompt "$prompt_file" \
      --rawfile first "$first_b64" \
      --argjson duration "$duration" \
      '{
        model: $model,
        content: [
          {type: "text", text: $prompt},
          {
            type: "image_url",
            image_url: {url: ("data:image/jpeg;base64," + $first)},
            role: "first_frame"
          }
        ],
        resolution: "1080p",
        duration: $duration,
        ratio: "16:9",
        generate_audio: false,
        watermark: false,
        return_last_frame: true
      }' > "$body"
  fi

  curl -fsS "$API_BASE" \
    -H "Authorization: Bearer $ARK_API_KEY" \
    -H "Content-Type: application/json" \
    --data-binary "@$body" > "$created"

  task_id=$(jq -r '.id // empty' "$created")
  if [ -z "$task_id" ]; then
    cat "$created" >&2
    return 1
  fi

  echo "$task_name submitted: $task_id"
  wait_for_task "$task_id" "$result"

  video_url=$(jq -r '.content.video_url // .output.content.video_url // empty' "$result")
  if [ -z "$video_url" ]; then
    cat "$result" >&2
    return 1
  fi

  curl -fsSL "$video_url" -o "$output_video"
  tokens=$(jq -r '.usage.completion_tokens // .usage.total_tokens // "unknown"' "$result")
  echo "$task_name complete: $tokens tokens"
}

encode_clip() {
  input=$1
  output=$2
  ffmpeg -v error -y -i "$input" -an \
    -vf "unsharp=5:5:0.8:5:5:0.0" \
    -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
    -g 8 -keyint_min 8 -sc_threshold 0 -movflags +faststart "$output"
}

generate_dive() {
  name=$1
  raw="$WORK/raw/dive-$name.mp4"
  if [ ! -s "$raw" ]; then
    make_canvas "$name"
    submit_task \
      "$PROMPTS/dive-$name.txt" \
      "$WORK/canvas/$name.jpg" \
      "" \
      8 \
      "$raw" \
      "dive-$name"
  fi
  encode_clip "$raw" "$ASSETS/$name.mp4"
}

generate_connector() {
  index=$1
  previous=$2
  next=$3
  raw="$WORK/raw/conn-$index.mp4"
  if [ ! -s "$raw" ]; then
    submit_task \
      "$PROMPTS/conn-$index.txt" \
      "$WORK/frames/last-$previous.jpg" \
      "$WORK/frames/first-$next.jpg" \
      5 \
      "$raw" \
      "conn-$index"
  fi
  encode_clip "$raw" "$ASSETS/conn-$index.mp4"
}

if [ "$MODE" = "pilot" ]; then
  generate_dive "01-restaurant"
  echo "Pilot complete. Review the clip and its token count before running: $0 full"
  exit 0
fi

for name in $NAMES; do
  generate_dive "$name" &
  sleep 1
done
wait

for name in $NAMES; do
  ffmpeg -v error -y -ss 0 -i "$WORK/raw/dive-$name.mp4" \
    -frames:v 1 -q:v 2 "$WORK/frames/first-$name.jpg"
  ffmpeg -v error -y -sseof -0.15 -i "$WORK/raw/dive-$name.mp4" \
    -frames:v 1 -q:v 2 "$WORK/frames/last-$name.jpg"
done

set -- $NAMES
previous=""
index=0
for name in "$@"; do
  if [ -n "$previous" ]; then
    index=$((index + 1))
    padded=$(printf "%02d" "$index")
    generate_connector "$padded" "$previous" "$name" &
    sleep 1
  fi
  previous=$name
done
wait

printf '{\n  "desktop": true,\n  "mobile": false\n}\n' > "$ASSETS/manifest.json"
echo "Desktop Seedance chain complete: $ASSETS"
