(function(global){
  'use strict';
  const records = [
    ['曹操','person:wei:cao-cao','魏','君主','公卿优先','cao-cao.png'],
    ['刘备','person:shu:liu-bei','汉','君主','君主优先','liu-bei.png'],
    ['司马炎','person:jin:sima-yan','晋','君主','君主优先','sima-yan.png'],
    ['司马懿','person:wei:sima-yi','魏／晋','公卿','公卿优先','sima-yi.png'],
    ['司马师','person:unresolved:1tjnx9a','魏／晋','公卿','公卿优先','sima-shi.png'],
    ['诸葛瑾','person:unresolved:0wbpe5n','吴','将军','军政核心','zhuge-jin.png'],
    ['吕岱','person:unresolved:1teot86','吴','将军','军政核心','lu-dai.png'],
    ['丁奉','person:unresolved:0w48d0q','吴','将军','军政核心','ding-feng.png'],
    ['周瑜','person:unresolved:017nhr4','吴','将军','军政核心','zhou-yu.png'],
    ['吕蒙','person:unresolved:1p6qcr2','吴','将军','军政核心','lu-meng.png'],
    ['王濬','person:unresolved:0h6p2zb','晋','将军','西晋核心','wang-jun.png'],
    ['杜预','person:unresolved:12z4250','晋','公卿','西晋核心','du-yu.png'],
    ['石苞','person:jin:shi-bao','晋','将军','西晋核心','shi-bao.png'],
    ['杨骏','person:jin:yang-jun','晋','公卿','西晋核心','yang-jun.png'],
    ['张华','person:source:e2ef6eff3eba','晋','公卿','西晋核心','zhang-hua.png'],
    ['王导','person:source:a93c1fafbcd4','晋','公卿','东晋扩展','wang-dao.png'],
    ['郗鉴','person:jin:xi-jian','晋','公卿','东晋扩展','xi-jian.png'],
    ['桓温','person:jin:huan-wen','晋','将军','东晋扩展','huan-wen.png'],
    ['刘寔','person:jin:liu-shi','晋','公卿','西晋核心','liu-shi.png'],
    ['刘裕','person:jin:liu-yu','晋','将军','东晋扩展','liu-yu.png']
  ];
  const palette={汉:'#A34738',魏:'#376B9E',吴:'#4E6961',晋:'#665483','魏／晋':'#526A78'};
  global.SGZ_V58_PORTRAIT_BOARD = Object.freeze({
    schemaVersion:1, version:'V58', fileKey:'gvWRC5GHHSgd8QX9b2VJgo', count:records.length,
    scope:'V58 界面识别立绘；不构成史实肖像、人物新增或史料证据。',
    records:Object.freeze(records.map((row,index)=>Object.freeze({
      order:index+1,name:row[0],personId:row[1],polity:row[2],role:row[3],priority:row[4],
      src:'./assets/portraits/v58/'+row[5],accent:palette[row[2]]||'#8D948A',
      status:'ready',interfaceOnly:true,designStatus:'figma-design',
      designRef:{fileKey:'gvWRC5GHHSgd8QX9b2VJgo',version:'V58',pageName:'V58 / Portraits',nodeId:null,order:index+1,role:row[3],status:'pending'},
      sourceTitle:'V58 Figma 界面识别立绘（非史实肖像）'
    })))
  });
})(window);
