for d in *; do
  if [ -f "$d/package.json" ]; then
    jq -r '.name' "$d/package.json"
  fi
done

