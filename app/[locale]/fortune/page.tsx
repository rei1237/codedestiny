import Link from "next/link";
import { notFound } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";
import { FORTUNE_PERIOD_IDS } from "@/lib/fortune/periods";
import { fortuneLocaleSegment as prefix, FORTUNE_COPY, normalizeFortuneLocale, periodLabel, type FortuneLocale } from "@/lib/fortune/localization";

const READING_GUIDE = {
  "en": {
    "intro": "Choose the time span that matches your question, then choose a Western zodiac sign or Chinese zodiac animal. You can read without entering birth details. These are shared symbolic readings, not a personal birth chart.",
    "periods": [
      "Today: review the displayed reference date, calendar inputs and score breakdown before choosing one practical action.",
      "Tomorrow: use the next reference date to prepare a question or check a plan. A different score does not establish that an event will turn out differently.",
      "This week: compare the seven-day table. Keep real deadlines and other people’s availability ahead of any suggested timing.",
      "This month: look at the calendar intervals and turning points together. A monthly theme is not a prediction for every day in that month."
    ],
    "heading": "Choose a sign without mixing the systems",
    "body": "Western zodiac pages group readers by sun sign; Chinese zodiac pages group them by the birth-year branch. A birthday near a sign boundary, or a birth near the beginning of spring, may require a more precise calendar check. Neither group includes your full date, time and place of birth. Two matching readings are not independent evidence that an event will happen.",
    "exampleHeading": "Turn a reading into a useful question",
    "example": "If a reading mentions communication while you are preparing for a meeting, write down the point you need to clarify and who can answer it. Afterwards, record what actually happened, including what did not match the reading. Do not postpone a necessary conversation just because a score is low.",
    "limits": "How the readings are made",
    "notice": "Calendar facts and score rules are shown separately on each reading. Advice is selected from prewritten passages, so text can recur across dates or signs. Scores express the service’s symbolic interpretation; they are not probabilities, diagnoses or investment forecasts. The date printed on a page is its reference date. Check it before treating the reading as current.",
    "links": "For a question tied to your own circumstances, start with the service guides below and check the required inputs and limits."
  },
  "ja": {
    "intro": "知りたい期間を選んだあと、星座または生肖を選びます。生年月日を入力せずに読める共通の象徴的な解釈であり、個人の出生図ではありません。",
    "periods": [
      "今日：表示された基準日、暦の値、スコアの内訳を確認し、実行できる行動を一つ考えます。",
      "明日：翌日の基準値を使い、予定や確認したい質問を準備します。点数の違いは出来事の結果を保証しません。",
      "今週：7日間の表を比較します。実際の締切や相手の都合を、象徴的な日取りより優先してください。",
      "今月：節気などの区間と転換点を合わせて読みます。月のテーマが毎日に当てはまるとは限りません。"
    ],
    "heading": "星座と生肖の基準を分けて選ぶ",
    "body": "西洋の星座は太陽の位置、生肖は出生年の地支を基準に分類します。星座の境界日や立春前後の誕生日では、より詳しい暦の確認が必要です。この共通ページには出生時刻や出生地などの個人情報を反映していません。二つの結果が似ていても、予測が実証されたことにはなりません。",
    "exampleHeading": "解釈を確認できる質問に変える",
    "example": "会議の準備中に「対話」という言葉が出たら、何を誰に確認するかを書き出します。会議後は解釈に合ったことだけでなく、合わなかったことも記録してください。点数が低いという理由だけで必要な話し合いを延期しないようにします。",
    "limits": "文章とスコアの作り方",
    "notice": "各ページでは暦の値とスコアの規則を分けて表示します。助言は事前に作成した文章から選ぶため、日付や星座が違っても同じ文が出る場合があります。点数は当サービスの象徴的な解釈であり、確率、診断、投資予測ではありません。ページに表示される日付が基準日です。今日の情報として使う前に確認してください。",
    "links": "ご自身の具体的な質問を整理するときは、下のサービス案内で必要な入力情報と解釈の限界を確認できます。"
  },
  "zh-CN": {
    "intro": "先选择与你的问题相符的期间，再选择西方星座或生肖。无需输入出生资料即可阅读，但这是多人共用的象征解读，不是个人出生盘。",
    "periods": [
      "今日：先核对页面的基准日期、历法数据和评分依据，再想一件可以执行的小事。",
      "明日：以次日为基准，准备需要核对的计划或问题。评分改变不代表事件结果一定改变。",
      "本周：比较七日表格。真实的截止日期和他人的安排，应优先于象征性的择日建议。",
      "本月：结合节气区间与转折点阅读。一个月的主题并不等于每天都会发生的事情。"
    ],
    "heading": "区分星座和生肖的分类依据",
    "body": "西方星座按太阳位置分类，生肖按出生年的地支分类。生日接近星座交界或立春时，可能需要更精确的历法核对。这里的共用解读没有包含完整的出生日期、时间和地点。两种解读相似，也不能当作预测已经得到验证。",
    "exampleHeading": "把解读变成可核对的问题",
    "example": "例如准备会议时看到“沟通”的建议，可以写下要确认的事项和能够回答的人。会后记录实际发生的情况，也保留与解读不符的部分。不要只因为评分较低，就推迟必要的谈话。",
    "limits": "文章与评分如何产生",
    "notice": "每篇解读分别展示历法数据与评分规则。生活建议从预先编写的文案中选择，因此不同日期或星座可能出现相同段落。评分代表本服务的象征解释，不是事件概率、医学诊断或投资预测。页面显示的日期是解读基准日，使用前应先确认是否适合当前的问题。",
    "links": "如果问题涉及个人实际情况，可先阅读以下服务说明，核对需要输入的资料和解读的适用范围。"
  },
  "zh-TW": {
    "intro": "先選擇與你的問題相符的期間，再選擇西方星座或生肖。無須輸入出生資料即可閱讀，但這是多人共用的象徵解讀，不是個人出生盤。",
    "periods": [
      "今日：先核對頁面的基準日期、曆法資料和評分依據，再想一件可以執行的小事。",
      "明日：以次日為基準，準備需要核對的計畫或問題。評分改變不代表事件結果一定改變。",
      "本週：比較七日表格。真實的截止日期和他人的安排，應優先於象徵性的擇日建議。",
      "本月：結合節氣區間與轉折點閱讀。一個月的主題不等於每天都會發生的事情。"
    ],
    "heading": "區分星座和生肖的分類依據",
    "body": "西方星座依太陽位置分類，生肖依出生年的地支分類。生日接近星座交界或立春時，可能需要更精確的曆法核對。這裡的共用解讀沒有包含完整的出生日期、時間和地點。兩種解讀相似，也不能當作預測已經獲得驗證。",
    "exampleHeading": "把解讀變成可核對的問題",
    "example": "例如準備會議時看到「溝通」的建議，可以寫下要確認的事項和能夠回答的人。會後記錄實際發生的情況，也保留與解讀不符的部分。不要只因為評分較低，就延後必要的談話。",
    "limits": "文章與評分如何產生",
    "notice": "每篇解讀分別展示曆法資料與評分規則。生活建議從預先編寫的文案中選擇，因此不同日期或星座可能出現相同段落。評分代表本服務的象徵解釋，不是事件機率、醫學診斷或投資預測。頁面顯示的日期是解讀基準日，使用前應先確認是否適合目前的問題。",
    "links": "如果問題涉及個人實際情況，可先閱讀以下服務說明，核對需要輸入的資料和解讀的適用範圍。"
  }
};

export const dynamicParams = false;
const LOCALES = ["en", "ja", "zh", "zh-tw"];
function resolveLocale(value: string): FortuneLocale | null { return LOCALES.includes(value) ? normalizeFortuneLocale(value === "zh" ? "zh-CN" : value === "zh-tw" ? "zh-TW" : value) : null; }
export function generateStaticParams() { return LOCALES.map((locale) => ({ locale })); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = resolveLocale(localeParam);
  if (!locale) return {};
  const base = "/fortune";
  const title = locale === "en" ? "Fortune by period" : locale === "ja" ? "期間別運勢" : locale === "zh-CN" ? "按期间查看运势" : "依期間查看運勢";
  const description = locale === "en" ? "Choose today, tomorrow, this week or this month, then compare overall, love, money, health and work guidance for all 12 zodiac and 12 Chinese zodiac signs. Each reading also shows its calculated pillars, solar terms and lunar evidence." : locale === "ja" ? "今日・明日・今週・今月から期間を選び、12星座と12生肖それぞれの総合運・恋愛運・金運・健康運・仕事運を確認できます。日柱・月柱・節気・月の位置から導いた計算根拠もあわせて表示します。" : locale === "zh-CN" ? "从今日、明日、本周或本月中选择期间，查看12星座与12生肖的综合运、感情运、财运、健康运和事业运。页面同时展示根据日柱、月柱、节气与月亮位置计算出的参考依据。" : "從今日、明日、本週或本月中選擇期間，查看12星座與12生肖的綜合運、感情運、財運、健康運和事業運。頁面同時展示根據日柱、月柱、節氣與月亮位置計算出的參考依據。";
  return buildSeoMetadata({ path: `/${prefix(locale)}${base}`, title: `${title} | Code Destiny`, description, keywords: [title, FORTUNE_COPY[locale].zodiac, FORTUNE_COPY[locale].animal], locale, hreflang: { ko: base, "x-default": base, en: `/en${base}`, ja: `/ja${base}`, "zh-CN": `/zh${base}`, "zh-TW": `/zh-tw${base}` } });
}

export default async function LocalizedFortuneIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = resolveLocale(localeParam);
  if (!locale) notFound();
  const base = `/${prefix(locale)}/fortune`;
  const guide = READING_GUIDE[locale as keyof typeof READING_GUIDE];
  return (
    <main className="min-h-screen px-4 py-12" style={{ background: "var(--cd-bg)", color: "var(--cd-text)" }}>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">{FORTUNE_COPY[locale].fortune}</h1>
        <p className="mt-5 text-base leading-8">{guide.intro}</p>
        <ul className="mt-8 space-y-5">
          {FORTUNE_PERIOD_IDS.map((period, index) => (
            <li key={period}>
              <Link href={`${base}/${period}/`} className="inline-flex min-h-[44px] items-center font-bold underline underline-offset-4">{periodLabel(period, locale)} {FORTUNE_COPY[locale].fortune}</Link>
              <p className="text-sm leading-7">{guide.periods[index]}</p>
            </li>
          ))}
        </ul>
        <h2 className="mt-10 text-xl font-bold">{guide.heading}</h2>
        <p className="mt-4 leading-8">{guide.body}</p>
        <h2 className="mt-10 text-xl font-bold">{guide.exampleHeading}</h2>
        <p className="mt-4 leading-8">{guide.example}</p>
        <h2 className="mt-10 text-xl font-bold">{guide.limits}</h2>
        <p className="mt-4 leading-8">{guide.notice}</p>
        <p className="mt-6 leading-8">{guide.links}</p>
        <nav className="mt-4 flex flex-wrap gap-x-6 gap-y-2" aria-label={guide.heading}>
          <Link href={`/${prefix(locale)}/saju/`} className="inline-flex min-h-[44px] items-center underline underline-offset-4">{locale === "en" ? "Saju guide" : locale === "ja" ? "四柱推命の案内" : "四柱命理指南"}</Link>
          <Link href={`/${prefix(locale)}/today/`} className="inline-flex min-h-[44px] items-center underline underline-offset-4">{FORTUNE_COPY[locale].today}</Link>
        </nav>
      </div>
    </main>
  );
}
