"""Build the PDF and moodboard from the verified sample shopping list.

Requires Pillow, reportlab and DejaVu fonts. Product photos come from the sample
data; --images can override them with numbered files. The AI room image and
palettes come from this repo.
"""
import argparse, json, math
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape
from PIL import Image, ImageOps, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--images', type=Path)
args=parser.parse_args()
sample=json.loads((ROOT/'data/olive-atelier-sample.json').read_text())
project=next(p for p in json.loads((ROOT/'data/projects.json').read_text()) if p['id']=='level-michurinsky-42-1')
out=ROOT/'assets/downloads'; out.mkdir(parents=True, exist_ok=True)
ink='#302c27'; muted='#777067'; paper='#f5f1e9'; bronze='#967452'
fontdir=Path('/usr/share/fonts/truetype/dejavu')
for name,file in [('Sans','DejaVuSans.ttf'),('SansBold','DejaVuSans-Bold.ttf'),('Serif','DejaVuSerif.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(fontdir/file)))

def clean(value):
    return str(value).replace('\u2011','-').replace('–','-').replace('—','-')

def rub(value):
    return f'{value:,}'.replace(',',' ')+' ₽'

def pilfont(size,bold=False):
    return ImageFont.truetype(str(fontdir/('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')),size)

def img_for(item,i):
    if args.images:
        candidates=list(args.images.glob(f'{i+1:02d}.*'))
        if candidates:return candidates[0]
    if item.get('imageFile'):
        photo=ROOT/item['imageFile']
        if not photo.is_file(): raise FileNotFoundError(photo)
        return photo
    return None

def pdf_image(path):
    if Path(path).suffix.lower() in ('.jpg','.jpeg'):return str(path)
    encoded=BytesIO()
    Image.open(path).convert('RGB').save(encoded,format='JPEG',quality=92,optimize=True)
    encoded.seek(0)
    return ImageReader(encoded)

def wrap(draw, value, font, max_width):
    lines=[]; line=''
    for word in clean(value).split():
        candidate=(line+' '+word).strip()
        if line and draw.textlength(candidate,font=font)>max_width:lines.append(line);line=word
        else:line=candidate
    if line:lines.append(line)
    return lines

mood=Image.new('RGB',(1600,1100),paper); d=ImageDraw.Draw(mood)
d.text((50,35),'SAFONOV. INTERIORS',font=pilfont(23),fill=bronze)
d.text((50,78),'Оливковое ателье / палитра и подбор',font=pilfont(38,bold=True),fill=ink)
hero=ImageOps.fit(Image.open(ROOT/'assets/renders'/project['render']).convert('RGB'),(910,545))
mood.paste(hero,(50,155))
d.text((50,713),'AI-концепция. Предметы подбираются в её стиле.',font=pilfont(21),fill=muted)
for i,col in enumerate(project['palette']):
    x=1000+(i%2)*270;y=155+(i//2)*270
    d.rectangle((x,y,x+245,y+180),fill=col['hex'])
    for j,line in enumerate(wrap(d,col['ru'],pilfont(23),245)):
        d.text((x,y+194+j*28),line,font=pilfont(23),fill=ink)
    d.text((x,y+234),col['hex'],font=pilfont(18),fill=muted)
for i,item in enumerate(sample['items']):
    x=round(50+i*(1500/len(sample['items'])));y=778
    d.rectangle((x,y,x+174,y+156),fill='#ffffff')
    photo=img_for(item,i)
    if photo:
        picture=ImageOps.contain(Image.open(photo).convert('RGB'),(164,146))
        mood.paste(picture,(x+(174-picture.width)//2,y+(156-picture.height)//2))
    else:d.text((x+20,y+55),clean(item['category']),font=pilfont(18),fill=muted)
    label=clean(item['name'])
    for j,line in enumerate(wrap(d,label,pilfont(16),174)[:2]):
        d.text((x,y+170+j*24),line,font=pilfont(16),fill=ink)
    d.text((x,y+228),rub(item['priceRub']),font=pilfont(18,bold=True),fill=ink)
d.text((50,1060),'Демонстрационный подбор / Москва / проверено 10.10.2026',font=pilfont(20),fill=muted)
moodpath=out/'Olive_Atelier_Moodboard.jpg';mood.save(moodpath,quality=91,optimize=True)

W,H=842,595
pdf=canvas.Canvas(str(out/'Olive_Atelier_Sample.pdf'),pagesize=(W,H),pageCompression=1,invariant=1)
pdf.setTitle('Оливковое ателье - образец интерьерной концепции')
pdf.setAuthor('Алексей Сафонов')
pdf.setSubject('Самостоятельный демонстрационный кейс, палитра и реальный подбор мебели')
style=ParagraphStyle('body',fontName='Sans',fontSize=10,leading=15,textColor=HexColor(ink))
smallstyle=ParagraphStyle('small',parent=style,fontSize=8,leading=11,textColor=HexColor(muted))

def paragraph(txt,x,y,width,font_size=10,color=ink,bold=False):
    sty=ParagraphStyle('part',parent=style,fontName='SansBold' if bold else 'Sans',fontSize=font_size,leading=font_size*1.5,textColor=HexColor(color))
    p=Paragraph(escape(clean(txt)).replace('\n','<br/>'),sty);_,h=p.wrap(width,1000);p.drawOn(pdf,x,y-h);return y-h

def label(txt,x,y,size=9,color=bronze):
    pdf.setFont('Sans',size);pdf.setFillColor(HexColor(color));pdf.drawString(x,y,clean(txt))

def title(txt,x,y,size=31):
    pdf.setFillColor(HexColor(ink));pdf.setFont('Serif',size);pdf.drawString(x,y,clean(txt))

def page(n,eyebrow):
    pdf.setFillColor(HexColor(paper));pdf.rect(0,0,W,H,fill=1,stroke=0)
    label('SAFONOV. INTERIORS',36,H-30,10)
    label(eyebrow,400,H-30,8)
    pdf.setStrokeColor(HexColor('#d8d0c3'));pdf.line(36,38,W-36,38)
    label('Алексей Сафонов / самостоятельная концепция',36,23,8,muted)
    label(f'{n} / 5',W-66,23,8,muted)

page(1,'ОБРАЗЕЦ РЕЗУЛЬТАТА / ОДНА КОМНАТА')
title('Оливковое ателье',36,H-93,36)
paragraph('Гостиная 17,2 м² / Москва\nГлубокая олива, орех и светлые фактуры.',39,H-120,260,12)
pdf.drawImage(pdf_image(ROOT/'assets/renders'/project['render']),342,81,width=464,height=365,preserveAspectRatio=True,anchor='c',mask='auto')
label('Демонстрационный бриф',39,333,10)
paragraph('Комната для отдыха и спокойных вечеров. Светлая база, оливковый акцент и компактная мягкая мебель. Исходный план квартиры сохранён в портфолио.',39,310,256,11)
label('Условный бюджет на покупки',39,205,9)
title('200 000 ₽',39,173,28)
paragraph('Это пример состава результата, не выполненный клиентский заказ. AI-изображение передаёт настроение; выбранные товары могут отличаться от мебели на визуализации.',39,144,266,9,muted)
pdf.showPage()

page(2,'НАСТРОЕНИЕ / ЦВЕТ / ПРЕДМЕТЫ')
pdf.drawImage(str(moodpath),36,58,width=770,height=484,preserveAspectRatio=True,anchor='c')
pdf.showPage()

total=sum(i['priceRub']*i['quantity'] for i in sample['items'])
for page_number,start in [(3,0),(4,4)]:
    page(page_number,'РЕАЛЬНЫЙ ПОДБОР / КЛИКАБЕЛЬНЫЕ ССЫЛКИ')
    title('Подбор мебели и декора',36,H-76,28)
    paragraph('Цены по открытым карточкам магазинов на 10.10.2026. Размеры приведены в порядке, указанном магазином.',36,H-94,750,9,muted)
    for row,(i,item) in enumerate(list(enumerate(sample['items']))[start:start+4]):
        top=H-138-row*100
        photo=img_for(item,i)
        if photo:pdf.drawImage(pdf_image(photo),39,top-80,width=94,height=75,preserveAspectRatio=True,anchor='c',mask='auto')
        label(f'{i+1:02d}',145,top-12,10)
        paragraph(item['name'],173,top-1,440,11,bold=True)
        paragraph(f"{item['category']} / {item['store']} / {item['dimensions']}",173,top-26,475,9)
        paragraph(item['availability'] + ('; ' + item['materialNote'] if item.get('materialNote') else ''),173,top-48,475,8,muted)
        label('Открыть товар ↗',173,top-82,8,bronze)
        pdf.linkURL(item['url'],(170,top-87,340,top-70),relative=0,thickness=0)
        paragraph(rub(item['priceRub']*item['quantity']),657,top-1,150,13,bold=True)
        pdf.setStrokeColor(HexColor('#d8d0c3'));pdf.line(36,top-93,W-36,top-93)
    pdf.showPage()

page(5,'ПЕРЕД ПОКУПКОЙ / КАК НАЧАТЬ')
title('Дальше - ваша комната',36,H-85,33)
title('Подбор: '+rub(total),39,461,22)
paragraph('Без доставки, сборки, отделки и услуги концепции. Остаток условного бюджета: '+rub(sample['budgetRub']-total)+'.',39,440,745,9,muted)
paragraph('В этом образце',39,H-192,345,12,bold=True)
paragraph('1. Направление интерьера и палитра.\n2. Предметный коллаж с реальными товарами.\n3. Подбор: цены, размеры и ссылки на магазины.\n4. Сумма на выбранные предметы.',39,H-222,345,11)
paragraph('Что проверяем до покупки',435,H-192,355,12,bold=True)
paragraph('Размеры комнаты, двери и проходов; размеры мебели; выбранную ткань и цвет; наличие, сроки и стоимость доставки.\nСтол с эффектом травертина в подборке - под заказ; срок указан в его карточке.',435,H-222,355,11)
pdf.setStrokeColor(HexColor('#d8d0c3'));pdf.line(39,273,803,273)
title('Концепция одной комнаты - 5 000 ₽',39,235,24)
paragraph('Один стиль, коллаж, палитра, до 8 предметов со ссылками, одна итерация корректировок, итоговый PDF. Срок согласуем после получения исходных материалов. Корректировка - один список изменений в выбранном стиле.',39,212,745,10)
paragraph('Пришлите фото, размеры, пожелания, бюджет на покупки и город доставки. Концепция не включает обмеры, рабочие чертежи и инженерные решения.',39,143,745,9,muted)
label('Telegram: @Alexfox14',39,86,11)
pdf.linkURL('https://t.me/Alexfox14',(36,77,275,103),relative=0,thickness=0)
label('Портфолио / safal207.github.io',435,86,11)
pdf.linkURL('https://safal207.github.io/safonov-interior-portfolio/',(432,77,800,103),relative=0,thickness=0)
pdf.save()
print(json.dumps({'pdf':str(out/'Olive_Atelier_Sample.pdf'),'moodboard':str(moodpath),'totalRub':sum(i['priceRub']*i['quantity'] for i in sample['items'])},ensure_ascii=False))
