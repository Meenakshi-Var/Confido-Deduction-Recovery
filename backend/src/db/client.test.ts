import { test } from "node:test";
import assert from "node:assert/strict";
import { initDb, getDb } from "./client";

test("client: named-parameter binding with bare keys (as better-sqlite3/node:sqlite accept) works against @-style SQL placeholders", async () => {
  // Regression test: sql.js's own binding requires the sigil (@/:/$) to be
  // part of the object key, unlike better-sqlite3/node:sqlite. This broke
  // silently during the sql.js migration - INSERTs "succeeded" per the API
  // but every @-bound column landed as NULL, tripping a NOT NULL constraint
  // the moment one was declared. The wrapper in client.ts expands bare keys
  // to all three sigil forms so call sites don't need to know which driver
  // is underneath.
  await initDb(":memory:", true);
  const db = getDb();
  db.exec("CREATE TABLE t (a TEXT NOT NULL, b INTEGER NOT NULL)");

  db.prepare("INSERT INTO t (a, b) VALUES (@a, @b)").run({ a: "hello", b: 42 });

  const row = db.prepare("SELECT * FROM t WHERE a = @a").get({ a: "hello" });
  assert.equal(row.a, "hello");
  assert.equal(row.b, 42);
});

test("client: positional (?) binding still works alongside named binding", async () => {
  await initDb(":memory:", true);
  const db = getDb();
  db.exec("CREATE TABLE t (a TEXT, b INTEGER)");
  db.prepare("INSERT INTO t (a, b) VALUES (?, ?)").run("x", 1);
  const row = db.prepare("SELECT * FROM t WHERE b = ?").get(1);
  assert.equal(row.a, "x");
});

test("client: run() returns lastInsertRowid for an AUTOINCREMENT column", async () => {
  await initDb(":memory:", true);
  const db = getDb();
  db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY AUTOINCREMENT, a TEXT)");
  const r1 = db.prepare("INSERT INTO t (a) VALUES (?)").run("first");
  const r2 = db.prepare("INSERT INTO t (a) VALUES (?)").run("second");
  assert.equal(Number(r2.lastInsertRowid), Number(r1.lastInsertRowid) + 1);
});
