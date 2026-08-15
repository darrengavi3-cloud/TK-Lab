import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const corpusRoot=path.resolve(process.env.V43_CORPUS_ROOT||'/tmp/v43-corpus');
const generatedAt='2026-08-15T00:00:00+08:00';

function assert(value,message){ if(!value) throw new Error(message); }
function hash(value){ return crypto.createHash('sha256').update(String(value||'')).digest('hex'); }
function shortHash(value){ return hash(value).slice(0,12); }
function cleanText(value){
  return String(value||'')
    .replace(/<!--.*?-->/gs,'')
    .replace(/<ref\b[^>]*>.*?<\/ref>/gs,'')
    .replace(/<[^>]+>/g,'')
    .replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g,'$1')
    .replace(/\[\[([^\]]+)\]\]/g,'$1')
    .replace(/\{\{(?:YL|red|gap|tsl|CJKV)[^{}]*\}\}/g,'')
    .replace(/\{\{[^{}]*\}\}/g,'')
    .replace(/'{2,}/g,'')
    .replace(/[\s\u00a0]+/g,'')
    .trim();
}

function splitPeiNotes(wikitext){
  const notes=[];
  let main='';
  let cursor=0;
  while(cursor<wikitext.length){
    const start=wikitext.indexOf('{{*|',cursor);
    if(start<0){ main+=wikitext.slice(cursor); break; }
    main+=wikitext.slice(cursor,start);
    let depth=0,end=start;
    for(;end<wikitext.length-1;end+=1){
      const pair=wikitext.slice(end,end+2);
      if(pair==='{{'){ depth+=1; end+=1; continue; }
      if(pair==='}}'){
        depth-=1; end+=1;
        if(depth===0){ end+=1; break; }
      }
    }
    notes.push(wikitext.slice(start+4,end-1));
    main+='。';
    cursor=end;
  }
  return {main,notes};
}

const traditionalMap={
  '劉':'刘','孫':'孙','張':'张','趙':'赵','馬':'马','諸':'诸','鍾':'钟','衞':'卫','衛':'卫','鄧':'邓','賈':'贾','顧':'顾','陸':'陆','謝':'谢','楊':'杨','許':'许','嚴':'严','龐':'庞','費':'费','蔣':'蒋','華':'华','黃':'黄','權':'权','禪':'禅','亮':'亮','懿':'懿','師':'师','昭':'昭','嵇':'嵇','顗':'顗','濬':'濬','勖':'勖','祎':'祎','禕':'祎','郤':'郤','樂':'乐','於':'于','萬':'万','馮':'冯','盧':'卢','蘇':'苏','鄭':'郑','韓':'韩','閻':'阎','樊':'樊','傅':'傅','薛':'薛','荀':'荀','郭':'郭','胡':'胡','魏':'魏','曹':'曹','袁':'袁','紹':'绍','畢':'毕','諶':'谌','詡':'诩','繇':'繇','陳':'陈','矯':'矫','曁':'暨','淩':'凌','禮':'礼','資':'资','貴':'贵','觀':'观','沖':'冲','導':'导','穎':'颖','滿':'满','遜':'逊','騭':'骘','奮':'奋','吳':'吴','魯':'鲁','鄒':'邹','羣':'群','業':'业','騫':'骞','渾':'浑','濤':'涛','齊':'齐','駿':'骏','鑒':'鉴','頠':'𫖮','陽':'阳','興':'兴','謙':'谦','肅':'肃','塵':'尘','溫':'温','羨':'羡','籓':'藩','簡':'简','協':'协','組':'组','約':'约','曄':'晔','應':'应','煥':'焕','國':'国','將':'将','軍':'军','車':'车','騎':'骑','驃':'骠','鎮':'镇','東':'东','西':'西','南':'南','北':'北','護':'护','領':'领','從':'从','參':'参','長':'长','書':'书','僕':'仆','門':'门','御':'御','臺':'台','縣':'县','屬':'属','掾':'掾','開':'开','儀':'仪','爲':'为','為':'为','轉':'转','遷':'迁','舉':'举','徵':'征','辟':'辟','拜':'拜','封':'封','龍':'龙','輔':'辅','撫':'抚','祿':'禄','勳':'勋','鴻':'鸿','臚':'胪','農':'农','執':'执','監':'监','後':'后','並':'并','時':'时','濟':'济','涇':'泾','漢':'汉','渭':'渭','澤':'泽','蠡':'蠡','雒':'雒','沔':'沔','灃':'沣','洙':'洙','汶':'汶','漳':'漳','潁':'颍','潯':'浔','瀘':'泸','瀟':'潇','瀨':'濑','淵':'渊','灣':'湾','瀆':'渎','澗':'涧','溝':'沟','渠':'渠','陂':'陂','淀':'淀','湖':'湖','江':'江','河':'河','水':'水','別':'别','駕':'驾','甄':'甄','琅':'琅','邪':'邪','胄':'胄','掾':'掾','屬':'属','書':'书','遷':'迁','穎':'颖','監':'监','導':'导','錄':'录','歷':'历','關':'关','揚':'扬','髯':'髯','遼':'辽','嶷':'嶷','闢':'辟'
};
function simplify(value){ return Array.from(String(value||'')).map(char=>traditionalMap[char]||char).join(''); }

const singleSurnames=Array.from(new Set(Array.from('趙钱孫孙李周吳吴鄭郑王馮冯陳陈褚衛卫蔣蒋沈韓韩楊杨朱秦尤許许何呂吕施張张孔曹嚴严華华金魏陶姜戚謝谢鄒邹喻柏水竇窦章雲云蘇苏潘葛奚范彭郎魯鲁韋韦昌馬马苗鳳凤花方俞任袁柳酆鮑鲍史唐費费廉岑薛雷賀贺倪湯汤滕殷羅罗畢毕郝鄔邬安常樂乐于時时傅皮卞齊齐康伍余元卜顧顾孟平黃黄和穆蕭萧尹姚邵湛汪祁毛禹狄米貝贝明臧計计伏成戴談谈宋茅龐庞熊紀纪舒屈項项祝董梁杜阮藍蓝閔闵席季麻強强賈贾路婁娄危江童顏颜郭梅盛林刁鍾钟徐邱駱骆高夏蔡田樊胡凌霍虞萬万支柯昝管盧卢莫經经房裘繆缪干解應应宗丁宣賁贲鄧邓郁單单杭洪包諸诸左石崔吉鈕钮龔龚程嵇邢滑裴陸陆榮荣翁荀羊甄曲家封芮羿儲储靳汲邴糜松井段富巫烏乌焦巴弓牧隗山谷車车侯宓蓬全郗班仰秋仲伊宮宫甯仇欒栾暴甘鈄钭厲厉戎祖武符劉刘景詹束龍龙葉叶幸司郜黎薊蓟薄印宿白懷怀蒲邰鄂索咸籍賴赖卓藺蔺屠蒙池喬乔陰阴胥能蒼苍雙双聞闻莘黨党翟譚谭貢贡勞劳逄姬申扶堵冉宰酈郦雍卻却璩桑桂濮牛壽寿通邊边扈燕冀郟郏浦尚農农溫温別别莊庄晏柴瞿閻阎充慕連连茹習习宦艾魚鱼容向古易慎戈廖庾終终暨居衡步都耿滿满弘匡國国文寇廣广祿禄闕阙東东歐欧殳沃利蔚越夔隆師师鞏巩厙厍聶聂晁勾敖融冷訾辛闞阚那簡简饒饶空曾毋沙乜養养鞠須须豐丰巢關关蒯相查後后荊荆紅红游竺權权逯蓋盖益桓公仉督岳帥帅緱缑亢況况郈有琴歸归海晉晋楚法汝鄢塗涂欽钦商牟佘佴伯賞赏墨哈譙谯篁年愛爱陽阳佟')));
const compoundSurnames=['司马','诸葛','夏侯','公孙','慕容','皇甫','上官','东方','令狐','毌丘','丘穆陵','长孙','宇文','尉迟','拓跋','呼延','贺兰','轩辕','钟离','淳于','太史','申屠','羊舌','第五','濮阳','公羊','公冶','公良','夹谷'];
const rejectedPeople=new Set(['太祖','高祖','世祖','烈祖','武帝','文帝','明帝','先主','後主','后主','天子','皇帝','陛下','主上','太子','世子','其子','長子','长子','少子','其弟','其兄','使者','有司','群臣','百官','將軍','将军','刺史','太守','司馬','司马','長史','长史','主簿','參軍','参军','尚書','尚书','詔書','诏书','璽書','玺书','又加','復以','复以','仍以','即以','遂以','乃使','其所','天子又使','白衣','蒙逊']);
function extractPersonName(token,officeToken){
  const compact=simplify(String(token||'').replace(/[^\u3400-\u9fff]/g,''));
  if(!compact||/[为以拜除授迁转领兼署辟征召封进改使]/.test(compact)) return '';
  const office=simplify(String(officeToken||''));
  if(/^(?:长史|司马|掾|属|令史|主簿|祭酒|舍人|记室)$/.test(office)&&/(左|右|中|东|西|南|北|前|后|公府|司徒|司空|太尉|尚书|中书|御史|司隶|司隷|三公)$/.test(compact)) return '';
  if(/^(?:刺史|太守|国相|郡守|校尉|都尉|中郎将)$/.test(office)&&/(州|郡|县|国)$/.test(compact)) return '';
  if(/^(?:步|越|屯|长水|射声|虎贲|五校|左卫|右卫|左卫率|右卫率|东部|西部|南部|北部|中部|别部|车骑|骠骑|辅国|镇军|抚军|安|平|征|镇|龙骧|典军|上军|中军|前军|后军|左军|右军|护军|领军)部?$/.test(compact)) return '';
  if(/^(?:司隶|司隷|冀州|兖州|豫州|青州|徐州|扬州|荆州|益州|梁州|凉州|雍州|幽州|并州|交州|广州|宁州|平州|秦州|江州|魏郡|巴郡|吴郡|晋陵|东郡|武陵|汝南|颍川|河内|河东|南阳|涿郡|辽东|襄阳|江夏|庐江|丹阳|会稽|建安|广汉|犍为|蜀郡|汉中|天水|陇西|金城|武威|张掖|酒泉|敦煌)$/.test(compact)) return '';
  if(/(?:王|公|侯|伯|子|男|帝|年|太守|刺史|将军|都督|校尉|司马|长史|主簿|参军|尚书|侍中|太尉|司徒|司空)$/.test(compact)) return '';
  if(/(?:初|后|前|上|下|留|官|更|复|又|遂|乃|即|皆|并|俱|所|者|时)$/.test(compact)) return '';
  if(/(?:族孙|从孙|之孙|其孙|攸孙).$/.test(compact)) return '';
  if(/.+王.$/.test(compact)) return '';
  if(compact.length<=5&&/(?:太祖|高祖|世祖|烈祖|武帝|文帝|明帝|元帝|成帝|宣帝|景帝|天子|皇帝|先主|后主|宣王|[秦汉魏蜀吴燕赵韩齐楚梁陈晋宋鲁]王)/.test(compact)) return '';
  const falseTails=new Set(['祖兖','祖建德','后太祖','王宇','宣王','王子叡','陈宜速','凌就','于是','文雍','和子皓']);
  const actionTail=/^(?:引|請|请|遣|命|使|令|召|辟|徵|征|拜|除|遷|迁|转|轉|领|領|兼|署|为|為|以|所|其|之|者|时|後|后|前|中|左|右|上|下|内|外)$/;
  const officeTail=/^(?:驾|駕|部|隶|隷|令|郎|掾|属|屬|尉|督|帅|帥|尹|卿|监|監|丞|曹|台|臺|府|寺|牧|守|相|将|將|军|軍)$/;
  const placeNames=new Set(['武陵','张掖','吴郡','东郡','魏郡','巴郡','晋陵','汝南','颍川','河内','河东','南阳','涿郡','辽东','襄阳','江夏','庐江','丹阳','会稽','建安','广汉','犍为','蜀郡','汉中','天水','陇西','金城','武威','酒泉','敦煌','司隶','司隷','冀州','兖州','豫州','青州','徐州','扬州','荆州','益州','梁州','凉州','雍州','幽州','并州','交州','广州','宁州','平州','秦州','江州','池阳','黽池','渑池','长沙','建康','鄴','邺']);
  const valid=candidate=>candidate&&!candidate.startsWith('后')&&!candidate.startsWith('祖父')&&!falseTails.has(candidate)&&!rejectedPeople.has(candidate)&&!placeNames.has(candidate)&&!actionTail.test(candidate.slice(-1))&&!officeTail.test(candidate.slice(-1))&&!/(?:太祖|皇帝|天子|先主|后主|宣王|武帝|文帝|明帝|元帝|成帝|门郎)$/.test(candidate);
  for(const surname of compoundSurnames){
    const at=compact.lastIndexOf(surname);
    if(at<0) continue;
    const candidate=compact.slice(at);
    if(candidate.length>=surname.length+1&&candidate.length<=surname.length+2&&valid(candidate)) return candidate;
  }
  const tail2=compact.slice(-2);
  const tail3=compact.slice(-3);
  const tail2Valid=tail2.length===2&&singleSurnames.includes(tail2[0])&&valid(tail2);
  const tail3Valid=tail3.length===3&&singleSurnames.includes(tail3[0])&&valid(tail3);
  const officePrefix=/(?:太尉|司徒|司空|太傅|太保|大将军|将军|都督|州牧|刺史|太守|国相|尚书|侍中|中郎|校尉|司马|长史|主簿|参军|廷尉|大理|卫尉|牧|州|郡)$/;
  const score=(candidate,prefix)=>{
    if(!candidate) return -1;
    if(!prefix) return 8;
    if(officePrefix.test(prefix)) return Math.min(7,3+prefix.length);
    return candidate.length===2?2:1;
  };
  const choices=[];
  if(tail2Valid) choices.push({candidate:tail2,score:score(tail2,compact.slice(0,-2))});
  if(tail3Valid) choices.push({candidate:tail3,score:score(tail3,compact.slice(0,-3))});
  choices.sort((a,b)=>b.score-a.score||a.candidate.length-b.candidate.length);
  if(choices.length) return choices[0].candidate;
  return '';
}

const officePattern='(?:太宰|太傅|太保|太尉|司徒|司空|丞相|相國|大司馬|大將軍|驃騎將軍|車騎將軍|衛將軍|前將軍|後將軍|左將軍|右將軍|征[東西南北]將軍|鎮[東西南北]將軍|安[東西南北]將軍|平[東西南北]將軍|輔國將軍|軍師將軍|將軍|都督[^，。；]{0,8}軍事|都督|州牧|刺史|太守|國相|郡守|縣令|縣長|長|尚書令|尚書僕射|尚書|中書監|中書令|侍中|散騎常侍|黃門侍郎|御史中丞|太常|光祿勳|衛尉|太僕|廷尉|大鴻臚|宗正|大司農|少府|執金吾|司隸校尉|中領軍|中護軍|領軍將軍|護軍將軍|校尉|中郎將|都尉|督郵|別駕|治中|從事中郎|從事|長史|司馬|主簿|參軍|祭酒|掾|郎中|博士|太子太傅|太子少傅|太子詹事|太子中庶子|太子洗馬)';
const appointmentPatterns=[
  new RegExp('(?:乃?以)([\\u3400-\\u9fff]{2,9})(?:為|爲)('+officePattern+')','g'),
  new RegExp('([\\u3400-\\u9fff]{2,9})(?:拜|除|授|遷|轉|領|兼|署|辟|徵|召)(?:為|爲)?('+officePattern+')','g'),
  new RegExp('([\\u3400-\\u9fff]{2,9})(?:為|爲)('+officePattern+')','g'),
  new RegExp('(?:拜|除|授|遷|轉|領|兼|署|辟|徵|召)([\\u3400-\\u9fff]{2,9})(?:為|爲)?('+officePattern+')','g')
];
const titlePattern=new RegExp('(?:封|進封|改封)([\\u3400-\\u9fff]{2,9})(?:為|爲)([\\u3400-\\u9fff]{1,6}(?:王|公|侯))','g');
function serviceDomainFor(office){
  if(/大司马|大将军|将军|都督|校尉|中领军|中护军|司马/.test(office)) return '武官';
  if(/参军|从事中郎/.test(office)) return '文武兼';
  return '文官';
}
function institutionFor(office){
  if(/太子/.test(office)) return '东宫';
  if(/州牧|刺史|别驾|治中|从事/.test(office)) return '州府';
  if(/太守|国相|郡守/.test(office)) return '郡府';
  if(/县令|县长/.test(office)) return '县署';
  if(/都督/.test(office)) return '都督府';
  if(/长史|司马|主簿|参军|军师|祭酒|掾|属|记室|舍人|令史|从事中郎|督/.test(office)){
    if(/丞相|相国/.test(office)) return '丞相府';
    if(/太尉|司徒|司空|太傅|太保|太宰/.test(office)) return '三公府';
    if(/将军|大将军/.test(office)) return '将军府';
    return '待考';
  }
  if(/大将军|将军|太尉|司徒|司空|太傅|太保|太宰|丞相|相国/.test(office)) return '朝廷机关';
  return '朝廷机关';
}
function historicalCue(context){ return /昔|古者|周|秦|漢高祖|汉高祖|前漢|前汉/.test(context.slice(0,28)); }

function extractCandidates(text,metadata){
  const candidates=[];
  let rejected=0;
  const seen=new Set();
  function add(match,personToken,officeToken,kind='office'){
    const traditionalName=extractPersonName(personToken,officeToken);
    if(!traditionalName){ rejected+=1; return; }
    const context=text.slice(Math.max(0,match.index-36),Math.min(text.length,match.index+match[0].length+48));
    if(historicalCue(context)){ rejected+=1; return; }
    const simplifiedName=simplify(traditionalName);
    const name=simplifiedName==='刘障'?'刘璋':simplifiedName;
    const officeName=simplify(officeToken);
    const dedupe=[metadata.work,metadata.volume,metadata.evidenceLayer,name,officeName,context].join('|');
    if(seen.has(dedupe)) return;
    seen.add(dedupe);
    const recordId=`appointment:source:${metadata.workCode}:${metadata.volume}:${shortHash(dedupe)}`;
    const sourcePersonKey=[metadata.workCode,metadata.volume,name].join(':');
    const identity=personIdentities.resolve(name,{polity:'',sourceWork:metadata.work,sourceVolume:metadata.volume,evidenceLayer:metadata.evidenceLayer});
    const ambiguousHomonym=personIdentities.candidateCount(name)>1&&!identity;
    const personId=identity?identity.personId:(ambiguousHomonym?`person:source:${shortHash(sourcePersonKey)}`:`person:source:${shortHash(name)}`);
    const includeInDefault=metadata.workCode==='sgz';
    candidates.push({
      id:recordId,personId,name,aliases:Array.from(new Set([traditionalName,simplifiedName].filter(value=>value&&value!==name))),officeId:`office:source:${shortHash(officeName)}`,officeName,
      relationshipType:kind==='title'?'爵位':'任官',serviceDomain:kind==='title'?'文武兼':serviceDomainFor(officeName),institutionType:kind==='title'?'朝廷机关':institutionFor(officeName),
      startYear:null,endYear:null,sourceTenureText:'原文未结构化纪年',polity:'',researchStatus:'存疑',
      evidenceLayer:metadata.evidenceLayer,sourceWork:metadata.work,sourceVolume:metadata.volume,sourceUrl:metadata.sourceUrl,
      sourceLocator:`${metadata.work}卷${Number(metadata.volume)}${metadata.evidenceLayer==='裴松之注'?'·裴松之注':'·正文'}`,
      sourceExcerpt:simplify(context).slice(0,120),sourceRevision:metadata.sourceRevision,
      homonymGroupId:identity?identity.personId:(ambiguousHomonym?`person:source:${shortHash(sourcePersonKey)}`:`person:source:${shortHash(name)}`),
      homonymStatus:identity?'已按显式身份合并跨卷条目':(ambiguousHomonym?'同名异人待消歧：显式身份表含多个同名候选，按卷次拆分':'同名待消歧：跨卷同名按姓名合并展示，需人工确认异人拆分'),
      scopeStatus:includeInDefault?'推定在168—316年范围':'待人工年代复核',includeInDefault
    });
  }
  appointmentPatterns.forEach(pattern=>{
    pattern.lastIndex=0;
    let match;
    while((match=pattern.exec(text))) add(match,match[1],match[2],'office');
  });
  titlePattern.lastIndex=0;
  let titleMatch;
  while((titleMatch=titlePattern.exec(text))) add(titleMatch,titleMatch[1],titleMatch[2],'title');
  return {candidates,rejected};
}

function readCorpusVolume(folder,number,width){
  const file=path.join(corpusRoot,folder,String(number).padStart(width,'0')+'.json');
  assert(fs.existsSync(file),`missing corpus volume: ${file}`);
  const payload=JSON.parse(fs.readFileSync(file,'utf8'));
  assert(payload.parse?.wikitext,`invalid corpus payload: ${file}`);
  return payload.parse;
}

const identityContext={window:{}};
identityContext.window.window=identityContext.window;
vm.createContext(identityContext);
new vm.Script(fs.readFileSync(path.join(projectRoot,'data/person-identities.js'),'utf8')).runInContext(identityContext);
const personIdentities=identityContext.window.SGZ_PERSON_IDENTITIES;

const coverage=[];
const appointmentRecords=[];
const personById=new Map();
for(const work of [
  {folder:'sanguozhi',work:'《三国志》',workCode:'sgz',total:65,width:2,titlePrefix:'三國志/卷'},
  {folder:'jinshu',work:'《晋书》',workCode:'jinshu',total:130,width:3,titlePrefix:'晉書/卷'}
]){
  for(let number=1;number<=work.total;number+=1){
    const volume=String(number).padStart(work.width,'0');
    const page=readCorpusVolume(work.folder,number,work.width);
    const sourceUrl=`https://zh.wikisource.org/wiki/${work.titlePrefix}${volume}`;
    const layers=[];
    if(work.workCode==='sgz'){
      const split=splitPeiNotes(page.wikitext);
      layers.push({evidenceLayer:'正文',text:cleanText(split.main)});
      split.notes.forEach(note=>layers.push({evidenceLayer:'裴松之注',text:cleanText(note)}));
    }else{
      layers.push({evidenceLayer:'正文',text:cleanText(page.wikitext)});
    }
    let candidateCount=0,rejectedCount=0,defaultCount=0,peiCount=0;
    layers.forEach(layer=>{
      const result=extractCandidates(layer.text,{...work,volume,evidenceLayer:layer.evidenceLayer,sourceUrl,sourceRevision:page.revid});
      candidateCount+=result.candidates.length;
      rejectedCount+=result.rejected;
      result.candidates.forEach(record=>{
        appointmentRecords.push(record);
        if(record.includeInDefault) defaultCount+=1;
        if(record.evidenceLayer==='裴松之注') peiCount+=1;
        if(!personById.has(record.personId)) personById.set(record.personId,{
          personId:record.personId,name:record.name,aliases:record.aliases,sourceIds:[record.id],researchStatus:'存疑',
          homonymGroupId:record.homonymGroupId,homonymStatus:record.homonymStatus,includeInDefault:record.includeInDefault,
          sourceWork:record.sourceWork,sourceVolume:record.sourceVolume,evidenceLayer:record.evidenceLayer
        });
        else{
          const person=personById.get(record.personId);
          if(!person.sourceIds.includes(record.id)) person.sourceIds.push(record.id);
          person.includeInDefault=person.includeInDefault||record.includeInDefault;
          if(person.evidenceLayer!==record.evidenceLayer) person.evidenceLayer='正文＋裴松之注';
        }
      });
    });
    const zeroVolume=candidateCount===0&&rejectedCount===0;
    coverage.push({
      id:`coverage:${work.workCode}:${volume}`,work:work.work,volume:number,sourceTitle:page.title,sourceUrl,
      sourceRevision:page.revid||null,sourceTimestamp:page.timestamp||'',sourceHash:hash(page.wikitext),processedStatus:zeroVolume?'待复核':'已处理',
      candidateCount,includedCount:defaultCount,excludedCount:rejectedCount+(candidateCount-defaultCount),peiAnnotationCount:peiCount,
      exclusionReasons:zeroVolume?['自动扫描未提取到候选，句式覆盖可能不足，需人工复核']:['无明确姓名或不满足姓氏校验','仅为古人追述语境','活动年代超出或尚未确认在168—316年'],
      homonymReview:'显式身份表内的跨卷同人合并为同一稳定 personId；其余按卷次与证据层拆分，待显式消歧。'
    });
  }
}

assert(coverage.length===195,'coverage must contain 195 volumes');
assert(coverage.every(item=>['已处理','待复核'].includes(item.processedStatus)),'unprocessed corpus volume');
assert(coverage.filter(item=>item.processedStatus==='待复核').length<=60,'待复核卷过多，需要继续改进抽取规则');

const waterContext={window:{}};
vm.createContext(waterContext);
new vm.Script(fs.readFileSync(path.join(projectRoot,'assets/map/data/geo-water.js'),'utf8')).runInContext(waterContext);
const waterFeatures=waterContext.window.GEO_WATER;
assert(Array.isArray(waterFeatures)&&waterFeatures.length===285,'water geometry baseline must remain 285');
const waterTexts=[];
for(let number=1;number<=40;number+=1){
  const page=readCorpusVolume('shuijingzhu',number,2);
  waterTexts.push({volume:number,text:cleanText(page.wikitext),revision:page.revid,hash:hash(page.wikitext)});
}
function flattenCoordinates(geometry){
  if(!geometry||!Array.isArray(geometry.coordinates)) return [];
  if(geometry.type==='LineString') return geometry.coordinates;
  if(geometry.type==='MultiLineString'||geometry.type==='Polygon') return geometry.coordinates.flat();
  if(geometry.type==='MultiPolygon') return geometry.coordinates.flat(2);
  return [];
}
function anchorForFeatures(features){
  const points=features.flatMap(feature=>flattenCoordinates(feature.geometry)).filter(point=>Array.isArray(point)&&point.length>=2);
  if(!points.length) return null;
  return points[Math.floor((points.length-1)/2)].slice(0,2).map(value=>Number(Number(value).toFixed(5)));
}
function geometryMagnitude(features){ return features.reduce((total,feature)=>total+flattenCoordinates(feature.geometry).length,0); }
const waterByName=new Map();
waterFeatures.forEach((feature,index)=>{
  const name=String(feature.name||'').trim()||`未命名水体${index+1}`;
  if(!waterByName.has(name)) waterByName.set(name,[]);
  waterByName.get(name).push({...feature,__index:index});
});
const majorNames=new Set(['河水','黄河','江水','长江','淮水','汉水','济水','渭水','洛水','泾水','沔水','洞庭湖','彭蠡泽']);
const hydronyms=[];
for(const [name,features] of waterByName.entries()){
  const aliases=name.split(/[\/／、]/).map(value=>value.trim()).filter(Boolean);
  const variants=new Set([name,...aliases].map(simplify));
  const hits=waterTexts.filter(volume=>Array.from(variants).some(value=>value&&simplify(volume.text).includes(value))).map(volume=>volume.volume);
  const magnitude=geometryMagnitude(features);
  const priority=aliases.some(value=>majorNames.has(value))||majorNames.has(name)?100:(magnitude>=400?80:(magnitude>=180?65:(magnitude>=70?50:35)));
  const minZoom=priority>=100?4:(priority>=80?5:(priority>=65?6:(priority>=50?7:8)));
  hydronyms.push({
    id:`hydronym:${shortHash(name)}`,ancientName:name,aliases:aliases.filter(value=>value!==name),geometryRefs:features.map(feature=>`geo-water:${feature.__index}`),
    geometryFeatureCount:features.length,labelAnchor:anchorForFeatures(features),priority,minZoom,
    sourceIds:hits.map(volume=>`source:shuijingzhu:${String(volume).padStart(2,'0')}`),
    sourceLocators:hits.map(volume=>`《水经注》卷${volume}`),
    evidence:{status:hits.length?'原文命中':'待考',sourceWork:'《水经注》',matchedVolumes:hits,note:'只证明古水名及叙述关系，不作为现代精确几何来源。'},
    geometrySource:{title:'V42 既有 285 段水系几何',type:'地图几何',status:'推定',note:'水名证据与几何来源分离记录；坐标不因原文命中而升级为实测。'},
    researchStatus:hits.length?'推定':'存疑'
  });
}
hydronyms.sort((a,b)=>b.priority-a.priority||a.ancientName.localeCompare(b.ancientName,'zh-CN'));
assert(hydronyms.length===257,'unique hydronym baseline must remain 257');

const sourceIndex={
  schemaVersion:9,modelId:'sgz-person-source-index-v43',generatedAt,scope:'《三国志》65卷及裴松之注、《晋书》130卷；官职或爵位显式关系候选',
  policy:'逐卷处理；自动抽取只生成存疑候选，姓名不作唯一键，正文与裴注分层；显式身份表内跨卷同人合并，其余按卷次与证据层拆分；超出或未确认168—316年的条目不进入默认人物列表。',
  coverage,people:Array.from(personById.values()),appointments:appointmentRecords,
  summary:{volumes:coverage.length,people:personById.size,appointments:appointmentRecords.length,defaultAppointments:appointmentRecords.filter(item=>item.includeInDefault).length,peiAnnotations:appointmentRecords.filter(item=>item.evidenceLayer==='裴松之注').length}
};
const hydronymAudit={
  schemaVersion:9,modelId:'sgz-hydronym-audit-v43',generatedAt,
  baseline:{geometryFeatures:waterFeatures.length,uniqueNames:hydronyms.length,shuijingzhuVolumes:waterTexts.length},
  policy:'《水经注》仅证明名称、流向关系与沿岸地名；古水名证据与 V42 既有几何来源严格分开。',
  sources:waterTexts.map(volume=>({id:`source:shuijingzhu:${String(volume.volume).padStart(2,'0')}`,title:'《水经注》',volume:volume.volume,sourceUrl:`https://zh.wikisource.org/wiki/水經注/${String(volume.volume).padStart(2,'0')}`,sourceRevision:volume.revision,sourceHash:volume.hash})),
  hydronyms
};

function jsModule(globalName,value){ return `(function(global){\n  'use strict';\n  global.${globalName}=Object.freeze(${JSON.stringify(value)});\n})(window);\n`; }
fs.writeFileSync(path.join(projectRoot,'data/person-source-index.js'),jsModule('SGZ_PERSON_SOURCE_INDEX',sourceIndex));
fs.writeFileSync(path.join(projectRoot,'data/person-volume-coverage.json'),JSON.stringify({schemaVersion:9,modelId:sourceIndex.modelId,generatedAt,summary:sourceIndex.summary,coverage},null,2)+'\n');
fs.writeFileSync(path.join(projectRoot,'assets/map/data/hydronym-audit.js'),jsModule('HYDRONYM_AUDIT',hydronymAudit));
fs.writeFileSync(path.join(projectRoot,'data/hydronym-audit.json'),JSON.stringify(hydronymAudit,null,2)+'\n');

console.log(`人物卷次覆盖 ${coverage.length}/195；来源人物 ${personById.size}；任官/爵位候选 ${appointmentRecords.length}`);
console.log(`裴注候选 ${sourceIndex.summary.peiAnnotations}；默认范围候选 ${sourceIndex.summary.defaultAppointments}`);
console.log(`水系几何 ${waterFeatures.length}/285；唯一水名 ${hydronyms.length}/257；《水经注》命中 ${hydronyms.filter(item=>item.evidence.status==='原文命中').length}`);
