import type {LoadingLocale} from '@/constants/loadingMessages';

export type PaymentAllianceCopy = {
  moonstoneLabel: string;
  moonstones: (amount: string) => string;
  moonstoneValue: (divisor: number) => string;
};

const alliance: Record<LoadingLocale, PaymentAllianceCopy> = {
  "ko": {
    moonstoneLabel: "월정석으로 이용 시",
    moonstones: amount => "{amount} 월정석".replace('{amount}', amount),
    moonstoneValue: divisor => "영냥이에서는 월정석 가치가 꿀꿀운세의 1/{divisor}로 적용돼요.".replace('{divisor}', String(divisor)),
  },
  "en": {
    moonstoneLabel: "With Moonstone",
    moonstones: amount => "{amount} Moonstone".replace('{amount}', amount),
    moonstoneValue: divisor => "At Yeongnyangi, each Moonstone has 1/{divisor} of its Ggulggul Fortune value.".replace('{divisor}', String(divisor)),
  },
  "ja": {
    moonstoneLabel: "月精石で利用する場合",
    moonstones: amount => "{amount} 月精石".replace('{amount}', amount),
    moonstoneValue: divisor => "ヨンニャンイでの月精石の価値は、クルクル運勢の1/{divisor}です。".replace('{divisor}', String(divisor)),
  },
  "zh-CN": {
    moonstoneLabel: "使用月精石",
    moonstones: amount => "{amount} 月精石".replace('{amount}', amount),
    moonstoneValue: divisor => "在灵猫，月精石的使用价值为咕噜运势的1/{divisor}。".replace('{divisor}', String(divisor)),
  },
  "zh-TW": {
    moonstoneLabel: "使用月精石",
    moonstones: amount => "{amount} 月精石".replace('{amount}', amount),
    moonstoneValue: divisor => "在靈貓，月精石的使用價值為咕嚕運勢的1/{divisor}。".replace('{divisor}', String(divisor)),
  },
  "vi": {
    moonstoneLabel: "Khi dùng Nguyệt thạch",
    moonstones: amount => "{amount} Nguyệt thạch".replace('{amount}', amount),
    moonstoneValue: divisor => "Tại Yeongnyangi, Nguyệt thạch có giá trị bằng 1/{divisor} so với Ggulggul Fortune.".replace('{divisor}', String(divisor)),
  },
  "hi": {
    moonstoneLabel: "मूनस्टोन से",
    moonstones: amount => "{amount} मूनस्टोन".replace('{amount}', amount),
    moonstoneValue: divisor => "येओंगन्यांगी में मूनस्टोन की कीमत Ggulggul Fortune के मूल्य की 1/{divisor} है।".replace('{divisor}', String(divisor)),
  },
  "es": {
    moonstoneLabel: "Con Piedras Lunares",
    moonstones: amount => "{amount} Piedras Lunares".replace('{amount}', amount),
    moonstoneValue: divisor => "En Yeongnyangi, cada Piedra Lunar tiene 1/{divisor} de su valor en Ggulggul Fortune.".replace('{divisor}', String(divisor)),
  },
  "fr": {
    moonstoneLabel: "Avec les Pierres de Lune",
    moonstones: amount => "{amount} Pierres de Lune".replace('{amount}', amount),
    moonstoneValue: divisor => "Chez Yeongnyangi, une Pierre de Lune vaut 1/{divisor} de sa valeur chez Ggulggul Fortune.".replace('{divisor}', String(divisor)),
  },
  "de": {
    moonstoneLabel: "Mit Mondsteinen",
    moonstones: amount => "{amount} Mondsteine".replace('{amount}', amount),
    moonstoneValue: divisor => "Bei Yeongnyangi hat jeder Mondstein 1/{divisor} seines Wertes bei Ggulggul Fortune.".replace('{divisor}', String(divisor)),
  },
  "nl": {
    moonstoneLabel: "Met Maanstenen",
    moonstones: amount => "{amount} Maanstenen".replace('{amount}', amount),
    moonstoneValue: divisor => "Bij Yeongnyangi heeft elke Maansteen 1/{divisor} van de waarde bij Ggulggul Fortune.".replace('{divisor}', String(divisor)),
  },
  "ms": {
    moonstoneLabel: "Dengan Batu Bulan",
    moonstones: amount => "{amount} Batu Bulan".replace('{amount}', amount),
    moonstoneValue: divisor => "Di Yeongnyangi, setiap Batu Bulan bernilai 1/{divisor} daripada nilainya di Ggulggul Fortune.".replace('{divisor}', String(divisor)),
  },
};

export const paymentAllianceCopy = (locale: LoadingLocale): PaymentAllianceCopy => alliance[locale] || alliance.en;
