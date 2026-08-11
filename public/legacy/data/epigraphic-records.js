/*
 * 金石录目录模型：先建立可审计的空工作台，不把异族材料或未经核定的灰色内容混入。
 * records 保持为空，后续逐条补入时必须同时填写来源、年代状态与著录信息。
 */
window.SGZ_EPIGRAPHIC_RECORDS = Object.freeze({
  schemaVersion: 2,
  scope: '汉末至西晋金石材料',
  note: '板块已建立，碑刻、墓志、摩崖、砖瓦题记与印章待按出土地、年代、释文、著录与拓本逐条补录。异族材料不纳入本板块。',
  types: Object.freeze(['碑刻','墓志','摩崖','砖瓦题记','印章','其他']),
  researchStatuses: Object.freeze(['待补','确定','推定','存疑','争议']),
  fields: Object.freeze([
    'id','name','type','year','yearText','polity','place','region','scriptStyle','form',
    'inscription','bibliography','media','people','offices','sourceTitle','sourceUrl',
    'sourceLevel','sourceLocator','confidence','researchStatus','disputeNote','note'
  ]),
  records: []
});
