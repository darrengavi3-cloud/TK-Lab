#!/usr/bin/env python3
"""Generate a fixed synthetic regression set, NOT a real historical-text benchmark."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

CASES = [
    ('simplified',32,['离线文字识别应保留每一段正文。','识别结果需要核对，不能擅自删改。','文件编号：A-260；页码：001。'],'plain'),
    ('traditional',38,['原註須存，不得刪略。','異體字依原樣保留。','疑字另記，勿自行補文。'],'plain'),
    ('small_text',14,['正文與夾注皆須完整保存。','反切、引書與異體字不可刪除。','凡字形難辨者，當據原圖核定。'],'plain'),
    ('blur',28,['春雨初晴，山川澄明。','書頁微損，文字尚可辨。','校者錄其原文，別記疑義。'],'blur'),
    ('low_contrast',26,['官職、地名與人名應逐項核對。','不得以摘要代替正文。','編號二六〇，卷次第十三。'],'faint'),
    ('vertical',32,['天地玄黃宇宙洪荒','日月盈昃辰宿列張','寒來暑往秋收冬藏'],'vertical'),
    ('two_columns',24,['右欄首行：原文須存。','右欄次行：校語另記。','左欄首行：不得補文。','左欄次行：據圖辨字。'],'columns'),
    ('rare_characters',36,['𠮷、𡈽、㠯、祕、祠、禮。','註、注、於、于、後、后。','刺史、太守、都督、侍中。'],'plain'),
    ('blank',24,[],'plain'),
]


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--font',required=True,type=Path)
    p.add_argument('--output',required=True,type=Path)
    args=p.parse_args()
    args.output.mkdir(parents=True,exist_ok=False)
    suite={'schema_version':1,'kind':'synthetic_regression','font_sha256':hashlib.sha256(args.font.read_bytes()).hexdigest(),
           'note':'Original authored text plus public-domain short phrases; no real-scan accuracy claim. References frozen before inference.', 'cases':[]}
    for name,size,lines,layout in CASES:
        font=ImageFont.truetype(str(args.font),size)
        image=Image.new('RGB',(820,420),'white')
        draw=ImageDraw.Draw(image)
        fill=(170,170,170) if layout=='faint' else (20,20,20)
        for i,line in enumerate(lines):
            if layout=='vertical':
                for j,char in enumerate(line):
                    draw.text((720-i*70,20+j*36),char,font=font,fill=fill)
            elif layout=='columns':
                draw.text((430 if i<2 else 30,50+(i%2)*70),line,font=font,fill=fill)
            else:
                draw.text((25,25+i*(size+30)),line,font=font,fill=fill)
        if layout=='blur':
            image=image.filter(ImageFilter.GaussianBlur(0.9))
        path=args.output/(name+'.png')
        image.save(path)
        image.close()
        suite['cases'].append({'id':name,'image':path.name,'image_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                               'reference':'\n'.join(lines),'layout':layout})
    (args.output/'suite.json').write_text(json.dumps(suite,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(args.output/'suite.json')


if __name__=='__main__':
    main()
