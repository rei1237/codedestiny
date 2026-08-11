import Link from "next/link";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import { OPERATOR_NAME, SUPPORT_EMAIL } from "../../../lib/site-policy-config";

const TOKUSHOHO_ROWS = [
  { label: "販売事業者名", value: `${OPERATOR_NAME}（コード デスティニー）` },
  { label: "運営統括責任者", value: "朴炳夏（パク・ビョンハ）" },
  { label: "所在地", value: "大韓民国 京畿道 華城市 孝行区 飛鳳面 セビボンドン路 37, 101棟 1207号" },
  { label: "電話番号", value: "+82-50-6664-7398（受付時間内にお問い合わせください）" },
  { label: "メールアドレス", value: SUPPORT_EMAIL },
  { label: "事業者登録番号（韓国）", value: "372-23-02329" },
  { label: "通信販売業申告番号（韓国）", value: "第2026-火城湖-0264号" },
  { label: "販売価格", value: "各サービス画面に表示された金額（すべて大韓民国ウォン建て、付加価値税等込み）" },
  { label: "商品代金以外に必要な料金", value: "なし（利用者側のインターネット接続料金・通信費を除く）" },
  { label: "支払方法", value: "クレジットカード決済（決済代行: PortOne / KG Inicis）" },
  { label: "支払時期", value: "注文確定と同時に即時決済" },
  { label: "商品の引渡時期", value: "決済承認完了後、直ちにデジタルコンテンツとして提供" },
  { label: "返品・交換について", value: "デジタルコンテンツの性質上、提供が開始された部分については返品が制限される場合があります。詳細は返金ポリシーをご覧ください。" },
  { label: "キャンセルについて", value: "決済完了前はいつでもキャンセルできます。決済完了後、提供が開始される前であればカスタマーサポートまでご連絡ください。" },
  { label: "動作環境", value: "最新版のモダンブラウザ（Chrome、Safari、Edge等）" },
];

export function generateMetadata() {
  return generatePageMetadata({
    path: "/ja/tokushoho",
    title: "特定商取引法に基づく表記 | Code Destiny",
    description: "Code Destinyの特定商取引法に基づく表記ページです。事業者情報、販売価格、支払方法、支払時期、商品の引渡時期、返品・キャンセルに関する特約など、法令が定める必須項目をまとめて掲載しています。",
    inLanguage: "ja-JP",
  });
}

export default function TokushohoPage() {
  return (
    <main className="policy-doc" lang="ja">
      <header className="policy-doc__head">
        <h1 className="policy-doc__title">特定商取引法に基づく表記</h1>
        <p className="policy-doc__lede">
          本サービスは大韓民国の事業者が運営しており、決済処理は大韓民国ウォン建てで行われます。本ページは日本語話者への情報提供、および将来の日本向けサービス提供に備えた表記として、特定商取引法が定める項目に沿って作成しています。
        </p>
        <p className="policy-doc__note policy-doc__note--lead">
          本ページは参考用の機械補助翻訳・準備資料であり、日本の弁護士による法的レビューを経ていません。実際の日本向けサービス提供開始前に、専門家によるレビューを受ける必要があります。
        </p>
      </header>

      <div className="policy-doc__layout">
        <div className="policy-doc__body">
          <div className="policy-embed-body">
            <section className="policy-embed-section">
              {TOKUSHOHO_ROWS.map((row) => (
                <p key={row.label}>
                  <strong>{row.label}</strong>
                  <br />
                  {row.value}
                </p>
              ))}
            </section>
          </div>

          <nav className="policy-doc__related" aria-label="関連文書">
            <Link className="policy-doc__toc-link" href="/ja/terms-of-service">
              利用規約
            </Link>
            <Link className="policy-doc__toc-link" href="/ja/refund-policy">
              返金ポリシー
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}
