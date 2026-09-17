import type {CatalogueRecord} from './catalogue';
export function createRecord(kind:CatalogueRecord['kind'],id:string):CatalogueRecord{
  const h={id,assessment:'pending' as const,workflow:'draft' as const,visibility:'private' as const,disposition:'none' as const,reason:'',evidence:[]};
  if(kind==='person')return {...h,kind,name:'',aliases:[],aliasPublication:'private',legacyIds:[]};
  if(kind==='source')return {...h,kind,title:'',edition:'',locator:'',text:'',textScope:'excerpt',url:''};
  return {...h,kind,personId:'',officeId:null,officeName:'',nature:'待考',polity:'',jurisdiction:'',date:{original:'',startYear:null,endYear:null,precision:'unknown',certainty:'unknown',basis:''},duplicateOf:null};
}
