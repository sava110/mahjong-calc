# mahjong-calc

麻雀の手牌を入力すると、待ち牌・得点や牌効率の計算をすることができる Web アプリケーション (PWA) です。スマートフォンと PC の Web ブラウザ上で動作します。

[livewing/mahjong-calc](https://github.com/livewing/mahjong-calc) をベースに、以下の機能を追加しています。

- **三人麻雀 (3麻)**: 卓設定の「人数」またはルール設定で切り替えられます。
  - 2萬〜8萬を除外し、チーと北家を無効化
  - ドラ表示牌 1萬 → ドラ 9萬
  - 抜きドラ (北) の入力 (北がドラの場合は通常のドラとしても加算、北抜き後の嶺上開花に対応)
  - ツモ精算方式: ツモ損 / 北家折半
  - 本場は支払者 1 人あたりの額で計算 (ロンは 2 人分)
  - プリセット: 天鳳 三麻、雀魂 三麻
- **オープン立直 (ローカルルール)**: ルール設定でオン / オフを切り替えられます。オンにすると手役オプションの立直に「オープン立直」「Wオープン立直」が追加されます。
  - ツモ和了はオープン立直 2 飜 / Wオープン立直 3 飜、ロン和了 (オープン立直への放銃) は役満
- **対局ルーム**: 「対局」画面でルームを作り、同じ卓の人がそれぞれのスマホから参加できます。
  - 全自動卓の点数表示のように、自分の点数を大きく、他家は自分との点差で表示 (タップで点数表示)
  - 和了 (ロン・ツモ・ダブロン)・流局 (聴牌者・ノーテン罰符)・立直を入力すると点数を移動。点数計算画面の結果をそのまま記録することもできます
  - 局ごとの記録、1つ戻す、終局時の順位とウマ・オカ込みのポイント
  - ルームは誰でも作成でき、参加にはルームコードと数字4桁の合言葉が必要。作成後は、参加リンク (合言葉入り)・ルームコード・合言葉をまとめた招待文を共有できます

## 使用方法 - How to use

[使用方法](./doc/how-to-use.md) (Japanese)

## 開発 - Development

Node.js と Rust ([rustup](https://rustup.rs/)) 、 [wasm-pack](https://github.com/drager/wasm-pack) が必要です。

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
npm ci
npm run build:wasm
npm run dev
```

対局ルームを試すときは、別のターミナルで API サーバーも起動します (Node.js 24 以上)。

```sh
npm run dev:server
```

See also [CONTRIBUTING.md](./CONTRIBUTING.md).

## ライセンス - License

[The MIT License](./LICENSE)

## クレジット - Credits

- ベースとしたアプリケーション: [livewing/mahjong-calc](https://github.com/livewing/mahjong-calc) (MIT License, &copy; livewing.net)
- 麻雀牌の画像は [FluffyStuff/riichi-mahjong-tiles](https://github.com/FluffyStuff/riichi-mahjong-tiles) のものを使用しています ([CC BY](https://github.com/FluffyStuff/riichi-mahjong-tiles/blob/master/LICENSE.md)) 。
