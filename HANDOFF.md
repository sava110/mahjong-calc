# 引き継ぎ資料: minipc (Linux) への導入と Cloudflare 経由での公開

作成日: 2026-11-02

この資料は、次のチャットで作業する Claude と、オーナー (人間) の両方に向けたものです。

- 前半: **オーナーがやること** (Claude ではできない、または秘密情報を扱う作業)
- 後半: **Claude への引き継ぎ** (プロジェクトの現状と、minipc 上で行う作業手順)

---

## 0. 全体像

```
[ブラウザ] ──HTTPS──> [Cloudflare] ══ Cloudflare Tunnel ══> [minipc: cloudflared] ──> [nginx :8080] ──> dist/ (静的ファイル)
```

- このアプリは **静的サイト (Vite でビルドした PWA)** です。サーバー側のプログラムやデータベースはありません。`npm run build` で生成される `dist/` を配信するだけで動きます。
- minipc は **Cloudflare Tunnel (cloudflared)** で Cloudflare とつなぎます。ルーターのポート開放は不要で、自宅の IP アドレスも公開されません。
- HTTPS 証明書は Cloudflare 側で自動的に用意されます。minipc 側では HTTP (localhost:8080) で配信するだけで済みます。

---

## 1. オーナー (人間) がやること

上から順に進めてください。★が付いている項目は Claude には代行できません。

### 1-1. 事前に決めておくこと

- [ ] **公開する URL を決める**。例: `mahjong.example.com` (サブドメイン推奨)
- [ ] **minipc の OS を確認する**。手順は Ubuntu / Debian 系を想定しています。別の OS ならチャットの最初に伝えてください。

### 1-2. ドメインを Cloudflare に登録する ★

- [ ] Cloudflare アカウントを作る (無料プランで十分)
- [ ] Cloudflare ダッシュボードで「サイトを追加」から個人ドメインを登録する
- [ ] ドメインを買ったレジストラ (お名前.com など) の管理画面で、ネームサーバーを Cloudflare が指定する 2 つに変更する
- [ ] Cloudflare 上でドメインが「有効 (Active)」になるのを待つ (数分〜最大 24 時間程度)
- 既にドメインを Cloudflare で管理している場合、この節は不要です。

### 1-3. minipc の準備 ★

- [ ] Linux をインストールし、ネットワークにつなぐ
- [ ] `sudo` が使えるユーザーでログインできるようにする (SSH 推奨)
- [ ] minipc に Claude Code をインストールしてログインする
- [ ] (任意) minipc から GitHub へ push する場合は、`gh auth login` などで GitHub 認証を設定する。リポジトリは公開設定なので、clone と pull だけなら認証は不要です。

### 1-4. Cloudflare Tunnel を作る ★ (トークンを Claude に渡さないため)

トンネルのトークンはパスワードと同じ扱いです。**チャットに貼らず、ご自身で minipc に設定してください。**

- [ ] Cloudflare ダッシュボードで **Zero Trust** を開き、**ネットワーク > Tunnels** で「トンネルを作成」を選ぶ
- [ ] 種類は **Cloudflared** を選び、トンネル名を付ける (例: `minipc`)
- [ ] 表示される「コネクタのインストール」で **Debian / 64-bit** を選び、表示されたコマンドを **minipc のターミナルでご自身で実行する**
  - `cloudflared` のインストールと `sudo cloudflared service install <トークン>` の両方が含まれています
- [ ] コネクタが「接続済み (Healthy)」になったら次へ進み、**パブリックホスト名** を次のように設定する
  - サブドメイン / ドメイン: 1-1 で決めた URL
  - サービス: `HTTP` と `localhost:8080`
- [ ] 保存する。DNS レコードは Cloudflare が自動で作ります。

> 補足: 1-4 は、Claude が 2 章の手順 (nginx の設定まで) を終えてからでも構いません。先にトンネルを作った場合、nginx が動き出すまではアクセスしてもエラー (502) になりますが、問題ありません。

### 1-5. 新しいチャットの最初に伝えること

minipc 上で Claude Code を起動し、次のように伝えてください。

```
https://github.com/sava110/mahjong-calc を ~/mahjong-calc に clone して、
HANDOFF.md の「2. Claude への引き継ぎ」に従って minipc に導入して。
公開 URL は mahjong.example.com、OS は Ubuntu 24.04。
```

(URL と OS は実際のものに置き換えてください)

### 1-6. 公開後の確認 ★

- [ ] スマートフォンとパソコンで公開 URL を開き、牌の入力と点数計算ができることを確認する
- [ ] 3麻の切り替え、ルール設定でのオープン立直のオン/オフが動くことを確認する
- [ ] (任意) Cloudflare ダッシュボードの「SSL/TLS > エッジ証明書」で「常に HTTPS を使用」をオンにする

---

## 2. Claude への引き継ぎ

### 2-1. プロジェクトの現状

- リポジトリ: https://github.com/sava110/mahjong-calc (公開設定)
  - `main` が最新です (コミット `d59bb47`)。作業ブランチ `feature/sanma-open-riichi` も残っていますが、内容は `main` に取り込み済みです。
- [livewing/mahjong-calc](https://github.com/livewing/mahjong-calc) (MIT) をベースにしたフォークです。上流からの追加機能は次のとおりです。
  - **3人麻雀**: `Rule.players` (3 / 4)、`Rule.sanmaTsumo` (`tsumo-son` / `split`)。2萬〜8萬・チー・北家を無効化、1萬表示で 9萬がドラ、抜きドラ (`Input.nukidora`)、北家折半の精算、人数に応じた本場と点差の計算、天鳳 / 雀魂 の三麻プリセット
  - **オープン立直 (ローカルルール)**: `Rule.openRiichi`。立直の選択肢に `open-riichi` (ツモ 2 飜) と `open-double-riichi` (ツモ 3 飜) を追加。ロンは常に役満 (`open-riichi-deal-in`)。ルールがオフのときは通常の立直 / W立直として扱う (`effectiveRiichi`)
  - 立直の項目を 1 行に独立。表示名は「W立直」
  - 手牌入力のメニューを「リセット」ボタンだけにした (ランダム配牌などはキーボードショートカットとして残っている)
  - CI はビルドジョブだけ (上流のデプロイジョブは削除済み)
- 牌の画像は [FluffyStuff/riichi-mahjong-tiles](https://github.com/FluffyStuff/riichi-mahjong-tiles) のもの (上流が最適化した SVG をそのまま利用)。

### 2-2. 技術構成と重要ファイル

- React 19 + TypeScript (strictest) + Vite 6 + Tailwind 4、PWA (vite-plugin-pwa)
- 手牌の分解・向聴数の計算は Rust → WASM (`wasm/decomposer`)。**`npm run build:wasm` を先に実行しないとビルドできません。** 生成物 `wasm/decomposer/pkg/` は git 管理外です。
- 主な処理の場所
  - [src/lib/hora.ts](src/lib/hora.ts): 和了と役の判定 (リーチ役、オープン立直の役満、抜きドラ、ドラ)
  - [src/lib/score.ts](src/lib/score.ts): 点数計算 (`horaBasePoint`, `horaPoint`, `tsumoPayments` など。人数とツモ精算方式に対応)
  - [src/lib/result.ts](src/lib/result.ts): 向聴・待ち・受け入れ (3麻で存在しない牌を除外)
  - [src/lib/input.ts](src/lib/input.ts): 入力の型、`allInputTiles`, `nukidoraTiles`, `effectiveRiichi`
  - [src/lib/store/](src/lib/store/): 状態管理 (reducer)、初期状態とプリセット、localStorage からの読み込み時の移行処理
  - [src/components/HandOptions.tsx](src/components/HandOptions.tsx), [TableSettings.tsx](src/components/TableSettings.tsx), [ui/RuleEditor.tsx](src/components/ui/RuleEditor.tsx): 設定 UI
  - [locales/](locales/): ja / en / zh-CN / ko の文言。**文言を追加するときは 4 言語すべてに追加する**
  - [src/lib/result.test.ts](src/lib/result.test.ts): 3麻とオープン立直のテスト

### 2-3. 開発時の注意

- `Rule` に項目を追加するときは、`compareRules` ([src/lib/rule.ts](src/lib/rule.ts)) と、[state.ts](src/lib/store/state.ts) にあるすべてのプリセットおよび `currentRule` も更新する。
- コミット時に husky が `npm run lint && npm test` を実行する。整形は `npx biome check --write` で直せる。
- 確認コマンド: `npm run lint` / `npx tsc -b` / `npm test` / `npm run build`

### 2-4. ルール解釈で判断した点 (オーナーから変更依頼があれば直す)

- 北家折半: 親ツモは子 2 人が各「基本点 × 3」、子ツモは親が「基本点 × 2.5」、子が「基本点 × 1.5」を払う (どちらも 100 点単位に切り上げ)
- 3麻の本場: 支払う人 1 人あたりの額で計算 (ロンは 2 人分)
- 三麻プリセットの細かい設定値は、各サービスのルールと厳密には照合していない

### 2-5. minipc 上での作業手順 (Claude が行う)

前提: Ubuntu / Debian 系。違う場合は読み替える。各段階の結果はオーナーに短く報告する。

1. **必要なツールを入れる**
   - 基本ツール: `sudo apt-get install -y git curl build-essential nginx rsync`
   - Node.js 22 以上 (LTS)。NodeSource か nvm で入れる。`node -v` で確認する
   - Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --target wasm32-unknown-unknown` を実行し、続けて `source ~/.cargo/env` と `cargo install wasm-pack` を実行する
2. **ビルドとテスト**
   ```sh
   cd ~/mahjong-calc
   npm ci
   npm run build:wasm
   npm run build
   npm test
   ```
3. **配信先へ配置する**: `sudo mkdir -p /var/www/mahjong-calc` を実行し、`dist/` の中身を `rsync -a --delete dist/ /var/www/mahjong-calc/` で配置する (所有者は配置用のユーザー、読み取りは nginx から可能にする)
4. **nginx を設定する**: `/etc/nginx/sites-available/mahjong-calc` を作り、`sites-enabled` にリンクする。要点は次のとおり。
   - `listen 127.0.0.1:8080;` とし、外部からは直接アクセスさせない (公開は Cloudflare Tunnel 経由のみ)
   - `root /var/www/mahjong-calc;` と `try_files $uri $uri/ /index.html;`
   - `.wasm` が `application/wasm` で返ること (`/etc/nginx/mime.types` に無ければ `types { application/wasm wasm; }` を追加する)
   - `index.html`, `sw.js`, `registerSW.js`, `manifest.webmanifest`, `app.webmanifest` には `Cache-Control: no-cache` を付ける (PWA の更新が届くようにするため)。`/assets/` はファイル名にハッシュが付くので `Cache-Control: public, max-age=31536000, immutable` を付ける
   - `sudo nginx -t` で確認してから `sudo systemctl reload nginx` を実行する
   - `curl -I http://127.0.0.1:8080/` と、`dist/assets/` 内の `.wasm` ファイルへのリクエストで 200 が返り、Content-Type が正しいことを確認する
5. **更新用スクリプトを作る**: リポジトリ内に `scripts/deploy.sh` を作る。中身は `git pull --ff-only`、`npm ci`、`npm run build:wasm`、`npm run build`、`npm test`、`rsync -a --delete dist/ /var/www/mahjong-calc/` の順で、`set -euo pipefail` を付ける。作ったらオーナーに確認してからコミットする。
6. **公開 URL を設定する**: リポジトリ直下に `.env.local` (git 管理外) を作り、`VITE_SITE_URL=https://<公開URL>` と書いてから再ビルドする。ビルド時に `og:url` と `og:image` が出力される ([plugins/site-url.ts](plugins/site-url.ts))。未設定ならこの 2 つは出力されない
   - ヘルプと About の GitHub リンクはこのリポジトリを指している
   - フッターなどにある上流と FluffyStuff へのクレジット・ライセンスのリンクは **残す** (MIT / CC BY のライセンス表示のため)
7. **Cloudflare Tunnel の確認**: トンネルの作成とトークン設定はオーナーが行う (1-4)。Claude は `systemctl status cloudflared` で動作を確認し、公開 URL に `curl -I https://<公開URL>/` を実行して 200 が返ることを確認する。トークンをチャットに出させない。
8. 完了したら、公開 URL、更新方法 (`scripts/deploy.sh` の実行) と、未解決の点をオーナーに報告する。

### 2-6. 対局ルームの API サーバー (develop ブランチで追加)

対局ルーム機能には API サーバー ([server/](server/)) が必要です。Node.js 24 の標準機能 (`node:http`, `node:sqlite`) だけで動き、npm の依存はありません。データは SQLite (`/data/rooms.db`) に保存されます。

- イメージ: リポジトリ直下で `docker build -f server/Dockerfile -t mahjong-calc-api .`
- 環境変数: `PORT` (既定 8787)、`DB_PATH` (既定 `/data/rooms.db`)
  - 以前の `ROOM_PASSWORD` (ルーム作成の共通合言葉) は廃止した。compose に残っていても無視されるので、消してよい
- ルームは誰でも作れる (同じ IP から1時間に10室まで)。参加にはルームコードと、作成者が決める数字4桁の合言葉が必要。合言葉は ID を混ぜた SHA-256 で保存し、同じ IP から同じルームへの間違いは10分に10回、ルーム全体で30回までで、超えるとしばらく受け付けない
- 合言葉の仕組みを入れる前に作られたルーム (合言葉なし) は、サーバー起動時に削除する (オーナー了承済み)
- フロントの nginx ([deploy/nginx.conf](deploy/nginx.conf)) が `/api/` をコンテナ名 `mahjong-calc-api` の 8787 番へ転送する。API コンテナが無くても nginx は起動し、`/api/` だけ 502 になる
- `~/docker/docker-compose.yml` に追加するサービスの例 (フロントのサービスと同じネットワークに置く):

  ```yaml
  mahjong-calc-api:
    build:
      context: /home/<user>/mahjong-calc
      dockerfile: server/Dockerfile
    container_name: mahjong-calc-api
    restart: unless-stopped
    volumes:
      - mahjong-calc-data:/data
  ```

  `volumes:` (トップレベル) に `mahjong-calc-data:` も追加する。データはこのボリュームにだけあるので、バックアップする場合は `/data/rooms.db` をコピーする
- `scripts/deploy.sh` はフロント (`mahjong-calc`) と API (`mahjong-calc-api`) の両方を作り直す。minipc では毎日 04:00 JST に systemd ユーザータイマー `mahjong-calc-deploy.timer` から実行される
- minipc ではデータを名前付きボリュームではなく `~/server/app_data/mahjong-calc/` (bind mount) に置いている
- 保存期間は無期限 (自動削除なし)。ルームを作った端末から削除できる

### 2-7. 参考: minipc を使わない選択肢

将来、minipc の運用が手間になった場合は、Cloudflare Pages に GitHub リポジトリをつなげば、push するたびに自動でビルド・公開できます。ただしビルド環境に Rust と wasm-pack が必要なので、ビルドコマンドの工夫が要ります。今回はオーナーの希望どおり minipc で公開します。
