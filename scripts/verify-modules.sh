#!/usr/bin/env bash
# 观史台模块重构：完整验证链（一步一输出，便于定位耗时与失败点）。
#
# 与 package.json 的 verify:source 等价，但：
#   1. 逐步输出，不用管道汇总，避免长构建被 SIGTERM 掩盖真实进度；
#   2. build-all 使用 --refresh-lock（基线锁与已提交源本就不一致，见
#      docs/module-contract-baseline.md §9.4 缺陷 A）；
#   3. 不跑 lint（eslint.config.mjs 的 globalIgnores 排除 atlas/**，对本任务不适用）；
#   4. 不跑 vinext build / test:visual（需完整 Next.js + Cloudflare 工具链，与 UI 层重构无关）。
#
# 用法：bash scripts/verify-modules.sh
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LOGDIR="${TMPDIR:-/tmp}/sgz-verify"
mkdir -p "$LOGDIR"

step() {
  echo ""
  echo "════════ $1 ════════"
}

fail=0
run() {
  local name="$1"; shift
  local log="$LOGDIR/$name.log"
  local start
  start=$(date +%s)
  if "$@" > "$log" 2>&1; then
    echo "✓ $name（$(( $(date +%s) - start ))s）"
  else
    local code=$?
    echo "✗ $name 失败（exit=$code，$(( $(date +%s) - start ))s）"
    echo "--- 末尾 30 行 ---"
    tail -30 "$log"
    fail=1
  fi
}

step "1/6 内联脚本与锚点校验"
run check-inline-script node scripts/check-inline-script.mjs

step "2/6 规范源确定性重建"
run build-atlas node atlas/scripts/build-all.mjs --refresh-lock

step "3/6 同步读者包"
run sync-reader node scripts/sync-reader-bundle.mjs

step "4/6 生成 catalogue"
run build-catalogue node scripts/build-catalogue.mjs

step "5/6 型别检查"
run typecheck npx tsc --noEmit --incremental false

step "6/6 语义测试"
run test-source node --test tests/*.test.mjs

echo ""
echo "════════ 测试结果 ════════"
grep -E "^# (tests|pass|fail)" "$LOGDIR/test-source.log" || true

echo ""
if [ "$fail" -eq 0 ]; then
  echo "✓ 验证链全部通过"
else
  echo "✗ 验证链存在失败项，日志见 $LOGDIR"
  exit 1
fi
