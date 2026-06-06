const subscribers = new Set();

function subscribe(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }

  subscribers.add(listener);

  return () => {
    subscribers.delete(listener);
  };
}

function publishLowStockUpdate(payload = {}) {
  for (const listener of subscribers) {
    try {
      listener({
        event: 'low-stock-update',
        data: payload
      });
    } catch (error) {
      // Ignore subscriber failures so one broken connection does not block others.
    }
  }
}

module.exports = {
  subscribe,
  publishLowStockUpdate
};
