'use strict';

const globalHooks = require('../../../hooks');
const hooks = require('feathers-hooks-common');

function formatDate(date) {
  return date.toISOString().substr(0, 10);
}

function formatDateTime(date) {
  return date.toISOString().substr(0, 19);
}

exports.before = {
  // all: [],

  find: [globalHooks.coerceQuery(), hook => {
    const query = hook.params.query;

    if (query.lng) query.lon = query.lng;
    if (query.unit) query.Unit = query.unit;
  }, hooks.removeQuery('lng', 'unit')],

  get: hooks.disallow(),
  create: hooks.disallow(),
  update: hooks.disallow(),
  patch: hooks.disallow(),
  remove: hooks.disallow()
};

exports.summarizedBefore = {
  // all: [],

  find: [hook => {
    const query = hook.params.query;

    if (typeof query.format !== 'string') query.format = '24 hourly';

    // Eval 'time' query field
    if (typeof query.time === 'object') {
      const queryTime = query.time;

      if (queryTime.$gt instanceof Date) {
        query.startDate = formatDate(new Date(queryTime.$gt.getTime() + 86400 * 1000));
      } else if (queryTime.$gte instanceof Date) {
        query.startDate = formatDate(queryTime.$gte);
      }

      // NOTE: For now we ignore queryTime.$lt and queryTime.$lte
    }
  }, hooks.removeQuery('time')]

  // get: [],
  // create: [],
  // update: [],
  // patch: [],
  // remove: []
};

exports.unsummarizedBefore = {
  // all: [],

  find: [hook => {
    const query = hook.params.query;

    if (typeof query.product !== 'string') query.product = 'time-series';

    // Eval 'time' query field
    if (typeof query.time === 'object') {
      const queryTime = query.time;

      if (queryTime.$gt instanceof Date) {
        query.begin = formatDateTime(new Date(queryTime.$gt.getTime() + 1000));
      } else if (queryTime.$gte instanceof Date) {
        query.begin = formatDateTime(queryTime.$gte);
      }

      if (queryTime.$lt instanceof Date) {
        query.end = formatDateTime(new Date(queryTime.$lt.getTime() - 1000));
      } else if (queryTime.$lte instanceof Date) {
        query.end = formatDateTime(queryTime.$lte);
      }
    }
  }, hooks.removeQuery('time')]

  // get: [],
  // create: [],
  // update: [],
  // patch: [],
  // remove: []
};

exports.after = {
  // all: [],
  // find: [],
  // get: [],
  // create: [],
  // update: [],
  // patch: [],
  // remove: []
};