'use strict';

const hooks = require('./hooks');
const request = require('request');
const { DOMParser } = require('xmldom');
const { DWMLDocument } = require('../../lib/dwml');

/**
 * Low-level service to retrieve NOAA/NDFD forecast data as JSON.
 *
 * This is a custom service since we need to hit a 3rd party data service.
 */
class Service {
  constructor(options) {
    this.url = options.url;
  }

  setup(app) {
    this.app = app;
  }

  find(params) {
    const requestOpts = {
      headers: {
        'User-Agent': 'request'
      },
      method: 'GET',
      qs: params.query,
      url: this.url
    };

    return new Promise((resolve, reject) => {
      request(requestOpts, (err, response) => err ? reject(err) : resolve(response));
    }).then(response => {
      if (response.statusCode !== 200) {
        return {
          request_options: requestOpts,
          response: response
        };
      }

      const xmlDoc = new DOMParser().parseFromString(response.body, 'text/xml');

      return new DWMLDocument(xmlDoc);
    }).then(dwmlDoc => {
      // Stay async-friendly
      return new Promise((resolve, reject) => {
        setImmediate(() => {
          const parameters = (dwmlDoc.parameters || []).map(parameter => parameter.toJSON());

          resolve({
            request_options: requestOpts,
            parameters: parameters
          });
        });
      });
    }).catch(err => {
      return {
        request_options: requestOpts,
        error: err.message
      };
    });
  }
}

module.exports = function () {
  return function () {
    const app = this;
    const services = app.get('services');

    if (services.ndfd_summarized) {
      app.use('/ndfd/summarized', new Service({
        url: services.ndfd_summarized.url
      }));

      // Get the wrapped service object, bind hooks
      const summarizedService = app.service('/ndfd/summarized');

      summarizedService.before(hooks.before);
      summarizedService.before(hooks.summarizedBefore);
      summarizedService.after(hooks.after);
    }

    if (services.ndfd_unsummarized) {
      app.use('/ndfd/unsummarized', new Service({
        url: services.ndfd_unsummarized.url
      }));

      // Get the wrapped service object, bind hooks
      const unsummarizedService = app.service('/ndfd/unsummarized');

      unsummarizedService.before(hooks.before);
      unsummarizedService.before(hooks.unsummarizedBefore);
      unsummarizedService.after(hooks.after);
    }
  };
}();