(function(global){
  'use strict';
  const portraits = [
    ['曹操','person:han:cao-cao','汉／魏','君主','丞相／魏王','公卿优先'],['刘备','person:shu:liu-bei','汉','君主','汉中王／皇帝','君主优先'],['刘禅','person:shu:liu-shan','汉','君主','后主','君主优先'],['孙权','person:wu:sun-quan','吴','君主','吴王／皇帝','君主优先'],['孙皓','person:wu:sun-hao','吴','君主','末帝','君主优先'],['司马炎','person:jin:sima-yan','晋','君主','晋武帝','君主优先'],
    ['司马懿','person:wei:sima-yi','魏／晋','公卿','太尉／大将军','公卿优先'],['司马昭','person:jin:sima-zhao','魏／晋','公卿','大将军／相国','公卿优先'],['司马师','person:jin:sima-shi','魏／晋','公卿','大将军','公卿优先'],['司马孚','person:jin:sima-fu','魏／晋','公卿','太宰／太傅','公卿优先'],['诸葛亮','person:shu:zhuge-liang','汉','公卿','丞相','公卿优先'],['蒋琬','person:shu:jiang-wan','汉','公卿','大将军／大司马','公卿优先'],['费祎','person:shu:fei-yi','汉','公卿','大将军','公卿优先'],['董允','person:shu:dong-yun','汉','公卿','侍中／尚书令','公卿优先'],['钟繇','person:wei:zhong-yao','汉／魏','公卿','太尉／相国','公卿优先'],['荀彧','person:wei:xun-yu','汉／魏','公卿','尚书令／侍中','公卿优先'],['荀攸','person:wei:xun-you','汉／魏','公卿','军师／尚书令','公卿优先'],['贾诩','person:wei:jia-xu','汉／魏','公卿','太尉','公卿优先'],['华歆','person:wei:hua-xin','汉／魏','公卿','司徒','公卿优先'],['陈群','person:wei:chen-qun','魏','公卿','司空／尚书令','公卿优先'],
    ['曹仁','person:wei:cao-ren','魏','将军','大将军／车骑将军','军政核心'],['曹真','person:wei:cao-zhen','魏','将军','大将军／司空','军政核心'],['夏侯惇','person:wei:xia-hou-dun','汉／魏','将军','大将军','军政核心'],['曹爽','person:wei:cao-shuang','魏','将军','大将军','军政核心'],['邓艾','person:wei:deng-ai','魏','将军','征西将军','军政核心'],['姜维','person:shu:jiang-wei','汉','将军','大将军','军政核心'],['诸葛瑾','person:wu:zhuge-jin','吴','将军','大将军','军政核心'],['诸葛恪','person:wu:zhuge-ke','吴','将军','大将军','军政核心'],['陆逊','person:wu:lu-xun','吴','将军','上大将军','军政核心'],['吕岱','person:wu:lü-dai','吴','将军','上大将军','军政核心'],['丁奉','person:wu:ding-feng','吴','将军','大将军','军政核心'],['周瑜','person:wu:zhou-yu','吴','将军','大都督／偏将军','军政核心'],['鲁肃','person:wu:lu-su','吴','将军','偏将军','军政核心'],['吕蒙','person:wu:lü-meng','吴','将军','虎威将军','军政核心'],['陆抗','person:wu:lu-kang','吴／晋','将军','镇军将军','军政核心'],
    ['王濬','person:jin:wang-jun','晋','将军','龙骧将军','西晋核心'],['羊祜','person:jin:yang-hu','晋','公卿','征南大将军','西晋核心'],['杜预','person:jin:du-yu','晋','公卿','镇南大将军','西晋核心'],['贾充','person:jin:jia-chong','魏／晋','公卿','车骑将军／司空','西晋核心'],['裴秀','person:jin:pei-xiu','晋','公卿','司空／尚书令','西晋核心'],['何曾','person:jin:he-zeng','魏／晋','公卿','太尉／太保','西晋核心'],['石苞','person:jin:shi-bao','魏／晋','将军','大司马','西晋核心'],['王沈','person:wei:wang-chen','魏／晋','公卿','司空','西晋核心'],['荀勖','person:jin:xun-xu','晋','公卿','中书监／侍中','西晋核心'],['陈泰','person:wei:chen-tai','魏／晋','将军','征西将军','西晋核心'],['杨骏','person:jin:yang-jun','晋','公卿','太尉','西晋核心'],['张华','person:jin:zhang-hua','晋','公卿','司空／侍中','西晋核心'],['王导','person:jin:wang-dao','晋','公卿','丞相','东晋扩展'],['来敏','person:shu:lai-min','汉','文官','典学从事','人物记核心'],['马良','person:shu:ma-liang','汉','文官','侍中／左将军掾','人物记核心']
  ];
  const palette={汉:'#A54136',魏:'#376B9E',吴:'#3F7652',晋:'#665483','汉／魏':'#687681','魏／晋':'#6E5A9E','吴／晋':'#4F756B'};
  global.SGZ_V48_PORTRAIT_BOARD = Object.freeze({
    schemaVersion:1,version:'V48',count:portraits.length,
    scope:'优先君主、公卿及军政核心；立绘为界面识别设计，不是史实肖像复原。',
    records:Object.freeze(portraits.map((row,index)=>Object.freeze({
      order:index+1,name:row[0],personId:row[1],polity:row[2],role:row[3],office:row[4],priority:row[5],accent:palette[row[2]]||'#8D948A',status:'figma-design'
    })))
  });
})(window);
