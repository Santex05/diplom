import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

for rel in [
    '01-server/presentation.html',
    '02-web/presentation.html',
    '03-docker/presentation.html',
]:
    path = ROOT / rel
    text = path.read_text(encoding='utf-8')
    text = re.sub(r'\s*<div class="speech-box">.*?</div>\s*', '\n', text, flags=re.DOTALL)
    path.write_text(text, encoding='utf-8')
    print('cleaned', path)
