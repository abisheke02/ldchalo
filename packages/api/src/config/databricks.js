const { DBSQLClient } = require('@databricks/sql');

let client    = null;
let session   = null;

const connectDatabricks = async () => {
  client = new DBSQLClient();

  await client.connect({
    host:      process.env.DATABRICKS_HOST.replace(/^https?:\/\//, ''),
    path:      process.env.DATABRICKS_HTTP_PATH,
    token:     process.env.DATABRICKS_TOKEN,
  });

  session = await client.openSession({
    initialNamespace: {
      catalogName: process.env.DATABRICKS_CATALOG || 'hive_metastore',
      schemaName:  process.env.DATABRICKS_SCHEMA  || 'analytics',
    },
  });

  console.log('[databricks] Connected → SQL Warehouse');
  return session;
};

const runQuery = async (sql, params = []) => {
  if (!session) throw new Error('[databricks] Not connected — call connectDatabricks() first');
  const op = await session.executeStatement(sql, {
    parameters: params,
    runAsync:   false,
  });
  const result = await op.fetchAll();
  await op.close();
  return result;
};

// Fire-and-forget analytics event (non-blocking — never throws)
const trackEvent = async (eventType, properties = {}) => {
  try {
    const catalog = process.env.DATABRICKS_CATALOG || 'hive_metastore';
    const schema  = process.env.DATABRICKS_SCHEMA  || 'analytics';

    await runQuery(
      `INSERT INTO \`${catalog}\`.\`${schema}\`.events
         (event_type, properties, event_ts, ingested_at)
       VALUES (?, ?, current_timestamp(), current_timestamp())`,
      [eventType, JSON.stringify(properties)]
    );
  } catch {
    // Analytics must never block the main request
  }
};

const closeDatabricks = async () => {
  if (session) await session.close();
  if (client)  await client.close();
};

module.exports = { connectDatabricks, runQuery, trackEvent, closeDatabricks };
