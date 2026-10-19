"""Build the dated sample PDF and a readable four-column shopping board.

Product photos retain their colours. --describe measures the layout and reports
metadata without creating files; --images can override numbered product photos.
"""
import argparse
import json
import math
import re
from datetime import date
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image, ImageOps, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--images', type=Path)
parser.add_argument('--describe', action='store_true',
                    help='Report layout and source dates without creating artifacts.')
args = parser.parse_args()
sample = json.loads((ROOT / 'data/olive-atelier-sample.json').read_text())
project = next(p for p in json.loads((ROOT / 'data/projects.json').read_text())
               if p['id'] == 'level-michurinsky-42-1')
items = sample['items']
if not items:
    raise ValueError('The shopping sample needs at least one item.')
# Use the final CSS declarations, as the browser does.
theme = dict(re.findall(r'--(ink|muted|paper|bronze):\s*(#[0-9a-fA-F]{6})',
                        (ROOT / 'assets/style.css').read_text()))
ink, muted, paper, bronze = (theme[key] for key in ('ink', 'muted', 'paper', 'bronze'))
line = '#d8d0c3'
fontdir = Path('/usr/share/fonts/truetype/dejavu')
for name, file in [('Sans', 'DejaVuSans.ttf'), ('SansBold', 'DejaVuSans-Bold.ttf'),
                   ('Serif', 'DejaVuSerif.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(fontdir / file)))
total = sum(item['priceRub'] * item['quantity'] for item in items)
budget = sample['budgetRub']
remaining = budget - total
room = str(sample['roomAreaM2']).replace('.', ',') + ' м²'
region = sample['region']
project_name = project['name']['ru']
render = ROOT / 'assets/renders' / project['render']
out = ROOT / 'assets/downloads'
moodpath = out / 'Olive_Atelier_Moodboard.jpg'
pdfpath = out / 'Olive_Atelier_Sample.pdf'
concept_note = (
    'AI-визуализация учитывает формы и гамму выбранных предметов. '
    'Она передаёт проектную идею; точность размеров, расстановку и '
    'сочетание образцов уточняют после обмеров.'
)


def clean(value):
    return str(value).replace('\u2011', '-').replace('–', '-').replace('—', '-')


def rub(value):
    return f'{value:,}'.replace(',', ' ') + ' ₽'


def formatted_date(value):
    return date.fromisoformat(str(value)[:10]).strftime('%d.%m.%Y') if value else 'не указана'


def checked_at(item):
    return item.get('checkedAt') or sample.get('checkedAt')


revision = ('Редакция концепции: ' + formatted_date(sample['updatedAt'])
            if sample.get('updatedAt') else 'Демонстрационная концепция')
balance = (f'Остаток условного бюджета: {rub(remaining)}.'
           if remaining >= 0 else f'Превышение условного бюджета: {rub(-remaining)}.')
exclusions = ', '.join(sample.get('exclusions', []))
budget_scope = (f'Отдельно: {exclusions}. Услуга концепции в сумму покупок не входит.'
                if exclusions else 'Доставка, сборка, отделка и услуга концепции рассчитываются отдельно.')


def pilfont(size, bold=False):
    return ImageFont.truetype(str(fontdir / ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')), size)


def img_for(item, index):
    if args.images:
        candidates = sorted(args.images.glob(f'{index + 1:02d}.*'))
        if candidates:
            return candidates[0]
    if item.get('imageFile'):
        photo = ROOT / item['imageFile']
        if not photo.is_file():
            raise FileNotFoundError(photo)
        return photo
    return None


def rgb_image(path):
    with Image.open(path) as original:
        return ImageOps.exif_transpose(original).convert('RGB')


def pdf_image(path):
    if Path(path).suffix.lower() in ('.jpg', '.jpeg'):
        return str(path)
    encoded = BytesIO()
    rgb_image(path).save(encoded, format='JPEG', quality=94, optimize=True)
    encoded.seek(0)
    return ImageReader(encoded)


metrics = ImageDraw.Draw(Image.new('RGB', (1, 1), paper))


def wrap(value, font, width):
    """Wrap every word and explicit line; retain all product-name suffixes."""
    lines = []
    for block in clean(value).split('\n'):
        current = ''
        for word in block.split():
            if metrics.textlength(word, font=font) > width:
                if current:
                    lines.append(current)
                    current = ''
                fragment = ''
                for character in word:
                    if fragment and metrics.textlength(fragment + character, font=font) > width:
                        lines.append(fragment)
                        fragment = character
                    else:
                        fragment += character
                current = fragment
                continue
            candidate = (current + ' ' + word).strip()
            if current and metrics.textlength(candidate, font=font) > width:
                lines.append(current)
                current = word
            else:
                current = candidate
        lines.append(current)
    return lines


def text_height(value, size, width, bold=False):
    return len(wrap(value, pilfont(size, bold), width)) * math.ceil(size * 1.35)


def draw_text(draw, value, x, y, width, size=24, color=ink, bold=False):
    font = pilfont(size, bold)
    leading = math.ceil(size * 1.35)
    for part in wrap(value, font, width):
        draw.text((x, y), part, font=font, fill=color)
        y += leading
    return y


def board_fields(item):
    fields = [(item['name'], 29, ink, True)]
    if item.get('color'):
        fields.append(('Цвет: ' + item['color'], 24, muted, False))
    fields.append(('Размеры: ' + item['dimensions'], 24, muted, False))
    if item.get('rationale'):
        fields.append((item['rationale'], 24, ink, False))
    fields.append((f"{item['quantity']} шт. / {rub(item['priceRub'] * item['quantity'])}",
                   31, ink, True))
    fields.append((f"{item['store']} / Проверено: {formatted_date(checked_at(item))}",
                   23, muted, False))
    return fields


BOARD_W = 2400
MARGIN = 64
INNER = BOARD_W - MARGIN * 2
GAP = 28
CARD_W = (INNER - 3 * GAP) // 4
PHOTO_H = 330
HERO_TOP = 218
HERO_W = 1420
HERO_H = 947
NOTE_TOP = HERO_TOP + HERO_H + 26
PRODUCTS_TOP = NOTE_TOP + text_height(concept_note, 28, INNER) + 96
rows = [list(enumerate(items))[start:start + 4] for start in range(0, len(items), 4)]
row_heights = [
    max(24 + 35 + PHOTO_H + 24 +
        sum(text_height(value, size, CARD_W - 40, bold) + 11
            for value, size, color, bold in board_fields(item)) + 20
        for index, item in row)
    for row in rows
]
footer_top = PRODUCTS_TOP + sum(row_heights) + GAP * (len(rows) - 1) + 38
footer_text = (balance + ' ' + budget_scope +
               '\nДаты проверки относятся к отдельным товарам. Перед заказом уточняйте цену и наличие.')
BOARD_H = footer_top + 65 + text_height(footer_text, 24, INNER) + MARGIN
selection_pages = math.ceil(len(items) / 4)
page_count = 3 + selection_pages
description = {
    'pdf': str(pdfpath), 'pdfPages': page_count,
    'moodboard': str(moodpath), 'moodboardSize': [BOARD_W, BOARD_H],
    'totalRub': total, 'budgetRub': budget, 'remainingRub': remaining,
    'designUpdatedAt': sample.get('updatedAt'),
    'itemCheckedAt': [checked_at(item) for item in items],
    'render': project['render'],
}
if args.describe:
    print(json.dumps(description, ensure_ascii=False))
    raise SystemExit(0)

out.mkdir(parents=True, exist_ok=True)
mood = Image.new('RGB', (BOARD_W, BOARD_H), paper)
draw = ImageDraw.Draw(mood)
draw_text(draw, 'SAFONOV. INTERIORS', MARGIN, 42, INNER, 27, bronze)
draw_text(draw, project_name + ' / палитра и подбор', MARGIN, 93, INNER, 49, ink, True)
draw_text(draw, f'Гостиная {room} / {region} / {revision}', MARGIN, 166, INNER, 26, muted)
hero = ImageOps.contain(rgb_image(render), (HERO_W, HERO_H))
mood.paste(hero, (MARGIN + (HERO_W - hero.width) // 2,
                  HERO_TOP + (HERO_H - hero.height) // 2))
palette_x = MARGIN + HERO_W + 42
palette_w = BOARD_W - MARGIN - palette_x
palette_rows = math.ceil(len(project['palette']) / 2)
palette_cell_w = (palette_w - GAP) // 2
palette_cell_h = (HERO_H - GAP * (palette_rows - 1)) // palette_rows
for index, colour in enumerate(project['palette']):
    x = palette_x + (index % 2) * (palette_cell_w + GAP)
    y = HERO_TOP + (index // 2) * (palette_cell_h + GAP)
    swatch_h = palette_cell_h - 112
    draw.rectangle((x, y, x + palette_cell_w, y + swatch_h), fill=colour['hex'])
    bottom = draw_text(draw, colour['ru'], x, y + swatch_h + 16, palette_cell_w, 28)
    draw_text(draw, colour['hex'], x, bottom + 4, palette_cell_w, 24, muted)
draw_text(draw, concept_note, MARGIN, NOTE_TOP, INNER, 28, muted)
draw_text(draw, 'Выбранные предметы', MARGIN, PRODUCTS_TOP - 67, INNER, 37, ink, True)
y = PRODUCTS_TOP
for row, row_height in zip(rows, row_heights):
    for column, (index, item) in enumerate(row):
        x = MARGIN + column * (CARD_W + GAP)
        draw.rectangle((x, y, x + CARD_W, y + row_height), fill='#fbf8f2', outline=line, width=2)
        draw_text(draw, f'{index + 1:02d} / {item["category"]}',
                  x + 20, y + 20, CARD_W - 40, 23, bronze)
        photo_top = y + 59
        draw.rectangle((x + 16, photo_top, x + CARD_W - 16, photo_top + PHOTO_H), fill='#ffffff')
        photo = img_for(item, index)
        if photo:
            picture = ImageOps.contain(rgb_image(photo), (CARD_W - 56, PHOTO_H - 24))
            mood.paste(picture, (x + (CARD_W - picture.width) // 2,
                                photo_top + (PHOTO_H - picture.height) // 2))
        cursor = photo_top + PHOTO_H + 24
        for value, size, color, bold in board_fields(item):
            cursor = draw_text(draw, value, x + 20, cursor, CARD_W - 40, size, color, bold) + 11
    y += row_height + GAP
draw_text(draw, f'Выбранные предметы: {rub(total)} / условный бюджет: {rub(budget)}',
          MARGIN, footer_top, INNER, 34, ink, True)
draw_text(draw, footer_text, MARGIN, footer_top + 65, INNER, 24, muted)
mood.save(moodpath, quality=94, optimize=True, subsampling=0)

W, H = A4
PDF_MARGIN = 36
PDF_INNER = W - PDF_MARGIN * 2
pdf = canvas.Canvas(str(pdfpath), pagesize=A4, pageCompression=1, invariant=1)
pdf.setTitle(project_name + ' - образец интерьерной концепции')
pdf.setAuthor('Алексей Сафонов')
pdf.setSubject('Палитра и подбор мебели с индивидуальными датами проверки источников')


def pdf_paragraph(value, width, size=10, color=ink, bold=False, serif=False):
    style = ParagraphStyle(
        'part', fontName='Serif' if serif else ('SansBold' if bold else 'Sans'),
        fontSize=size, leading=size * 1.35, textColor=HexColor(color), splitLongWords=True)
    block = Paragraph(escape(clean(value)).replace('\n', '<br/>'), style)
    _, height = block.wrap(width, 10000)
    return block, height


def paragraph(value, x, top, width, size=10, color=ink, bold=False, serif=False):
    block, height = pdf_paragraph(value, width, size, color, bold, serif)
    if top - height < 51:
        raise ValueError(f'PDF text would overlap the footer: {str(value)[:100]}')
    block.drawOn(pdf, x, top - height)
    return top - height


def label(value, x, y, size=9, color=bronze):
    pdf.setFont('Sans', size)
    pdf.setFillColor(HexColor(color))
    pdf.drawString(x, y, clean(value))


def page(number, eyebrow):
    pdf.setFillColor(HexColor(paper))
    pdf.rect(0, 0, W, H, fill=1, stroke=0)
    label('SAFONOV. INTERIORS', PDF_MARGIN, H - 31, 10)
    paragraph(eyebrow, 288, H - 23, W - 288 - PDF_MARGIN, 8, bronze)
    pdf.setStrokeColor(HexColor(line))
    pdf.line(PDF_MARGIN, 38, W - PDF_MARGIN, 38)
    label('Алексей Сафонов / самостоятельная концепция', PDF_MARGIN, 23, 8, muted)
    label(f'{number} / {page_count}', W - 68, 23, 8, muted)


page(1, 'ОБРАЗЕЦ РЕЗУЛЬТАТА / ОДНА КОМНАТА')
cursor = paragraph(project_name, PDF_MARGIN, H - 78, PDF_INNER, 36, serif=True)
cursor = paragraph(f'Гостиная {room} / {region}', PDF_MARGIN, cursor - 12, PDF_INNER, 12)
cursor = paragraph(revision, PDF_MARGIN, cursor - 8, PDF_INNER, 9, muted)
hero_top = cursor - 18
hero_h = 322
pdf.drawImage(pdf_image(render), PDF_MARGIN, hero_top - hero_h, width=PDF_INNER,
              height=hero_h, preserveAspectRatio=True, anchor='c', mask='auto')
cursor = paragraph(concept_note, PDF_MARGIN, hero_top - hero_h - 14, PDF_INNER, 9, muted)
cursor = paragraph('Демонстрационный бриф', PDF_MARGIN, cursor - 18, PDF_INNER, 11, bold=True)
cursor = paragraph(project['brief']['ru'], PDF_MARGIN, cursor - 7, PDF_INNER, 10.5)
cursor = paragraph('Условный бюджет на выбранные предметы', PDF_MARGIN, cursor - 18, PDF_INNER, 9, muted)
cursor = paragraph(rub(budget), PDF_MARGIN, cursor - 5, PDF_INNER, 28, serif=True)
paragraph('Самостоятельный образец состава услуги. Это не выполненный клиентский заказ.',
          PDF_MARGIN, cursor - 14, PDF_INNER, 9, muted)
pdf.showPage()

page(2, 'ЦВЕТ И МАТЕРИАЛ / ОРИЕНТИРЫ')
cursor = paragraph('Палитра проекта', PDF_MARGIN, H - 78, PDF_INNER, 30, serif=True)
cursor = paragraph(project['intro']['ru'], PDF_MARGIN, cursor - 15, PDF_INNER, 11)
palette_top = cursor - 26
cell_w = (PDF_INNER - 22) / 2
cell_h = min(225, (palette_top - 190) / palette_rows)
for index, colour in enumerate(project['palette']):
    x = PDF_MARGIN + (index % 2) * (cell_w + 22)
    top = palette_top - (index // 2) * cell_h
    swatch_h = cell_h - 77
    pdf.setFillColor(HexColor(colour['hex']))
    pdf.rect(x, top - swatch_h, cell_w, swatch_h, fill=1, stroke=0)
    bottom = paragraph(colour['ru'], x, top - swatch_h - 12, cell_w, 14)
    paragraph(colour['hex'], x, bottom - 4, cell_w, 10, muted)
cursor = palette_top - palette_rows * cell_h - 17
cursor = paragraph('Как пользоваться палитрой', PDF_MARGIN, cursor, PDF_INNER, 14, bold=True)
paragraph('Цветовые ориентиры связывают отделку, дерево и текстиль. '
          'Оттенки на фото зависят от освещения и экрана; ткань, дерево и поверхность '
          'под камень согласуют по реальным образцам вместе.',
          PDF_MARGIN, cursor - 9, PDF_INNER, 11, muted)
pdf.showPage()


def item_pdf_layout(item, width, scale):
    """Measure a complete row before drawing, including its individual date."""
    title_width = width - 109
    name, name_h = pdf_paragraph(item['name'], title_width, 10.8 * scale, bold=True)
    price, price_h = pdf_paragraph(rub(item['priceRub'] * item['quantity']), 101, 12 * scale, bold=True)
    specifications = []
    if item.get('color'):
        specifications.append('Цвет: ' + item['color'])
    specifications.append('Размеры: ' + item['dimensions'])
    availability = item.get('availability', '')
    if item.get('materialNote'):
        availability = (availability + '. ' + item['materialNote']).strip('. ')
    sections = [
        (f'{item["store"]} / Проверено: {formatted_date(checked_at(item))}', 8.2 * scale, muted),
        ('\n'.join(specifications), 8.7 * scale, ink),
    ]
    if item.get('rationale'):
        sections.append((item['rationale'], 8.7 * scale, ink))
    if availability:
        sections.append((availability, 8 * scale, muted))
    measured = [pdf_paragraph(value, width, size, color) for value, size, color in sections]
    height = max(name_h, price_h) + 4 + sum(h + 3 for block, h in measured) + 14
    return name, name_h, price, price_h, measured, height


for selection_index, start in enumerate(range(0, len(items), 4)):
    group = list(enumerate(items))[start:start + 4]
    page(3 + selection_index, 'ПОДБОР / ССЫЛКИ НА ИСТОЧНИКИ')
    cursor = paragraph('Выбранные предметы', PDF_MARGIN, H - 78, PDF_INNER, 29, serif=True)
    cursor = paragraph('Проверка цен и наличия датирована у каждого товара. '
                       'Размеры указаны в порядке магазина.',
                       PDF_MARGIN, cursor - 12, PDF_INNER, 9, muted)
    top = cursor - 18
    gap = 12
    row_h = (top - 55 - gap * (len(group) - 1)) / len(group)
    text_x = PDF_MARGIN + 126
    text_w = W - PDF_MARGIN - text_x
    for row, (index, item) in enumerate(group):
        row_top = top - row * (row_h + gap)
        layout = None
        for scale in (1, .97, .94, .91):
            candidate = item_pdf_layout(item, text_w, scale)
            if candidate[-1] <= row_h:
                layout = candidate
                break
        if layout is None:
            raise ValueError(f'Product {index + 1} needs more PDF space; no text was clipped.')
        name, name_h, price, price_h, measured, height = layout
        label(f'{index + 1:02d}', PDF_MARGIN, row_top - 10, 10)
        photo = img_for(item, index)
        if photo:
            pdf.drawImage(pdf_image(photo), PDF_MARGIN, row_top - 126, width=114, height=105,
                          preserveAspectRatio=True, anchor='c', mask='auto')
        name.drawOn(pdf, text_x, row_top - name_h)
        price.drawOn(pdf, W - PDF_MARGIN - 101, row_top - price_h)
        body_y = row_top - max(name_h, price_h) - 4
        for block, height in measured:
            block.drawOn(pdf, text_x, body_y - height)
            body_y -= height + 3
        link_y = body_y - 9
        label(f'{item["quantity"]} шт. / Открыть товар ↗', text_x, link_y, 8.7)
        pdf.linkURL(item['url'], (text_x - 2, link_y - 4, text_x + 185, link_y + 11),
                    relative=0, thickness=0)
        pdf.setStrokeColor(HexColor(line))
        pdf.line(PDF_MARGIN, row_top - row_h - gap / 2, W - PDF_MARGIN,
                 row_top - row_h - gap / 2)
    pdf.showPage()

page(page_count, 'БЮДЖЕТ / ПЕРЕД ПОКУПКОЙ')
cursor = paragraph('Дальше - ваша комната', PDF_MARGIN, H - 78, PDF_INNER, 31, serif=True)
cursor = paragraph('Выбранные предметы: ' + rub(total), PDF_MARGIN, cursor - 22, PDF_INNER, 24, serif=True)
cursor = paragraph(f'Условный бюджет: {rub(budget)}. {balance}', PDF_MARGIN, cursor - 9, PDF_INNER, 10, muted)
cursor = paragraph(budget_scope, PDF_MARGIN, cursor - 9, PDF_INNER, 10, muted)
cursor = paragraph('В этом образце', PDF_MARGIN, cursor - 24, PDF_INNER, 13, bold=True)
cursor = paragraph('1. Направление интерьера и палитра.\n'
                   '2. Фотографии выбранных товаров и пояснение выбора.\n'
                   '3. Размеры, цвета, цены и даты проверки источников.\n'
                   '4. Сумма выбранных предметов и ссылки на магазины.',
                   PDF_MARGIN, cursor - 9, PDF_INNER, 11)
cursor = paragraph('Что проверяем до покупки', PDF_MARGIN, cursor - 22, PDF_INNER, 13, bold=True)
cursor = paragraph('Размеры комнаты, дверей и проходов; размеры мебели; выбранную ткань и оттенок; '
                   'наличие, сроки и стоимость доставки. Проверка в дату карточки не гарантирует '
                   'сохранение цены или остатка.',
                   PDF_MARGIN, cursor - 9, PDF_INNER, 11)
cursor = paragraph('Концепция одной комнаты - 5 000 ₽', PDF_MARGIN, cursor - 27, PDF_INNER, 22, serif=True)
cursor = paragraph('Один стиль, коллаж, палитра, до 8 предметов со ссылками, одна итерация корректировок, '
                   'итоговый PDF. Срок согласуем после получения исходных материалов.',
                   PDF_MARGIN, cursor - 11, PDF_INNER, 10.5)
cursor = paragraph('Пришлите фото, размеры, пожелания, бюджет на покупки и город доставки. '
                   'Концепция не включает обмеры, рабочие чертежи и инженерные решения.',
                   PDF_MARGIN, cursor - 11, PDF_INNER, 9, muted)
contact_y = cursor - 29
if contact_y < 62:
    raise ValueError('PDF contact links would overlap the footer.')
label('Telegram: @Alexfox14', PDF_MARGIN, contact_y, 11)
pdf.linkURL('https://t.me/Alexfox14',
            (PDF_MARGIN - 2, contact_y - 5, PDF_MARGIN + 215, contact_y + 14), relative=0, thickness=0)
label('Открыть портфолио ↗', 330, contact_y, 11)
pdf.linkURL('https://safal207.github.io/safonov-interior-portfolio/',
            (328, contact_y - 5, W - PDF_MARGIN, contact_y + 14), relative=0, thickness=0)
pdf.save()
print(json.dumps(description, ensure_ascii=False))
