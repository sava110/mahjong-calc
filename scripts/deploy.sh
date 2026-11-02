#!/usr/bin/env bash
# 最新の main を取り込み、Docker イメージを作り直して mahjong-calc (フロント) と
# mahjong-calc-api (対局ルーム API) のコンテナを入れ替える。
# ビルド (wasm-pack / npm ci / npm test / vite build) は Dockerfile 内で行う。
# main に変更がなく、両方のコンテナが動いていれば何もしない (--force で必ず作り直す)。
# systemd ユーザータイマー mahjong-calc-deploy.timer から毎日実行される。
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$HOME/docker/docker-compose.yml}"
SERVICES=(mahjong-calc mahjong-calc-api)

all_running() {
  local s
  for s in "${SERVICES[@]}"; do
    [[ "$(docker inspect -f '{{.State.Running}}' "$s" 2>/dev/null)" == "true" ]] || return 1
  done
}

cd "$REPO_DIR"
before="$(git rev-parse HEAD)"
git pull --ff-only
after="$(git rev-parse HEAD)"

if [[ "${1:-}" != "--force" && "$before" == "$after" ]] \
  && all_running; then
  echo "mahjong-calc: 変更なし ($after)"
  exit 0
fi
echo "mahjong-calc: ${before:0:7} -> ${after:0:7} をデプロイ"

# ビルドは一時的に 2GB 前後使う。足りなければ現行コンテナのまま止める
avail_mb="$(df -Pm / | awk 'NR==2 {print $4}')"
if (( avail_mb < 3000 )); then
  echo "mahjong-calc: ディスク空き ${avail_mb}MB (< 3000MB) のためビルドを中止" >&2
  exit 1
fi

docker compose -f "$COMPOSE_FILE" build "${SERVICES[@]}"
docker compose -f "$COMPOSE_FILE" up -d --no-deps "${SERVICES[@]}"

# ディスクが小さいので、ビルド中間層と古いイメージを片付ける
docker builder prune -f >/dev/null
docker image prune -f >/dev/null

curl -fsS -o /dev/null -w 'mahjong-calc: HTTP %{http_code}\n' http://100.117.171.46:8080/
# API は存在しないルームに 404 を返せば動いている
curl -sS -o /dev/null -w 'mahjong-calc-api: HTTP %{http_code}\n' http://100.117.171.46:8080/api/rooms/ZZZZZZ
