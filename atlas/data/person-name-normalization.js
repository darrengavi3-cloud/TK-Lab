(function(global){
  'use strict';
  const traditional='藹奧寶鮑備畢賁邊辯賓並倉禪闡萇瑒暢車綝陳諶誠沖寵疇醜處觸純賜達鄲紞誕當鄧磾東竇篤頓閥範魴飛費奮風鋒豐馮諷鳳輔該蓋幹榦剛綱閣宮龔貢顧關觀廣規媯歸軌貴袞國過韓漢蠔覈賀鶴恆紘閎鴻鵠華懷歡奐渙黃暉會薈渾獲緝機擊績輯紀記旣濟覬繼驥賈堅間戩儉簡賤諫鑒將蔣矯嶠階節晉進覲荊經靚靜舉據軍鈞儁駿開凱愷闓龕闞軻寬壼來賴蘭覽樂離禮勵隸連蓮憐璉涼遼淩靈劉龍婁樓盧魯陸祿輅閭呂慮欒鸞倫羅駱馬滿彌禰謐閔鳴謨謀繆納難內聶寧歐龐貧評憑頎齊騎棄牽僉謙騫潛強喬橋譙欽請瓊權闕羣讓饒榮潤紹詵審聲勝師詩時實勢壽綬樞術雙順碩鑠頌蘇肅謖綏孫臺譚嘆歎濤韜騰統圖團萬韋維偉瑋緯頠韙衛溫烏吳無務騖錫習襲戲賢顯羨憲獻鄉驤詳項嚮囂曉協謝倖興脩繡諝許詡緒續璿學勳尋詢訓遜閻顏嚴鹽儼彥艷鴦陽揚楊颺養瑤業曄禕儀遺頤顗異軼義懌議陰隱應瑩穎顒詠優遊於魚餘輿預禦鬱淵員緣遠約悅嶽雲惲蘊載贊瓚棗則澤棧張長趙謫貞楨禎軫鄭徵摯質騭鍾鐘種衆冑諸莊準資諮綜總鄒組纘';
  const simplified='蔼奥宝鲍备毕贲边辩宾并仓禅阐苌玚畅车𬘭陈谌诚冲宠畴丑处触纯赐达郸𬘘诞当邓䃅东窦笃顿阀范鲂飞费奋风锋丰冯讽凤辅该盖干干刚纲阁宫龚贡顾关观广规妫归轨贵衮国过韩汉蚝核贺鹤恒纮闳鸿鹄华怀欢奂涣黄晖会荟浑获缉机击绩辑纪记既济觊继骥贾坚间戬俭简贱谏鉴将蒋矫峤阶节晋进觐荆经靓静举据军钧俊骏开凯恺闿龛阚轲宽壸来赖兰览乐离礼励隶连莲怜琏凉辽凌灵刘龙娄楼卢鲁陆禄辂闾吕虑栾鸾伦罗骆马满弥祢谧闵鸣谟谋缪纳难内聂宁欧庞贫评凭颀齐骑弃牵佥谦骞潜强乔桥谯钦请琼权阙群让饶荣润绍诜审声胜师诗时实势寿绶枢术双顺硕铄颂苏肃谡绥孙台谭叹叹涛韬腾统图团万韦维伟玮纬𬱟韪卫温乌吴无务骛锡习袭戏贤显羡宪献乡骧详项向嚣晓协谢幸兴修绣谞许诩绪续璇学勋寻询训逊阎颜严盐俨彦艳鸯阳扬杨飏养瑶业晔祎仪遗颐𫖮异轶义怿议阴隐应莹颖颙咏优游于鱼余舆预御郁渊员缘远约悦岳云恽蕴载赞瓒枣则泽栈张长赵谪贞桢祯轸郑征挚质骘钟钟种众胄诸庄准资咨综总邹组缵';
  const sourceChars=Array.from(traditional);
  const targetChars=Array.from(simplified);
  if(sourceChars.length!==targetChars.length) throw new Error('人物姓名繁简映射长度不一致');
  const pairs=Object.freeze(Object.fromEntries(sourceChars.map((char,index)=>[char,targetChars[index]])));
  function toSimplified(value){
    return Array.from(String(value==null?'':value).normalize('NFKC')).map(char=>pairs[char]||char).join('');
  }
  global.SGZ_PERSON_NAME_NORMALIZATION=Object.freeze({
    schemaVersion:1,
    modelId:'person-name-normalization-v61',
    source:Object.freeze({name:'OpenCC TSCharacters',sha256:'737c21c66f55a419dd6956cb3089476cdefc5a36877452631617696df1e5d925'}),
    preservedAmbiguous:Object.freeze(['乾','氾','麴']),
    pairs,
    toSimplified
  });
})(window);
