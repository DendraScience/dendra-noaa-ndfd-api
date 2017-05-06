'use strict';

const crypto = require('crypto');
const feathersQueryFilters = require('feathers-query-filters');
const hooks = require('./hooks');

function hashId(obj) {
  const data = JSON.stringify(obj);
  return crypto.createHash('sha1').update(data).digest('hex');
}

function dateSortPredicateAsc(a, b) {
  return a.time.start_date.getTime() - b.time.start_date.getTime();
}

function dateSortPredicateDesc(a, b) {
  return b.time.start_date.getTime() - a.time.start_date.getTime();
}

/**
 * High-level service to retrieve NOAA/NDFD forecast data as JSON.
 *
 * This is a custom service since we need to hit a 3rd party data service.
 */
class Service {
  constructor(options) {
    this.paginate = options.paginate || {};
  }

  setup(app) {
    this.app = app;
  }

  find(params) {
    /*
      Standard Feathers service preamble, adapted from feathers-sequelize.
     */

    const paginate = params && typeof params.paginate !== 'undefined' ? params.paginate : this.paginate;
    const getFilter = feathersQueryFilters(params.query, paginate);
    const filters = getFilter.filters;
    const query = getFilter.query;

    const docKeys = Object.assign({}, query);
    delete docKeys.parameter;

    const docId = hashId(docKeys);
    const docService = this.app.service('/cache/docs');

    /*
      Generate doc id from hash of query params. Attempt to find a cached DWML doc, or find and cache a new one.
     */

    return docService.get(docId).then(doc => {
      // TODO: Touch doc to keep in cache longer
      return doc;
    }).catch(err => {
      if (err.code !== 404) return err;

      // Cached doc not found, so prepare a query for the NDFD service
      const ndfdQuery = Object.assign({}, query);
      delete ndfdQuery.interface;
      delete ndfdQuery.parameter;

      return ndfdQuery;
    }).then(docOrQuery => {
      // If this is an existing doc, then use it - otherwise fetch a new DWML doc using the prepared query
      if (docOrQuery._id) return docOrQuery;

      return this.app.service(`/ndfd/${query.interface}`).find({ query: docOrQuery });
    }).then(doc => {
      // If this is an existing doc, then use it - otherwise cache the DWML doc
      if (doc._id) return doc;
      doc._id = docId;

      return docService.create(doc);
    }).then(doc => {
      // Find parameter in DWML doc
      const found = doc.parameters.find(parameter => {
        return parameter.name === query.parameter.name;
      });

      /*
        Prepare and return response.
       */

      const res = {
        limit: filters.$limit,
        data: found ? found.series : []
      };

      // Sort and trim
      if (typeof filters.$sort === 'object' && typeof filters.$sort.time !== 'undefined') {
        res.data = filters.$sort.time === -1 ? res.data.sort(dateSortPredicateDesc) : res.data.sort(dateSortPredicateAsc);
      }
      if (res.data.length > filters.$limit) res.data.length = filters.$limit;

      return res;
    });
  }
}

module.exports = function () {
  return function () {
    const app = this;
    const services = app.get('services');

    if (services.series) {
      app.use('/series', new Service({
        paginate: services.series.paginate
      }));

      // Get the wrapped service object, bind hooks
      const seriesService = app.service('/series');

      seriesService.before(hooks.before);
      seriesService.after(hooks.after);
    }
  };
}();