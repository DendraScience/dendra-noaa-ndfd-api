'use strict';

const hooks = require('./hooks');

/**
 * Low-level service to retrieve NOAA/NDFD time-series forecast data.
 *
 * This is a custom service since we need to hit a 3rd party data service.
 */
class Service {
  // constructor (options) {
  //   // TODO: Finish this!
  // }

  find(params) {
    // TODO: Return cached data or make REST call and cache response
    // TODO: Finish this!
  }
}

module.exports = function () {
  return function () {
    const app = this;
    const databases = app.get('databases');

    if (databases.nedb && databases.nedb.cache) {
      app.set('serviceReady', Promise.resolve(databases.nedb.cache.db).then(db => {
        app.use('/ndfd/time-series', new Service({
          // TODO: Finish this!
        }));

        // Get the wrapped service object, bind hooks
        const timeSeriesService = app.service('/ndfd/time-series');

        timeSeriesService.before(hooks.before);
        timeSeriesService.after(hooks.after);
      }));
    }
  };
}();