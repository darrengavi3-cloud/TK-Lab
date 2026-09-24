-- Additive private research journal. No existing fact, owner or release is changed.
CREATE TABLE catalogue_research_revisions (
  person_id TEXT NOT NULL REFERENCES catalogue_people(id),
  version INTEGER NOT NULL CHECK(version > 0),
  request_id TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  catalogue_watermark INTEGER NOT NULL REFERENCES catalogue_commits(seq),
  graph TEXT NOT NULL CHECK(json_valid(graph)),
  graph_digest TEXT NOT NULL,
  manifest TEXT NOT NULL CHECK(json_valid(manifest)),
  manifest_digest TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT NOT NULL CHECK(length(trim(reason)) > 0),
  at TEXT NOT NULL,
  guard INTEGER NOT NULL CONSTRAINT research_cas_guard CHECK(guard = 1),
  PRIMARY KEY(person_id, version)
);
--> statement-breakpoint
-- Typed per-revision indexes, not a replacement for the domain's typed objects.
CREATE TABLE catalogue_research_members (
  person_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('tenures','events','claims','evidence','factualConflicts','textualVariants')),
  id TEXT NOT NULL,
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  PRIMARY KEY(person_id, version, kind, id),
  FOREIGN KEY(person_id, version) REFERENCES catalogue_research_revisions(person_id, version)
);
--> statement-breakpoint
CREATE TABLE catalogue_research_pins (
  person_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  record_id TEXT NOT NULL,
  record_version INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('person','appointment','source')),
  digest TEXT NOT NULL,
  PRIMARY KEY(person_id, version, record_id, record_version),
  FOREIGN KEY(person_id, version) REFERENCES catalogue_research_revisions(person_id, version),
  FOREIGN KEY(record_id, record_version) REFERENCES catalogue_revisions(id, version)
);
--> statement-breakpoint
CREATE INDEX idx_research_pin_impact ON catalogue_research_pins(record_id, record_version);
--> statement-breakpoint
CREATE TRIGGER research_revisions_no_update BEFORE UPDATE ON catalogue_research_revisions BEGIN SELECT RAISE(ABORT, 'immutable research revision'); END;
--> statement-breakpoint
CREATE TRIGGER research_revisions_no_delete BEFORE DELETE ON catalogue_research_revisions BEGIN SELECT RAISE(ABORT, 'immutable research revision'); END;
--> statement-breakpoint
CREATE TRIGGER research_members_no_update BEFORE UPDATE ON catalogue_research_members BEGIN SELECT RAISE(ABORT, 'immutable research member'); END;
--> statement-breakpoint
CREATE TRIGGER research_members_no_delete BEFORE DELETE ON catalogue_research_members BEGIN SELECT RAISE(ABORT, 'immutable research member'); END;
--> statement-breakpoint
CREATE TRIGGER research_pins_no_update BEFORE UPDATE ON catalogue_research_pins BEGIN SELECT RAISE(ABORT, 'immutable research pin'); END;
--> statement-breakpoint
CREATE TRIGGER research_pins_no_delete BEFORE DELETE ON catalogue_research_pins BEGIN SELECT RAISE(ABORT, 'immutable research pin'); END;
