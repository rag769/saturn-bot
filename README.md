# saturn-bot
土星さん Discord BOT

## 前提

この Bot プログラムは、次のサービス・アプリケーションを使用します。

### アプリケーション
* [Docker](https://www.docker.com/)

  BOTのプログラムを動かす環境。

### サービス
* [Discord (Developer)](https://discord.com/developers/applications) *required

  これが無いと始まらない  
  Discord Developer の登録と Bot の登録を行い、 Token を入手してください。

* [VoiceText Web API](https://cloud.voicetext.jp/webapi) *optional

  テキストチャンネルへの書き込みを読み上げる (Text To Speech) ために利用するサービスです。  
  この機能を利用する場合は、無料利用登録をして APIキー を入手してください。

* [Wit.ai](https://wit.ai/) *optional

  ボイスチャンネルの音声を書き起こす (Speech To Text) ために利用するサービスです。  
  この機能を利用する場合は、サイトで...あれ？どうするんやったっけ？とにかくトークンを入手してください()
---

## 使い方

### 初回のみ

1. Code -> Download ZIP でダウンロードして適当に展開

2. .env-example を .env にリネームして、前提で入手した各種トークンを設定

3. 必要であれば config.js でBOT呼出のPrefix、読み上げの音声の調整をして下さい。

4. 展開したディレクトリで Windows ターミナルを開いて `docker build . -t saturn-bot`

### 使う時

1. `docker run saturn-bot`

### 終る時
1. `docker ps -a` で IMAGE が "saturn-bot" の "CONTAINER ID" を確認
2. `docker stop 1で確認したCONTAINER ID`
