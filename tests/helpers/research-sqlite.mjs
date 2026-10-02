import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';

/** Real SQLite with a D1-shaped adapter. This is NOT a Cloudflare D1 runtime. */
export function sqliteDatabase({migrateResearch = true} = {}) {
  const sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON');
  for (const file of ['0000_salty_weapon_omega.sql','0001_flimsy_fantastic_four.sql','0002_bent_silver_sable.sql',...(migrateResearch ? ['0003_research_journal.sql'] : [])]) sql.exec(readFileSync('drizzle/' + file, 'utf8'));
  const db = {
    sql, beforeBatch: null,
    prepare(query) {
      const result = args => ({
        query, args,
        bind(...values) {return result(values);},
        async first() {return sql.prepare(query).get(...args) ?? null;},
        async all() {return {results: sql.prepare(query).all(...args)};},
        async run() {return {success: true, meta: sql.prepare(query).run(...args)};},
      });
      return result([]);
    },
    async batch(commands) {
      if (db.beforeBatch) {const hook=db.beforeBatch;db.beforeBatch=null;await hook();}
      sql.exec('BEGIN IMMEDIATE');
      try {
        const results = commands.map(({query,args}) => /^\s*SELECT/i.test(query) ? {results: sql.prepare(query).all(...args)} : {results: [], success: true, meta: sql.prepare(query).run(...args)});
        sql.exec('COMMIT');return results;
      } catch (error) {sql.exec('ROLLBACK');throw error;}
    },
    close() {sql.close();},
  };
  return db;
}
