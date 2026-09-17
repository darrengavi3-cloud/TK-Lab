import {sql} from 'drizzle-orm';
import {sqliteTable,text,integer,primaryKey,index,uniqueIndex,check} from 'drizzle-orm/sqlite-core';
export const commits=sqliteTable('catalogue_commits',{
  seq:integer('seq').primaryKey({autoIncrement:true}),requestId:text('request_id').notNull().unique(),requestHash:text('request_hash').notNull(),actor:text('actor').notNull(),reason:text('reason').notNull(),at:text('at').notNull(),guard:integer('guard').notNull(),
},t=>[check('catalogue_cas_guard',sql`${t.guard}=1`)]);
export const records=sqliteTable('catalogue_records',{
  id:text('id').primaryKey(),kind:text('kind').notNull(),version:integer('version').notNull(),commitSeq:integer('commit_seq').notNull().references(()=>commits.seq),name:text('name').notNull(),assessment:text('assessment').notNull(),visibility:text('visibility').notNull(),
},t=>[index('idx_catalogue_kind_name').on(t.kind,t.name),check('catalogue_kind',sql`${t.kind} in ('person','appointment','source')`)]);
export const revisions=sqliteTable('catalogue_revisions',{
  id:text('id').notNull().references(()=>records.id),version:integer('version').notNull(),commitSeq:integer('commit_seq').notNull().references(()=>commits.seq),payload:text('payload').notNull(),digest:text('digest').notNull(),
},t=>[primaryKey({columns:[t.id,t.version]}),index('idx_catalogue_snapshot').on(t.commitSeq,t.id)]);
export const people=sqliteTable('catalogue_people',{id:text('id').primaryKey().references(()=>records.id),aliases:text('aliases').notNull(),aliasPublication:text('alias_publication').notNull()});
export const sources=sqliteTable('catalogue_sources',{id:text('id').primaryKey().references(()=>records.id),edition:text('edition').notNull(),locator:text('locator').notNull(),scope:text('scope').notNull()});
export const appointments=sqliteTable('catalogue_appointments',{
  id:text('id').primaryKey().references(()=>records.id),personId:text('person_id').notNull().references(()=>people.id),officeId:text('office_id'),officeName:text('office_name').notNull(),nature:text('nature').notNull(),startYear:integer('start_year'),endYear:integer('end_year'),dateText:text('date_text').notNull(),duplicateOf:text('duplicate_of'),
},t=>[index('idx_catalogue_person_appointments').on(t.personId),check('catalogue_year_order',sql`${t.startYear} is null or ${t.endYear} is null or ${t.startYear}<=${t.endYear}`)]);
export const evidence=sqliteTable('catalogue_evidence',{
  id:text('id').notNull().references(()=>records.id),sourceId:text('source_id').notNull().references(()=>sources.id),sourceVersion:integer('source_version').notNull(),role:text('role').notNull(),note:text('note').notNull(),
},t=>[primaryKey({columns:[t.id,t.sourceId,t.sourceVersion,t.role]}),index('idx_catalogue_cited_source').on(t.sourceId,t.sourceVersion)]);
export const imports=sqliteTable('catalogue_imports',{
  id:text('id').primaryKey(),filename:text('filename').notNull(),originalHash:text('original_hash').notNull(),mapping:text('mapping').notNull(),mappingHash:text('mapping_hash').notNull(),state:text('state').notNull(),total:integer('total').notNull(),at:text('at').notNull(),commitSeq:integer('commit_seq'),
},t=>[uniqueIndex('idx_catalogue_import_identity').on(t.originalHash,t.mappingHash)]);
export const staged=sqliteTable('catalogue_staged',{
  jobId:text('job_id').notNull().references(()=>imports.id),position:integer('position').notNull(),id:text('id').notNull(),baseVersion:integer('base_version').notNull(),payload:text('payload').notNull(),digest:text('digest').notNull(),
},t=>[primaryKey({columns:[t.jobId,t.position]}),uniqueIndex('idx_catalogue_staged_identity').on(t.jobId,t.id)]);
export const objects=sqliteTable('catalogue_objects',{hash:text('hash').primaryKey(),filename:text('filename').notNull(),bytes:integer('bytes').notNull(),mediaType:text('media_type').notNull(),at:text('at').notNull()});
export const releases=sqliteTable('catalogue_releases',{id:text('id').primaryKey(),watermark:integer('watermark').notNull(),digest:text('digest').notNull(),state:text('state').notNull(),codeId:text('code_id').notNull(),manifest:text('manifest').notNull(),at:text('at').notNull(),actor:text('actor').notNull()});
export const publicationEvents=sqliteTable('catalogue_publication_events',{seq:integer('seq').primaryKey({autoIncrement:true}),requestId:text('request_id').notNull().unique(),releaseId:text('release_id').notNull().references(()=>releases.id),previousId:text('previous_id'),actor:text('actor').notNull(),at:text('at').notNull(),action:text('action').notNull(),digest:text('digest').notNull()});
export const settings=sqliteTable('catalogue_settings',{key:text('key').primaryKey(),value:text('value').notNull()});

export const aliases=sqliteTable('catalogue_aliases',{alias:text('alias').primaryKey(),personId:text('person_id').notNull().references(()=>people.id)});
export const readerLinks=sqliteTable('catalogue_reader_links',{
  appointmentId:text('appointment_id').primaryKey().references(()=>appointments.id),
  fangzhenId:text('fangzhen_id').notNull().unique(),
});
