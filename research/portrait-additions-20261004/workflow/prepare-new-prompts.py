import json,sys
from pathlib import Path
w=Path('/workspace/scratch/ea3fed8f4c52/work/portraits-20261004'); orders={int(x) for x in sys.argv[1].split(',')}; candidates=json.loads((w/'candidates.json').read_text())['records'];rows=[]
for source in candidates:
 if source['order'] not in orders:continue
 r=dict(source); r['actualPrompt']=r['prompt']+'\nAdditional production constraints: 全身从完整冠巾到双脚鞋底，头顶鞋底留安全边距，双手自然垂放完整可见。正面平视站立，头肩躯干全部严格正对镜头，双眼直视观众。朴素汉魏晋衣冠，禁止兽首肩甲、胸镜、尖刺、披风、王冠、明清服装。背景极淡水墨纸本。按'+str(r['designAge'])+'岁刻画面部，不宣称真实肖像。衣冠形制、颜色及纹样为艺术设计，史料不足待考，不在图中写字。';rows.append(r)
batch=f'{min(orders):03d}-{max(orders):03d}'; out=w/f'new-prompts-{batch}.json';out.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n'); Path('/workspace/scratch/ea3fed8f4c52/research/portrait-additions-20261004',f'generation-prompts-{batch}.json').write_bytes(out.read_bytes()); print([(r['order'],r['name'],r['designAge']) for r in rows])
