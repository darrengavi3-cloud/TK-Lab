import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = { window:{} }; context.window.window = context.window; vm.createContext(context);
new vm.Script(fs.readFileSync(path.join(root,'data/person-source-index.js'),'utf8')).runInContext(context);
const people = context.window.SGZ_PERSON_SOURCE_INDEX.people;

const traditionalMap = {'劉':'刘','孫':'孙','張':'张','趙':'赵','馬':'马','諸':'诸','鍾':'钟','衞':'卫','衛':'卫','鄧':'邓','賈':'贾','顧':'顾','陸':'陆','謝':'谢','楊':'杨','許':'许','嚴':'严','龐':'庞','費':'费','蔣':'蒋','華':'华','黃':'黄','權':'权','禪':'禅','禕':'祎','祎':'祎','溫':'温','淵':'渊','遜':'逊','騭':'骘','奮':'奋','吳':'吴','魯':'鲁','鄒':'邹','羣':'群','業':'业','騫':'骞','渾':'浑','濤':'涛','齊':'齐','駿':'骏','鑒':'鉴','頠':'𫖮','陽':'阳','興':'兴','謙':'谦','肅':'肃','導':'导','錄':'录','歷':'历','關':'关','揚':'扬','遼':'辽','別':'别','駕':'驾','為':'为','爲':'为'};
const simplify = value => Array.from(String(value||'')).map(ch=>traditionalMap[ch]||ch).join('');

const hits = [];
['sanguozhi','jinshu'].forEach(folder=>{
  const total = folder==='sanguozhi' ? 65 : 130;
  for(let i=1;i<=total;i++){
    const file = path.join('/tmp/v43-corpus',folder,String(i).padStart(folder==='sanguozhi'?2:3,'0')+'.json');
    if(!fs.existsSync(file)) continue;
    const text = JSON.parse(fs.readFileSync(file,'utf8')).parse.wikitext
      .replace(/<ref\b[^>]*>.*?<\/ref>/gs,'').replace(/<[^>]+>/g,'').replace(/'{2,}/g,'').replace(/\s+/g,'');
    for(const person of people){
      const names = new Set([person.name, simplify(person.name)].filter(Boolean));
      for(const name of names){
        const re = new RegExp(name+'[，。；,]{0,2}字([\\u3400-\\u9fff]{1,3})(?:[，。；,])','g');
        let m;
        while((m=re.exec(text))){
          hits.push({name:person.name,zi:m[1],vol:(folder==='sanguozhi'?'三':'晋')+i,sourceUrl:`https://zh.wikisource.org/wiki/${folder==='sanguozhi'?'三國志/卷':'晉書/卷'}${String(i).padStart(folder==='sanguozhi'?2:3,'0')}`});
        }
      }
    }
  }
});

const best = new Map();
hits.forEach(hit=>{
  if(!best.has(hit.name) || (hit.zi.length<=2 && best.get(hit.name).zi.length>2)) best.set(hit.name,hit);
});
const out = [...best.values()].sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
fs.writeFileSync(path.join(root,'data/person-zi-scan.json'),JSON.stringify({generatedAt:new Date().toISOString(),method:'扫描《三国志》《晋书》语料“名，字X”句式',hits:out,summary:{total:out.length}},null,2)+'\n');
console.log(`表字扫描：命中 ${out.length} 人`);
out.slice(0,40).forEach(h=>console.log(`${h.name} 字${h.zi}（卷${h.vol}）`));
