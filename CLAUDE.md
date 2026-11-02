# mahjong-calc

livewing/mahjong-calc (MIT) をベースにした麻雀点数計算 PWA。3人麻雀とオープン立直 (ローカルルール) を追加している。
現状・設計判断・デプロイ手順は [HANDOFF.md](HANDOFF.md) を参照。

## コマンド

- 初回 / WASM 変更時: `npm run build:wasm` (Rust + wasm-pack が必要。生成物 `wasm/decomposer/pkg/` は git 管理外)
- 開発: `npm run dev`
- 確認: `npm run lint` / `npx tsc -b` / `npm test` / `npm run build`
- 整形: `npx biome check --write`

## 規約

- `Rule` に項目を追加したら `compareRules` (src/lib/rule.ts) と state.ts のすべてのプリセット・`currentRule` も更新する
- UI 文言は locales/ の ja / en / zh-CN / ko すべてに追加する
- 点数計算は src/lib/score.ts のヘルパー (`horaBasePoint`, `horaPoint`, `tsumoPayments`) を使い、人数 (`players`) とツモ精算方式 (`sanmaTsumo`) を考慮する
- 上流 (livewing) と FluffyStuff へのクレジット・ライセンス表記は消さない
- コミット時に husky が lint とテストを実行する
