const { MongoClient } = require('mongodb');

let client = null;
let db     = null;

const connectMongo = async () => {
  const uri    = process.env.MONGODB_URL;
  const dbName = process.env.MONGODB_DB_NAME || 'school_erp';

  client = new MongoClient(uri, {
    serverApi:            { version: '1', strict: true, deprecationErrors: true },
    maxPoolSize:          10,
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS:      45_000,
    tls:                  true,
  });

  await client.connect();
  db = client.db(dbName);
  await db.command({ ping: 1 });
  console.log(`[mongo] Connected → ${dbName} @ Atlas`);
  return db;
};

const getDb  = () => {
  if (!db) throw new Error('[mongo] Call connectMongo() before getDb()');
  return db;
};

const col = (name) => getDb().collection(name);

const closeMongo = async () => {
  if (client) await client.close();
};

module.exports = { connectMongo, getDb, col, closeMongo };
