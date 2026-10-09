import type {LoadingLocale} from '@/constants/loadingMessages';

export type PaymentAllianceCopy = {
  title: string;
  story: string;
  imageAlt: string;
  moonstoneLabel: string;
  moonstones: (amount: string) => string;
  moonstoneValue: (divisor: number) => string;
};

const alliance: Record<LoadingLocale, PaymentAllianceCopy> = {
  "ko": {
    title: "연이가 이어 준 달빛",
    story: "연이가 영냥이 앞에 좋아하는 생선을 살포시 놓았어. “우리 손님들 월정석도 받아 줄래?” 영냥이는 생선을 한 번, 연이를 한 번 보더니… “좋아. 대신 생선값으로 셈할 거다냥!” 그렇게 월정석 제휴가 시작됐지.",
    imageAlt: "따뜻한 차를 사이에 두고 제휴를 약속하는 꽃돼지 연이와 영냥이",
    moonstoneLabel: "월정석으로 이용 시",
    moonstones: amount => "{amount} 월정석".replace('{amount}', amount),
    moonstoneValue: divisor => "영냥이에서는 월정석 가치가 꿀꿀 사주의 1/{divisor}로 적용돼요.".replace('{divisor}', String(divisor)),
  },
  "en": {
    title: "A little alliance, thanks to Yeoni",
    story: "Yeoni set Yeongnyangi’s favorite fish on the table. “Could you accept our guests’ Moonlight Stone too?” One look at the fish, one look at Yeoni… “All right. But I’ll count in fish!” That is how this Moonlight Stone alliance began.",
    imageAlt: "Yeoni the flower pig and Yeongnyangi agree to their alliance over tea",
    moonstoneLabel: "With Moonlight Stone",
    moonstones: amount => "{amount} Moonlight Stone".replace('{amount}', amount),
    moonstoneValue: divisor => "At Yeongnyangi, each Moonlight Stone has 1/{divisor} of its Ggulggul Fortune value.".replace('{divisor}', String(divisor)),
  },
  "ja": {
    title: "ヨニがつないだ小さな提携",
    story: "ヨニがヨンニャンイの大好物の魚をそっと差し出した。「お客さんの月精石も受け取ってくれる？」魚をちらり、ヨニをちらり…「いいよ。でも魚の値段で計算するニャ！」こうして提携が始まったよ。",
    imageAlt: "お茶を囲んで提携を約束する花豚ヨニとヨンニャンイ",
    moonstoneLabel: "月精石で利用する場合",
    moonstones: amount => "{amount} 月精石".replace('{amount}', amount),
    moonstoneValue: divisor => "ヨンニャンイでの月精石の価値は、クルクル運勢の1/{divisor}です。".replace('{divisor}', String(divisor)),
  },
  "zh-CN": {
    title: "妍伊牵起的小小合作",
    story: "妍伊悄悄摆上灵猫最爱的鱼。“客人的月精石也收下，好不好？”灵猫看看鱼，又看看妍伊……“好吧，不过要按鱼价算喵！”月精石合作就这样开始了。",
    imageAlt: "花猪妍伊和灵猫围着暖茶约定合作",
    moonstoneLabel: "使用月精石",
    moonstones: amount => "{amount} 月精石".replace('{amount}', amount),
    moonstoneValue: divisor => "在灵猫，月精石的使用价值为咕噜运势的1/{divisor}。".replace('{divisor}', String(divisor)),
  },
  "zh-TW": {
    title: "妍伊牽起的小小合作",
    story: "妍伊輕輕擺上靈貓最愛的魚。「客人的月精石也收下，好不好？」靈貓看看魚，又看看妍伊……「好吧，不過要按魚價算喵！」月精石合作就這樣開始了。",
    imageAlt: "花豬妍伊和靈貓圍著暖茶約定合作",
    moonstoneLabel: "使用月精石",
    moonstones: amount => "{amount} 月精石".replace('{amount}', amount),
    moonstoneValue: divisor => "在靈貓，月精石的使用價值為咕嚕運勢的1/{divisor}。".replace('{divisor}', String(divisor)),
  },
  "vi": {
    title: "Một sự hợp tác nhờ Yeoni",
    story: "Yeoni đặt món cá yêu thích trước mặt Yeongnyangi. “Nhận cả Nguyệt thạch của khách nhé?” Nhìn cá, rồi nhìn Yeoni… “Được thôi, nhưng tính theo giá cá nhé!” Sự hợp tác bắt đầu như thế.",
    imageAlt: "Heo hoa Yeoni và Yeongnyangi cùng uống trà và đồng ý hợp tác",
    moonstoneLabel: "Khi dùng Nguyệt thạch",
    moonstones: amount => "{amount} Nguyệt thạch".replace('{amount}', amount),
    moonstoneValue: divisor => "Tại Yeongnyangi, Nguyệt thạch có giá trị bằng 1/{divisor} so với Ggulggul Fortune.".replace('{divisor}', String(divisor)),
  },
  "hi": {
    title: "येओनी ने मिलाए दो साथी",
    story: "येओनी ने पसंदीदा मछली सामने रखी। “हमारे मेहमानों के मूनलाइट स्टोन भी लोगी?” येओंगन्यांगी ने मछली देखी, फिर येओनी को… “ठीक है, पर हिसाब मछली के दाम से होगा, म्याऊँ!” साझेदारी ऐसे शुरू हुई।",
    imageAlt: "फूलों वाली पिग येओनी और येओंगन्यांगी चाय पर साझेदारी तय करते हुए",
    moonstoneLabel: "मूनलाइट स्टोन से",
    moonstones: amount => "{amount} मूनलाइट स्टोन".replace('{amount}', amount),
    moonstoneValue: divisor => "येओंगन्यांगी में मूनलाइट स्टोन की कीमत Ggulggul Fortune के मूल्य की 1/{divisor} है।".replace('{divisor}', String(divisor)),
  },
  "es": {
    title: "Una alianza gracias a Yeoni",
    story: "Yeoni le llevó su pescado favorito. “¿Aceptarías también las Piedras Lunares de nuestros visitantes?” Yeongnyangi miró el pescado y luego a Yeoni… “Vale, ¡pero haré las cuentas en pescado!” Así nació la alianza.",
    imageAlt: "Yeoni, la cerdita con flores, y Yeongnyangi acuerdan su alianza tomando té",
    moonstoneLabel: "Con Piedras Lunares",
    moonstones: amount => "{amount} Piedras Lunares".replace('{amount}', amount),
    moonstoneValue: divisor => "En Yeongnyangi, cada Piedra Lunar tiene 1/{divisor} de su valor en Ggulggul Fortune.".replace('{divisor}', String(divisor)),
  },
  "fr": {
    title: "Une alliance grâce à Yeoni",
    story: "Yeoni a posé son poisson préféré devant Yeongnyangi. « Tu accepterais aussi les Pierres de Lune de nos visiteurs ? » Un regard au poisson, un autre à Yeoni… « D’accord, mais je compte en poissons ! » Ainsi est née l’alliance.",
    imageAlt: "Yeoni, la petite cochonne fleurie, et Yeongnyangi concluent leur alliance autour du thé",
    moonstoneLabel: "Avec les Pierres de Lune",
    moonstones: amount => "{amount} Pierres de Lune".replace('{amount}', amount),
    moonstoneValue: divisor => "Chez Yeongnyangi, une Pierre de Lune vaut 1/{divisor} de sa valeur chez Ggulggul Fortune.".replace('{divisor}', String(divisor)),
  },
  "de": {
    title: "Ein Bündnis dank Yeoni",
    story: "Yeoni stellte Yeongnyangi den Lieblingsfisch hin. „Nimmst du auch die Mondsteine unserer Gäste?“ Ein Blick zum Fisch, einer zu Yeoni … „Gut. Aber ich rechne in Fisch!“ So begann das Bündnis.",
    imageAlt: "Blumenschwein Yeoni und Yeongnyangi vereinbaren bei einer Tasse Tee ihr Bündnis",
    moonstoneLabel: "Mit Mondsteinen",
    moonstones: amount => "{amount} Mondsteine".replace('{amount}', amount),
    moonstoneValue: divisor => "Bei Yeongnyangi hat jeder Mondstein 1/{divisor} seines Wertes bei Ggulggul Fortune.".replace('{divisor}', String(divisor)),
  },
  "nl": {
    title: "Een samenwerking dankzij Yeoni",
    story: "Yeoni zette de lievelingsvis voor Yeongnyangi neer. “Neem je ook de Maanstenen van onze bezoekers aan?” Een blik naar de vis, een naar Yeoni… “Goed, maar ik reken in vis!” Zo begon de samenwerking.",
    imageAlt: "Bloemenvarkentje Yeoni en Yeongnyangi spreken bij de thee hun samenwerking af",
    moonstoneLabel: "Met Maanstenen",
    moonstones: amount => "{amount} Maanstenen".replace('{amount}', amount),
    moonstoneValue: divisor => "Bij Yeongnyangi heeft elke Maansteen 1/{divisor} van de waarde bij Ggulggul Fortune.".replace('{divisor}', String(divisor)),
  },
  "ms": {
    title: "Kerjasama berkat Yeoni",
    story: "Yeoni menghidangkan ikan kegemaran Yeongnyangi. “Terima Batu Bulan tetamu kami juga?” Pandang ikan, pandang Yeoni… “Baiklah, tapi kira ikut harga ikan, ya!” Begitulah kerjasama ini bermula.",
    imageAlt: "Yeoni si anak khinzir berbunga dan Yeongnyangi bersetuju bekerjasama sambil minum teh",
    moonstoneLabel: "Dengan Batu Bulan",
    moonstones: amount => "{amount} Batu Bulan".replace('{amount}', amount),
    moonstoneValue: divisor => "Di Yeongnyangi, setiap Batu Bulan bernilai 1/{divisor} daripada nilainya di Ggulggul Fortune.".replace('{divisor}', String(divisor)),
  },
};

export const paymentAllianceCopy = (locale: LoadingLocale): PaymentAllianceCopy => alliance[locale] || alliance.en;
