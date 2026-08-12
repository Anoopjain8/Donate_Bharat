const mongoose = require('mongoose');

/**
 * MongoDB transactions require a replica set (true for Atlas, and for
 * docker-compose `mongod --replSet` deployments). Standalone local MongoDB
 * does not support them, so this helper transparently falls back to
 * non-transactional execution in that case.
 *
 * `fn(session)` receives the active session (or `null` when falling back).
 * Inside `fn`, pass `{ session }` as the options argument to queries/writes
 * ONLY when `session` is truthy:
 *
 *   const opts = session ? { session } : {};
 *   await Model.save(opts) / Model.updateOne({}, opts) / Model.create([...], opts)
 *
 * On a standalone deployment, the first transactional operation rejects with
 * MongoServerError code 20 ("Transaction numbers are only allowed on a
 * replica set member or mongos"). Nothing has been persisted by an aborted
 * transaction, so re-running without a session is safe.
 */
const isTransactionUnsupported = (err) =>
  !!err && (err.code === 20 || /Transaction numbers are only allowed/i.test(err.message || ''));

async function runInTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    session.startTransaction();
    try {
      result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (err) {
      await session.abortTransaction();
      if (isTransactionUnsupported(err)) {
        return fn(null);
      }
      throw err;
    }
  } finally {
    session.endSession();
  }
}

module.exports = { runInTransaction, isTransactionUnsupported };
