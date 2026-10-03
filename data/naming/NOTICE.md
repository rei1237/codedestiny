# 작명 데이터 출처·라이선스

`data/naming/raw/` 원천, 이를 가공한 `worker/naming-engine/data/*.v1.json`, 검수용 `data/naming/review/*.csv` 의 출처와 지켜야 할 조건이다.
생성물은 `scripts/naming/build-naming-data.mjs` 가 만든다. 각 JSON 의 `dataVersion` 은 입력 파일과 빌드 스크립트의 해시이고, 원천별 상류 sha256 은 `raw/manifest.json` 에 있다.
`rules/*.json` 은 출처를 대조해 이 프로젝트가 내린 판정이다(외부 저작물 아님).

## 1. 출처별 조건

| raw 파일 | 출처 | 조건 | 생성물에서 쓰는 곳 |
|---|---|---|---|
| `unihan-extract.tsv` | Unicode 18.0.0 Unihan (`Unihan.zip`) | Unicode License v3 — 이 고지문을 사본 또는 문서에 둔다(§2) | 부수·잔여획·총획 → `radical`·`won`·`pil`, `kHangul` E/N → 풀 포함 근거 |
| `libhangul-hanja-single.txt` | libhangul `data/hanja/hanja.txt` @717409c | BSD-3-Clause — 파일 머리의 고지문을 보존하고, 바이너리 배포 때는 문서에 재현한다(§3) | `readings[][2]` 훈 |
| `rutopio-data-gov.csv` | rutopio/Korean-Name-Hanja-Charset @12df1ba (대법원 인명용 한자 조회 2024 크롤) | MIT — 사본에 고지문을 포함한다(§4) | 풀 포함 근거(`basis: crawl`), 지정음·두음 |
| `efamily-recrawl.csv` | 대법원 전자가족관계등록시스템 인명용 한자 조회, 2026-10-03 자체 재수집 | 공공 조회 결과의 사실 정보(음·코드·유형)만 보관, 훈 문장 미수록 | 풀 포함 근거(`basis: efamily`), 크롤 누락 음 보충 |
| `kosis-surnames-2015.csv` | KOSIS 「인구총조사」 DT_1IN15SD | KOSIS 이용지침 — 상업적 이용·재배포 허용, 출처 명시, 임의 변경 금지(§5) | `surnames.v1.json` |
| `suri-81-sources.json` | 성명학 81수리 길흉표 10곳(URL 은 파일 안) | 수별 길흉 라벨(사실)만 발췌, 해설 본문 미수록 | `suri-81.v1.json` |
| `samjae-125-sources.json` | 삼재 125조합 길흉표 9곳(URL 은 파일 안) | 조합별 길흉 라벨(사실)만 발췌, 해설 본문 미수록 | `samjae-125.v1.json` |
| `buryong-sources.json` | 작명 실무 불용한자 목록 7곳 + 권익기·김만태(2018) | 글자 목록과 출처 id 만, 사유 문장 미수록 | 풀 `cautions` `["buryong", 출처색인]`(경고 전용) |
| `jawon-sources.json` | 자원오행 부수·자의 규칙 16곳(URL 은 파일 안) | 부수·글자 → 오행 배속(사실)만 발췌, 원문 문장 미수록 | 풀 `jawon`·`jawonBasis`·`confidence` |

사실 정보만 발췌한 출처(81수리·삼재·불용·자원오행·efamily)는 표현이 아닌 사실이라는 판단으로 보관했다. 이 판단은 법률 자문을 거치지 않았다.
해설 문장이 필요하면 새로 쓰고, 출처 문장을 옮기지 않는다.

## 2. Unicode License v3 (Unihan)

```
UNICODE LICENSE V3

COPYRIGHT AND PERMISSION NOTICE

Copyright © 1991-2026 Unicode, Inc.

NOTICE TO USER: Carefully read the following legal agreement. BY
DOWNLOADING, INSTALLING, COPYING OR OTHERWISE USING DATA FILES, AND/OR
SOFTWARE, YOU UNEQUIVOCALLY ACCEPT, AND AGREE TO BE BOUND BY, ALL OF THE
TERMS AND CONDITIONS OF THIS AGREEMENT. IF YOU DO NOT AGREE, DO NOT
DOWNLOAD, INSTALL, COPY, DISTRIBUTE OR USE THE DATA FILES OR SOFTWARE.

Permission is hereby granted, free of charge, to any person obtaining a
copy of data files and any associated documentation (the "Data Files") or
software and any associated documentation (the "Software") to deal in the
Data Files or Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, and/or sell
copies of the Data Files or Software, and to permit persons to whom the
Data Files or Software are furnished to do so, provided that either (a)
this copyright and permission notice appear with all copies of the Data
Files or Software, or (b) this copyright and permission notice appear in
associated Documentation.

THE DATA FILES AND SOFTWARE ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF
THIRD PARTY RIGHTS.

IN NO EVENT SHALL THE COPYRIGHT HOLDER OR HOLDERS INCLUDED IN THIS NOTICE
BE LIABLE FOR ANY CLAIM, OR ANY SPECIAL INDIRECT OR CONSEQUENTIAL DAMAGES,
OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THE DATA
FILES OR SOFTWARE.

Except as contained in this notice, the name of a copyright holder shall
not be used in advertising or otherwise to promote the sale, use or other
dealings in these Data Files or Software without prior written
authorization of the copyright holder.
```

## 3. libhangul (BSD-3-Clause)

`raw/libhangul-hanja-single.txt` 머리에 원문 고지가 그대로 있다.

```
Copyright (c) 2005,2006 Choe Hwanjin
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
3. Neither the name of the author nor the names of its contributors
   may be used to endorse or promote products derived from this software
   without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
```

발췌 범위: 한 글자 표제 가운데 대상 글자만(`scripts/naming/extract-raw.mjs`).

## 4. rutopio/Korean-Name-Hanja-Charset (MIT)

```
Copyright (c) 2024 ChingRu (rutopio@github)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## 5. KOSIS 성씨 인구

인용 문구: 국가데이터처, 「인구총조사」, 2015, 성씨ㆍ본관별 인구(5인 이상) - 전국, 2026.10.03 참조

화면에 성씨 인구를 보일 때 이 인용 문구를 함께 표시한다.
가공 내용은 두 가지다. 한자 표기는 NFC 로 정규화했고, 간체·판독 불가 표기 등 24성은 제외했다(`review/surnames-review.csv`). 인구 수치는 바꾸지 않았다.
5인 미만 성씨는 원표에 없다.
