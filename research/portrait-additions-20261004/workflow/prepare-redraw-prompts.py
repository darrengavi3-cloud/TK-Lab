import json,sys,hashlib
from pathlib import Path
root=Path('/workspace/scratch/ea3fed8f4c52');work=root/'work/portraits-20261004'
plan=json.loads((work/'independent-redraw-plan.json').read_text())['records']
orders={int(x) for x in sys.argv[1].split(',')}
progress=json.loads((root/'research/portrait-additions-20261004/production-progress.json').read_text())
ages={r['personId']:r.get('designAge',40) for r in progress['existing']}
rows=[]
for r in plan:
 if r['order'] not in orders:continue
 age=ages.get(r['personId'],40)
 src=root/'site-recovery/atlas'/r['originalSrc'].removeprefix('./')
 sha=hashlib.sha256(src.read_bytes()).hexdigest()
 stem=r['portraitId'].replace(':','-')+'-redraw'
 role='武将，简朴汉魏晋札甲与交领内袍' if r['name'] in ['夏侯惇','曹仁'] else '士人，朴素汉魏晋交领长袍与低矮布巾'
 prompt=f'Use case: historical-scene. Asset type: 观史台独立人物立绘，一人一张PNG。人物：{r["name"]}，男性，艺术表现年龄{age}岁，为生涯阶段设计而非史实肖像。{role}。半写实中国历史游戏人物水墨淡彩，温暖象牙纸，细腻面部骨骼和布帛纹理。9:16竖幅，严格正面平视站姿，头、双肩、躯干正对镜头，双眼直视观众，两侧面部和双肩自然对称。全身从完整冠巾到双脚鞋底，头顶鞋底留边，双手自然垂放完整可见。淡纸本极淡水墨远景。不要其他人物、拼图、书卷扇子、文字水印、夸张奇幻甲胄、兽首肩甲、胸镜披风王冠、明清服装。服饰颜色形制细节均为艺术设计，史料不足待考，不写图中文字。不要照抄其他人物的面貌。'
 rows.append({**r,'designAge':age,'ageBasis':'艺术表现年龄；采用成年生涯阶段，不作为新增生年卒年或真实肖像。','originalSha256':sha,'outputStem':stem,'actualPrompt':prompt})
batch=f'{min(orders):03d}-{max(orders):03d}'
(work/f'redraw-prompts-{batch}.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'batch':batch,'subjects':[{k:r[k] for k in ['order','name','personId','designAge','originalSha256']} for r in rows]},ensure_ascii=False))
