#!/usr/bin/env python3
"""Materialize the frozen research-only pilot from explicitly downloaded sources.

Images/annotations are not shipped in the app. --download is always explicit.
"""
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import shutil
import urllib.request

from PIL import Image


class Rows(HTMLParser):
    def __init__(self):
        super().__init__();self.rows=[];self.active=False
    def handle_starttag(self,tag,attrs):
        if tag=='tr':self.rows.append([])
        if tag=='td':self.active=True;self.rows[-1].append('')
    def handle_endtag(self,tag):
        if tag=='td':self.active=False
    def handle_data(self,text):
        if self.active:self.rows[-1][-1]+=text


def digest(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def prepare(manifest_path,cache,output,download=False):
    manifest_path=Path(manifest_path);manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    cache=Path(cache);cache.mkdir(parents=True,exist_ok=True)
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    base=manifest['source']+'/resolve/'+manifest['revision']+'/'
    def obtain(name,sha,url):
        target=cache/name
        if not target.exists():
            if not download:raise ValueError('Missing local source; use --download explicitly: '+name)
            with urllib.request.urlopen(url,timeout=120) as source,target.open('xb') as dest:
                shutil.copyfileobj(source,dest)
        if digest(target)!=sha:raise ValueError('Source checksum mismatch: '+name)
        return target
    annotations=json.loads(obtain('OmniDocBench.json',manifest['annotation_sha256'],base+'OmniDocBench.json').read_text(encoding='utf-8'))
    suite={'schema_version':2,'kind':manifest['kind'],'source_manifest_sha256':digest(manifest_path),
           'gt_policy':manifest['gt_policy'],'license_note':manifest['license_note'],'cases':[]}
    for entry in manifest['cases']:
        if 'page_index' not in entry:
            image=manifest_path.parent/entry['source']
            if digest(image)!=entry['source_sha256']:raise ValueError('Screenshot checksum mismatch')
            shutil.copyfile(image,output/entry['image']);regions=entry['regions'];ignore=[]
        else:
            image=obtain(entry['source'],entry['source_sha256'],base+'images/'+entry['source'])
            page=annotations[entry['page_index']]
            if page['page_info']['image_path']!=entry['source']:raise ValueError('Source annotation identity mismatch')
            x0,y0,x1,y1=entry['crop']
            with Image.open(image) as im:im.crop(entry['crop']).save(output/entry['image'])
            def box(b):
                p=b['poly'];xs=p[::2];ys=p[1::2]
                return [min(xs)-x0,min(ys)-y0,max(xs)-x0,max(ys)-y0]
            regions=[];ignore=[]
            if 'table_id' in entry:
                table=next(b for b in page['layout_dets'] if b['anno_id']==entry['table_id'])
                rows=Rows();rows.feed(table['html'])
                ys=entry['table_rows']
                if len(rows.rows)!=len(ys)-1:raise ValueError('Table row count differs')
                for i,row in enumerate(rows.rows):
                    regions.append({'id':str(i),'box':[0,ys[i]-y0,x1-x0,ys[i+1]-y0],'text':' '.join(row)})
            else:
                ids=entry['annotation_ids']
                for b in sorted(page['layout_dets'],key=lambda b:b['order'] if b.get('order') is not None else 1e9):
                    if (ids=='all_text' and b.get('text') and not b.get('ignore')) or (isinstance(ids,list) and b['anno_id'] in ids):
                        text=b['text']
                        for a,z in entry.get('literal_replacements',{}).items():text=text.replace(a,z)
                        if '$' in text:raise ValueError('Unconverted rich text in ground truth: '+b['anno_id'])
                        regions.append({'id':b['anno_id'],'box':box(b),'text':text})
                    elif ids=='all_text' and b['category_type'] in ('figure','abandon'):
                        ignore.append(box(b))
            if not regions:raise ValueError('Empty reference regions')
        suite['cases'].append({'id':entry['id'],'category':entry['category'],'image':entry['image'],
             'image_sha256':digest(output/entry['image']),'regions':regions,'ignore_regions':ignore})
    path=output/'suite.json'
    serialized=json.dumps(suite,ensure_ascii=False,indent=2)+'\n'
    if path.exists() and path.read_text(encoding='utf-8')!=serialized:
        raise ValueError('Existing frozen suite differs; use a new output directory')
    path.write_text(serialized,encoding='utf-8')
    print(json.dumps({'suite':str(path),'sha256':digest(path),'cases':len(suite['cases'])}))


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--sources',default=str(Path(__file__).resolve().parents[1]/'docs/acceptance/sources.json'))
    p.add_argument('--cache',required=True);p.add_argument('--output',required=True)
    p.add_argument('--download',action='store_true');args=p.parse_args()
    prepare(args.sources,args.cache,args.output,args.download)
