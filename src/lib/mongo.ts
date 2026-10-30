import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "mycelium";

declare global {
  // eslint-disable-next-line no-var
  var _myceliumMongo: Promise<MongoClient> | undefined;
}

export async function getDb(): Promise<Db> {
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!global._myceliumMongo) {
    global._myceliumMongo = new MongoClient(uri).connect().then(async (client) => {
      const db = client.db(dbName);
      await Promise.all([
        db.collection("people").createIndex({ owner: 1 }),
        db.collection("links").createIndex({ owner: 1 }),
        db.collection("users").createIndex({ email: 1 }, { unique: true }),
        db.collection("allowlist").createIndex({ email: 1 }, { unique: true }),
        db.collection("intros").createIndex({ toEmail: 1 }),
        db.collection("intros").createIndex({ fromEmail: 1 }),
      ]).catch(() => {});
      return client;
    });
  }
  const client = await global._myceliumMongo;
  return client.db(dbName);
}
