(function (global) {
  function applyOfficeSuccession(node, factionKey, payload = global.SGZ_OFFICE_SUCCESSION) {
    if (node.kind !== 'office') return node;
    const office = payload?.offices.find(row => row.factionKey === factionKey && row.name === node.name);
    if (!office) return node;
    const covered = new Set(office.appointments.map(row => row.name));
    const retained = (node.figures || []).filter(row => !covered.has(
      typeof row === 'string' ? row.split(/[（(]/)[0] : row.name));
    node.figures = [...retained, ...office.appointments.map(row => ({
      id: row.appointmentId, personId: row.personId, name: row.name,
      startYear: row.startYear, endYear: row.endYear,
      note: [row.officeName, ...row.citations.map(c => c.note).filter(Boolean)].join('；'),
      citations: row.citations
    }))];
    node.evolution = office.appointments.map(row =>
      `${row.startYear === null ? '始任年未详' : row.startYear + '年'}：${row.name}任${row.officeName}` +
      (row.endYear === null ? '（终年未详）' : `（本次任职止于${row.endYear}年）`) +
      (row.citations.some(c => c.note) ? `；${row.citations.map(c => c.note).filter(Boolean).join('；')}` : '')
    ).join('。') + '。任官年代不等同于制度设置年代。';
    // These legacy boundaries were derived from personal tenures rather than
    // institution evidence. Keep their uncertainty explicit after cache import.
    if (node.name === '大将军' || node.name === '大司马') {
      node.officeStartYear = null; node.officeEndYear = null;
      delete node.establishedYear; delete node.abolishedYear;
    }
    node.evolutionEvents = [];
    return node;
  }
  global.SGZ_APPLY_OFFICE_SUCCESSION = applyOfficeSuccession;
})(typeof window === 'undefined' ? globalThis : window);
