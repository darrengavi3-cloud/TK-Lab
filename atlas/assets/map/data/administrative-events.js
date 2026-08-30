/* 行政沿革事件表：十一期地图由事件在目标年份的状态推导，不再逐期重复手写郡级合并。 */
(function(global){
  'use strict';
  const events = [
    ["Nan'an",188,'Tianshui','南安郡'],['Xinping',194,'Anding','新平郡'],['Luling',195,'Yuzhang','庐陵郡'],
    ['Chengyang',198,'Beihai State','城阳郡'],['Dongguan',198,'Langya State','东莞郡'],
    ['Daifang',204,'Lelang','带方郡'],['Baxi',201,'Ba','巴西郡'],['Fuling',201,'Ba','涪陵郡'],
    ['Nanxiang',208,'Nanyang','南乡郡'],['Xiangyang',208,'Nan','襄阳郡'],['Xindu',208,'Danyang','新都郡'],
    ['Yidu',210,'Nan','宜都郡'],['Poyang',210,'Yuzhang','鄱阳郡'],['Qiao',213,'Pei State','谯郡'],
    ['Xiping',213,'Jincheng','西平郡'],['Jiangyang',213,'Jianwei','江阳郡'],['Zitong',214,'Guanghan','梓潼郡'],
    ['Zhushi',214,'Zangke','朱提郡'],['Badong',216,'Ba','巴东郡'],['Leping',215,'Taiyuan','乐平郡'],
    ['Xinxing',215,'Taiyuan','新兴郡'],['Weixing',215,'Hanzhong','魏兴郡'],['Gaoliang',218,'Hepu','高凉郡'],
    ['Yinping',219,'Wudu','阴平郡'],['Qichun',220,'Jiangxia','蕲春郡'],['Xincheng',220,'Hanzhong','新城郡'],
    ['Yiyang',221,'Runan','弋阳郡'],['Anfeng',221,'Lujiang','安丰郡'],['Guangping',221,'Wei','广平郡'],
    ['Yangping',221,'Wei','阳平郡'],['Dongguanghan',221,'Guanghan','东广汉郡'],['Hanjia',221,'Shu','汉嘉郡'],
    ['Minshan',221,'Shu','汶山郡'],['Xinggu',225,'Jianning','兴古郡'],['Yunnan',225,'Jianning','云南郡'],
    ['Linhe',226,'Guiyang','临贺郡'],['Shangyong',220,'Xincheng','上庸郡'],['Guangwei',229,'Tianshui','广魏郡'],
    ['Leling State',213,'Pingyuan','乐陵郡'],['Xihai',213,'Zhangye','西海郡'],
    ['Piling Colonel Directing Agriculture',234,'Wu','毗陵典农校尉'],['Changli',238,'Liaodong','昌黎郡'],
    ['Zhuya',242,'Hepu','珠崖郡'],['Pingyang',247,'Hedong','平阳郡'],['Linchuan',257,'Yuzhang','临川郡'],
    ['Linhai',257,'Guiji / Kuaiji','临海郡'],['Xiangdong',257,'Changsha','湘东郡'],['Hengyang',257,'Changsha','衡阳郡'],
    ["Jian'an",260,'Guiji / Kuaiji','建安郡'],['Jianping',260,'Yidu','建平郡'],['Tianmen',263,'Wuling','天门郡']
  ].map(function(row,index){
    return {id:'cmd-establish-'+String(index+1).padStart(2,'0'),entityType:'event',operation:'establish',
      subject:row[0],year:row[1],parentBefore:row[2],label:row[3],confidence:'推定',sourceLevel:'地图考据'};
  });
  const snapshotYears={han184:184,han189:189,han190:190,han194:194,han199:199,han200:200,han208:208,han219:219,three220:220,three228:228,wei264:264,jin266:266,jin290:290,jin311:311};
  const snapshotExceptions={
    // buildCommanderies 已把抚夷护军统一为 Beidi；这里使用归一化后的键，
    // 避免早期快照继续携带一个不会被命中的旧源名。
    han184:{Beidi:'Beidi'},han190:{Beidi:'Beidi'},han194:{Beidi:'Beidi'},
    han200:{Beidi:'Beidi'},han208:{Beidi:'Beidi'},three220:{Beidi:'Beidi'},three228:{Beidi:'Beidi'},
    // 南安郡中平五年（188）置、建安十九年（214）废入陇西，曹魏黄初复置；
    // 219 年快照按“废置”覆写为陇西，220 年及以后恢复显示。
    han219:{'Nan\'an':'Longxi'},
    // 东广汉郡延熙中分广汉置，咸熙初（264）省并广汉。
    wei264:{Dongguanghan:'Guanghan'},jin266:{Dongguanghan:'Guanghan'}
  };
  function mergesAtYear(year){
    const direct=Object.fromEntries(events.filter(function(event){return Number(year)<event.year;}).map(function(event){return [event.subject,event.parentBefore];}));
    // 少数沿革资料会出现“后置郡 -> 已后置郡 -> 更早母郡”的链条。
    // 逐级解析后再交给几何层，确保回溯年份不会只退一层。
    const resolved={};
    Object.keys(direct).forEach(function(subject){
      let target=subject;
      const seen={};
      while(direct[target] && direct[target]!==target && !seen[target]){
        seen[target]=true;
        target=direct[target];
      }
      resolved[subject]=target;
    });
    return resolved;
  }
  function buildPeriodMerges(){
    const out={};
    Object.keys(snapshotYears).forEach(function(key){out[key]=Object.assign(mergesAtYear(snapshotYears[key]),snapshotExceptions[key]||{});});
    return out;
  }
  global.ADMINISTRATIVE_EVENT_MODEL={schemaVersion:1,events:events,snapshotYears:snapshotYears,mergesAtYear:mergesAtYear,buildPeriodMerges:buildPeriodMerges};
})(window);
