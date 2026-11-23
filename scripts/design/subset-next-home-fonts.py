"""Regenerate the two homes' WOFF2 subsets from an existing Next export.

Requires fonttools[woff]. Pass an export directory and the official
PretendardVariable.woff2 from the v1.3.9 release used by build-ui-font-assets.mjs.
The full Jua source and both OFL licenses already ship with the site.
"""
import argparse
import runpy
from html.parser import HTMLParser
from pathlib import Path



class PageText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = set(range(32, 127))
        self.in_body = False
        self.excluded = 0

    def handle_starttag(self, tag, attrs):
        if tag == 'body':
            self.in_body = True
        if tag in ('script', 'style', 'noscript', 'template'):
            self.excluded += 1
        if self.in_body and not self.excluded:
            for name, value in attrs:
                if name in ('aria-label', 'placeholder', 'alt') and value:
                    self.text.update(map(ord, value))

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript', 'template'):
            self.excluded -= 1
        if tag == 'body':
            self.in_body = False

    def handle_data(self, data):
        if self.in_body and not self.excluded:
            self.text.update(map(ord, data))


root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('export', type=Path)
parser.add_argument('pretendard', type=Path)
args = parser.parse_args()
builder = runpy.run_path(str(root / 'scripts/font-subsets/build-home-fonts.py'))['build']

target = root / 'public/assets/fonts/home'
target.mkdir(parents=True, exist_ok=True)
for page, filename in [('entry', 'index.html'), ('yeongnyangi', 'yeongnyangi/index.html')]:
    text = PageText()
    text.feed((args.export / filename).read_text(encoding='utf8'))
    rules = []
    for family, file, digest, nickname, weight in [
        ('CodeDestinyRounded', root / 'public/assets/yeongnyangi/prologue/Jua-Regular.ttf',
         '769677aef240bfc3b9965f2b50748075bff885e6c6992fc591a3fb268279f898', 'Rounded', '400'),
        ('CodeDestinyBody', args.pretendard,
         '9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4', 'Body', '45 920'),
    ]:
        rules.append(builder(file, digest, family, page + '-' + nickname, weight, characters=text.text))
    (target / f'{page}.css').write_text('\n'.join(rules) + '\n', encoding='utf8', newline='\n')
