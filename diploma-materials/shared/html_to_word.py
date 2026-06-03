#!/usr/bin/env python3
"""
Конвертация diploma.html → diploma.docx (ГАПОУ, Times New Roman 14, интервал 1,5).
Запуск: python diploma-materials/shared/html_to_word.py
"""

from __future__ import annotations

import re
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Mm, Pt, RGBColor

ROOT = Path(__file__).resolve().parent.parent
FONT = 'Times New Roman'
SIZE = Pt(14)
SIZE_TABLE = Pt(12)
INDENT = Cm(1.25)

BLOCK_TAGS = frozenset({'p', 'h1', 'h2', 'h3', 'table', 'ul', 'ol', 'div'})


def setup_document(doc: Document) -> None:
    sec = doc.sections[0]
    sec.page_height = Mm(297)
    sec.page_width = Mm(210)
    sec.top_margin = Mm(20)
    sec.bottom_margin = Mm(22)
    sec.left_margin = Mm(30)
    sec.right_margin = Mm(15)

    normal = doc.styles['Normal']
    normal.font.name = FONT
    normal.font.size = SIZE
    normal._element.rPr.rFonts.set(qn('w:eastAsia'), FONT)
    pf = normal.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf.first_line_indent = INDENT
    pf.space_after = Pt(0)
    pf.space_before = Pt(0)

    for name in ('Heading 1', 'Heading 2', 'Heading 3'):
        if name in doc.styles:
            st = doc.styles[name]
            st.font.name = FONT
            st.font.bold = True
            st.font.color.rgb = RGBColor(0, 0, 0)
            st._element.rPr.rFonts.set(qn('w:eastAsia'), FONT)
            st.paragraph_format.first_line_indent = Cm(0)
            st.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE


def set_run_font(run, *, bold=False, italic=False, size=None) -> None:
    run.font.name = FONT
    run.font.size = size or SIZE
    run.bold = bold
    run.italic = italic
    run._element.rPr.rFonts.set(qn('w:eastAsia'), FONT)


def add_footer_page_number(section, start: int | None = None) -> None:
    section.footer.is_linked_to_previous = False
    p = section.footer.paragraphs[0] if section.footer.paragraphs else section.footer.add_paragraph()
    p.clear()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    def _field(instr: str):
        r = p.add_run()
        fc1 = OxmlElement('w:fldChar')
        fc1.set(qn('w:fldCharType'), 'begin')
        r._r.append(fc1)
        r2 = p.add_run()
        ins = OxmlElement('w:instrText')
        ins.set(qn('xml:space'), 'preserve')
        ins.text = instr
        r2._r.append(ins)
        r3 = p.add_run()
        fc2 = OxmlElement('w:fldChar')
        fc2.set(qn('w:fldCharType'), 'separate')
        r3._r.append(fc2)
        r4 = p.add_run()
        r4.font.name = FONT
        r4.font.size = Pt(12)
        r5 = p.add_run()
        fc3 = OxmlElement('w:fldChar')
        fc3.set(qn('w:fldCharType'), 'end')
        r5._r.append(fc3)

    _field(' PAGE ')

    if start is not None:
        sect_pr = section._sectPr
        pg = sect_pr.find(qn('w:pgNumType'))
        if pg is None:
            pg = OxmlElement('w:pgNumType')
            sect_pr.append(pg)
        pg.set(qn('w:start'), str(start))


def classes(el: Tag) -> list[str]:
    return el.get('class') or []


def should_skip_element(el: Tag) -> bool:
    return 'no-print' in classes(el)


def should_skip_paragraph(el: Tag) -> bool:
    if should_skip_element(el):
        return True
    t = text_inline(el)
    if not t:
        return True
    if t.startswith('Оформление:') and '[ФИО' in t:
        return True
    if 'Нумерация страниц:' in t and 'Ctrl+P' in t:
        return True
    if 'presentation.html' in t and 'speech.md' in t and 'комплект' in t:
        return True
    if 'speech.md' in t and 'подготовке доклада' in t:
        return True
    return False


def text_inline(el: Tag) -> str:
    return re.sub(r'\s+', ' ', el.get_text(' ', strip=True))


def add_paragraph_from_tag(doc: Document, el: Tag, *, center=False, bold=False,
                           indent=True, caption=False) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    if center:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif caption:
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    else:
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    if not indent or center or caption:
        p.paragraph_format.first_line_indent = Cm(0)
    else:
        p.paragraph_format.first_line_indent = INDENT

    if bold and not list(el.find_all(['strong', 'b', 'em', 'code', 'br'])):
        r = p.add_run(text_inline(el))
        set_run_font(r, bold=True)
        return

    def walk(node, is_bold=False):
        if isinstance(node, NavigableString):
            t = str(node)
            if not t:
                return
            r = p.add_run(t)
            set_run_font(r, bold=is_bold)
        elif isinstance(node, Tag):
            if node.name == 'br':
                p.add_run().add_break()
            elif node.name in ('strong', 'b'):
                for ch in node.children:
                    walk(ch, True)
            elif node.name == 'em':
                r = p.add_run(node.get_text())
                set_run_font(r, italic=True)
            elif node.name == 'code':
                r = p.add_run(node.get_text())
                r.font.name = 'Consolas'
                r.font.size = Pt(11)
            else:
                for ch in node.children:
                    walk(ch, is_bold)

    for ch in el.children:
        walk(ch)


def add_table(doc: Document, table_el: Tag) -> None:
    rows = table_el.find_all('tr', recursive=False)
    if not rows:
        rows = table_el.find_all('tr')
    if not rows:
        return
    ncol = max(len(r.find_all(['td', 'th'], recursive=False)) for r in rows)
    tbl = doc.add_table(rows=len(rows), cols=ncol)
    tbl.style = 'Table Grid'
    for ri, row in enumerate(rows):
        cells = row.find_all(['td', 'th'], recursive=False)
        for ci, cell in enumerate(cells):
            tc = tbl.cell(ri, ci)
            tc.text = ''
            para = tc.paragraphs[0]
            para.paragraph_format.first_line_indent = Cm(0)
            para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
            run = para.add_run(cell.get_text(' ', strip=True))
            set_run_font(run, bold=(cell.name == 'th'), size=SIZE_TABLE)


def add_toc_line(doc: Document, li: Tag) -> None:
    spans = [s for s in li.find_all('span', recursive=False)]
    title = spans[0].get_text(' ', strip=True) if spans else li.get_text(' ', strip=True)
    page_num = ''
    if len(spans) >= 2:
        last = spans[-1].get_text(strip=True)
        if last.isdigit():
            page_num = last

    p = doc.add_paragraph()
    p.paragraph_format.first_line_indent = Cm(0)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    p.paragraph_format.tab_stops.add_tab_stop(Cm(15.5), alignment=WD_TAB_ALIGNMENT.RIGHT)

    r1 = p.add_run(title)
    set_run_font(r1)
    if page_num:
        p.add_run('\t')
        r2 = p.add_run(page_num)
        set_run_font(r2)


def add_list(doc: Document, el: Tag) -> None:
    ordered = el.name == 'ol'
    is_sources = 'sources' in classes(el)
    items = el.find_all('li', recursive=False)

    for idx, li in enumerate(items, 1):
        txt = li.get_text(' ', strip=True)
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        if ordered:
            p.paragraph_format.first_line_indent = Cm(0)
            p.paragraph_format.left_indent = Cm(0)
            r = p.add_run(f'{idx}. {txt}')
            set_run_font(r)
        else:
            p.paragraph_format.first_line_indent = Cm(0)
            p.paragraph_format.left_indent = Cm(1.25)
            r = p.add_run(f'– {txt}')
            set_run_font(r)


def is_semantic_div(el: Tag) -> bool:
    cl = classes(el)
    return any(
        x in cl
        for x in (
            'title-page',
            'chapter-title',
            'section-title',
            'struct-heading',
            'screenshot-placeholder',
            'diagram-box',
        )
    )


def iter_content_blocks(container: Tag):
    """Обход блоков в порядке DOM без пропусков и дублей."""
    stack = list(container.children)

    while stack:
        node = stack.pop(0)
        if isinstance(node, NavigableString):
            t = str(node).strip()
            if t:
                yield ('text', t)
            continue
        if not isinstance(node, Tag) or should_skip_element(node):
            continue
        if node.name == 'p' and should_skip_paragraph(node):
            continue

        name = node.name
        cl = classes(node)

        if name == 'div':
            if 'title-page-gost' in cl or 'title-page-mu' in cl:
                yield ('element', node)
                continue
            if 'title-page' in cl:
                yield from iter_content_blocks(node)
                continue
            if 'figure-block' in cl:
                for ch in node.children:
                    if isinstance(ch, Tag) and ch.name in ('p', 'div'):
                        stack.append(ch)
                continue
            if is_semantic_div(node):
                yield ('element', node)
                continue
            for ch in node.children:
                if isinstance(ch, Tag):
                    stack.append(ch)
            continue

        if name in ('p', 'h1', 'h2', 'h3', 'table', 'ul', 'ol'):
            yield ('element', node)
            continue

        for ch in node.children:
            if isinstance(ch, Tag):
                stack.append(ch)


def render_block(doc: Document, el: Tag, *, title_mode: bool = False) -> None:
    name = el.name
    cl = classes(el)

    if 'title-page-gost' in cl or 'title-page-mu' in cl:
        render_mu_title_page(doc, el)
        return

    if name in ('h1', 'h2') or 'struct-heading' in cl:
        add_paragraph_from_tag(doc, el, center=True, bold=True, indent=False)
        return

    if 'chapter-title' in cl or (name == 'p' and 'chapter-title' in cl):
        p = doc.add_paragraph(style='Heading 1')
        p.paragraph_format.first_line_indent = INDENT
        p.paragraph_format.space_before = Pt(12)
        r = p.add_run(text_inline(el))
        set_run_font(r, bold=True)
        return

    if 'section-title' in cl or (name == 'p' and 'section-title' in cl):
        p = doc.add_paragraph(style='Heading 2')
        p.paragraph_format.first_line_indent = INDENT
        p.paragraph_format.space_before = Pt(6)
        r = p.add_run(text_inline(el))
        set_run_font(r, bold=True)
        return

    if 'table-caption' in cl or 'figure-caption' in cl:
        add_paragraph_from_tag(doc, el, bold=True, indent=False, caption=True)
        return

    if 'screenshot-placeholder' in cl:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.first_line_indent = Cm(0)
        r = p.add_run(f'[{text_inline(el)}]')
        set_run_font(r, italic=True, size=SIZE_TABLE)
        return

    if name == 'table':
        add_table(doc, el)
        return

    if name in ('ul', 'ol'):
        if 'toc' in cl:
            for li in el.find_all('li', recursive=False):
                add_toc_line(doc, li)
        else:
            add_list(doc, el)
        return

    if name == 'p':
        no_indent = 'no-indent' in cl or title_mode
        center = title_mode
        add_paragraph_from_tag(
            doc,
            el,
            center=center,
            indent=not no_indent,
        )
        return


def add_title_paragraph(doc: Document, text: str, *, center=True, bold=False, size=None) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    p.paragraph_format.first_line_indent = Cm(0)
    p.paragraph_format.space_after = Pt(2)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER if center else WD_ALIGN_PARAGRAPH.RIGHT
    r = p.add_run(text)
    set_run_font(r, bold=bold, size=size or SIZE)


def add_title_hint(doc: Document, text: str, *, size: float = 8) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Cm(0)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    p.paragraph_format.space_after = Pt(6)
    r = p.add_run(text)
    set_run_font(r, size=Pt(size))


def add_title_blank_line(doc: Document) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Cm(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    r = p.add_run('_' * 72)
    set_run_font(r, size=Pt(12))
    r.underline = True


def add_title_sig_line(doc: Document, parts: list[str]) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.first_line_indent = Cm(0)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    p.paragraph_format.space_after = Pt(0)
    for i, part in enumerate(parts):
        if i:
            p.add_run('  ')
        r = p.add_run(part)
        set_run_font(r)


def render_mu_title_table(doc: Document, table_el: Tag) -> None:
    for row in table_el.find_all('tr'):
        is_hint = 'sig-hint' in (row.get('class') or [])
        parts: list[str] = []
        for cell in row.find_all('td', recursive=False):
            if cell.find(class_='sig-line') or cell.find(class_='sig-inline-line'):
                parts.append('_' * 14)
            else:
                t = cell.get_text(' ', strip=True)
                if t:
                    parts.append(t)
        if not parts:
            continue
        p = doc.add_paragraph()
        p.paragraph_format.first_line_indent = Cm(0)
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        p.paragraph_format.space_after = Pt(2 if is_hint else 4)
        if is_hint and len(parts) == 1:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        txt = '   '.join(parts)
        r = p.add_run(txt)
        set_run_font(r, size=Pt(8 if is_hint else 14))


def render_mu_title_page(doc: Document, section: Tag) -> None:
    """Титульный лист по Приложению 6 (как эталонный бланк)."""
    org = section.find(class_='title-org')
    if org:
        for line in org.find_all('p', recursive=False):
            add_title_paragraph(doc, text_inline(line), center=True, bold=True, size=Pt(14))

    approve = section.find(class_='title-approve')
    if approve:
        for p in approve.find_all('p', recursive=False):
            txt = text_inline(p)
            if txt:
                add_title_paragraph(doc, txt, center=False, bold=False, size=Pt(14))

    doc.add_paragraph()

    diploma = section.find(class_='title-diploma')
    if diploma:
        add_title_paragraph(doc, text_inline(diploma), center=True, bold=True, size=Pt(14))

    spec = section.find(class_='title-spec-head')
    if spec:
        add_title_paragraph(doc, text_inline(spec), center=True, bold=True, size=Pt(14))

    for field in section.find_all('div', class_='title-field'):
        value = field.find(class_='title-field-value')
        if value:
            add_title_paragraph(doc, text_inline(value), center=True, bold=True, size=Pt(14))
        add_title_blank_line(doc)
        hint = field.find(class_='title-field-hint')
        if hint:
            add_title_hint(doc, text_inline(hint), size=8)

    doc.add_paragraph()

    sig_table = section.find('table', class_='title-sig-table')
    if sig_table:
        render_mu_title_table(doc, sig_table)

    city = section.find(class_='title-city')
    if city:
        doc.add_paragraph()
        add_title_paragraph(doc, text_inline(city), center=True, size=Pt(14))


def find_title_section(page: Tag) -> Tag | None:
    for el in page.find_all('section', recursive=True):
        cl = el.get('class') or []
        if 'title-page-gost' in cl or 'title-page-mu' in cl:
            return el
    return None


def render_page(doc: Document, page: Tag) -> None:
    mu_title = find_title_section(page)
    if mu_title:
        render_mu_title_page(doc, mu_title)
        return

    title_mode = bool(page.find(class_='title-page'))
    for kind, payload in iter_content_blocks(page):
        if kind == 'text':
            p = doc.add_paragraph()
            p.paragraph_format.first_line_indent = INDENT
            r = p.add_run(payload)
            set_run_font(r)
        else:
            render_block(doc, payload, title_mode=title_mode)


def convert_html_to_docx(html_path: Path, docx_path: Path) -> None:
    soup = BeautifulSoup(html_path.read_text(encoding='utf-8'), 'lxml')
    body = soup.body
    if not body:
        raise ValueError(f'Нет <body> в {html_path}')

    pages = body.find_all('div', class_=lambda c: c and 'doc-page' in c.split())
    if not pages:
        pages = [body]

    unnumbered = [p for p in pages if 'page-num' not in classes(p)]
    numbered = [p for p in pages if 'page-num' in classes(p)]

    doc = Document()
    setup_document(doc)

    for i, page in enumerate(unnumbered):
        if i > 0:
            doc.add_page_break()
        render_page(doc, page)

    if numbered:
        doc.add_section(WD_SECTION.NEW_PAGE)
        sec = doc.sections[-1]
        sec.top_margin = Mm(20)
        sec.bottom_margin = Mm(22)
        sec.left_margin = Mm(30)
        sec.right_margin = Mm(15)
        add_footer_page_number(sec, start=3)

        for i, page in enumerate(numbered):
            if i > 0:
                doc.add_page_break()
            render_page(doc, page)

    docx_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(docx_path))
    print(f'OK: {docx_path}')


def main() -> None:
    pairs = [
        (ROOT / '01-server' / 'diploma.html', ROOT / '01-server' / 'diploma.docx'),
        (ROOT / '02-web' / 'diploma.html', ROOT / '02-web' / 'diploma.docx'),
        (ROOT / '03-docker' / 'diploma.html', ROOT / '03-docker' / 'diploma.docx'),
    ]
    for html_path, docx_path in pairs:
        if html_path.exists():
            convert_html_to_docx(html_path, docx_path)
        else:
            print(f'SKIP: {html_path}')


if __name__ == '__main__':
    main()
