"""Rebuild locally with fonttools==4.59.0 and Brotli==1.1.0.

Fetch the full variable WOFF2 from PRETENDARD_URL to a temporary location, then
run python scripts/font-subsets/build-home-fonts.py <downloaded-woff2>.
The production build uses the checked-in assets and requires no Python/network.
"""
import hashlib
import sys
from io import BytesIO
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / "public/assets/fonts/home"
PRETENDARD_URL = ("https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/"
                  "packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2")


def css_ranges(codes):
    spans = []
    for code in sorted(codes):
        if spans and spans[-1][1] + 1 == code:
            spans[-1][1] = code
        else:
            spans.append([code, code])
    return ",".join(f"U+{start:X}" if start == end else f"U+{start:X}-{end:X}" for start, end in spans)


def build(source, expected_sha, face, nickname, css_weight, characters=None):
    if hashlib.sha256(source.read_bytes()).hexdigest() != expected_sha:
        raise ValueError(f"Original font digest mismatch: {source}")
    font = TTFont(source, recalcTimestamp=False)
    if characters is None:
        characters = map(ord, (HERE / (nickname.lower() + ".txt")).read_text(encoding="utf-8"))
    codes = set(characters) & font.getBestCmap().keys()
    options = subset.Options()
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.layout_features = ["*"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=codes)
    subsetter.subset(font)

    # The OFL reserves Pretendard. Keep attribution and license records, but use
    # distinct family, full, unique and PostScript names for these derivatives.
    internal = "Code Destiny Home " + nickname
    ps_name = internal.replace(" ", "")
    names = {1: internal, 3: ps_name + "-HomeSubset", 4: internal, 6: ps_name,
             16: internal, 18: internal, 21: internal, 25: ps_name}
    for record in font["name"].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
    if "fvar" in font:
        for instance in font["fvar"].instances:
            if instance.postscriptNameID != 0xFFFF:
                style = font["name"].getDebugName(instance.subfamilyNameID)
                for record in font["name"].names:
                    if record.nameID == instance.postscriptNameID:
                        record.string = (ps_name + "-" + style.replace(" ", "")).encode(record.getEncoding())
    font.flavor = "woff2"
    buffer = BytesIO()
    font.save(buffer)
    data = buffer.getvalue()
    filename = nickname.lower() + "-" + hashlib.sha256(data).hexdigest()[:12] + ".woff2"
    (OUT / filename).write_bytes(data)
    print(f"{face}: {len(codes)} characters, {len(data):,} bytes")
    return (f"@font-face{{font-family:{face};font-style:normal;font-weight:{css_weight};"
            f"font-display:swap;src:url(/assets/fonts/home/{filename}) format('woff2');"
            f"unicode-range:{css_ranges(codes)}}}")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    rounded = build(ROOT / "public/assets/yeongnyangi/prologue/Jua-Regular.ttf",
                    "769677aef240bfc3b9965f2b50748075bff885e6c6992fc591a3fb268279f898",
                    "CodeDestinyRounded", "Ggulggul-Rounded", "400")
    body = build(Path(sys.argv[1]), "9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4",
                 "CodeDestinyBody", "Ggulggul-Body", "45 920")
    (OUT / "ggulggul.css").write_text(rounded + "\n" + body + "\n", encoding="utf-8", newline="\n")
    licenses = ROOT / "public/assets/fonts/ui"
    (OUT / "OFL.txt").write_text(
        (licenses / "Jua-OFL.txt").read_text(encoding="utf-8").strip() + "\n\n"
        + (licenses / "Pretendard-OFL.txt").read_text(encoding="utf-8").strip() + "\n",
        encoding="utf-8", newline="\n")
