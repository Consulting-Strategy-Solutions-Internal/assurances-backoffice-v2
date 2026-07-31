#!/bin/sh

set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <image:tag>" >&2
  exit 2
fi

readonly NEW_IMAGE="$1"
readonly PROJECT_NAME="assurances-backoffice"
readonly SERVICE_NAME="app"
readonly MAX_ATTEMPTS=45

cd "$(dirname "$0")"

# Compose requires an image value even when only inspecting the current service.
export IMAGE="$NEW_IMAGE"

current_container="$(docker compose -p "$PROJECT_NAME" ps -q "$SERVICE_NAME")"
previous_image=""

if [ -n "$current_container" ]; then
  previous_image="$(docker inspect --format '{{.Config.Image}}' "$current_container")"
fi

wait_until_healthy() {
  container_id="$(docker compose -p "$PROJECT_NAME" ps -q "$SERVICE_NAME")"
  attempt=1

  while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"

    if [ "$status" = "healthy" ]; then
      return 0
    fi

    if [ "$status" = "unhealthy" ] || [ "$status" = "exited" ] || [ "$status" = "dead" ]; then
      return 1
    fi

    attempt=$((attempt + 1))
    sleep 2
  done

  return 1
}

docker compose -p "$PROJECT_NAME" pull "$SERVICE_NAME"
docker compose -p "$PROJECT_NAME" up -d --no-deps --force-recreate "$SERVICE_NAME"

if wait_until_healthy; then
  printf 'IMAGE=%s\n' "$NEW_IMAGE" > .env
  docker image prune -f >/dev/null
  echo "Deployment succeeded: $NEW_IMAGE"
  exit 0
fi

echo "Deployment failed: $NEW_IMAGE" >&2
docker compose -p "$PROJECT_NAME" logs --no-color --tail=100 "$SERVICE_NAME" >&2

if [ -z "$previous_image" ]; then
  echo "No previous image is available for rollback." >&2
  exit 1
fi

echo "Rolling back to $previous_image" >&2
export IMAGE="$previous_image"
docker compose -p "$PROJECT_NAME" up -d --no-deps --force-recreate "$SERVICE_NAME"

if wait_until_healthy; then
  printf 'IMAGE=%s\n' "$previous_image" > .env
  echo "Rollback succeeded: $previous_image" >&2
else
  echo "Rollback failed: $previous_image" >&2
fi

exit 1
