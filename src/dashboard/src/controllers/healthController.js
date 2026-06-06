const database = require('../config/database');

async function getHealthSnapshot() {
  const timestamp = new Date().toISOString();
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Health check timed out')), 1200);
    if (typeof timeoutId.unref === 'function') {
      timeoutId.unref();
    }
  });

  try {
    await Promise.race([database.raw('select 1 as ok'), timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }

  return {
    status: 'ok',
    database: 'connected',
    timestamp
  };
}

async function healthCheck(req, res) {
  try {
    const snapshot = await getHealthSnapshot();

    return res.status(200).json({
      success: true,
      message: 'Service healthy',
      data: snapshot,
      meta: {}
    });
  } catch (error) {
    const timestamp = new Date().toISOString();

    return res.status(503).json({
      success: false,
      message: 'Service degraded',
      data: {
        status: 'degraded',
        database: 'unavailable',
        timestamp
      },
      meta: {}
    });
  }
}

module.exports = {
  getHealthSnapshot,
  healthCheck
};
