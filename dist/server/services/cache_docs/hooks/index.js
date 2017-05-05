'use strict';

const globalHooks = require('../../../hooks');
const hooks = require('feathers-hooks-common');

exports.before = {
  // all: [],

  find: [globalHooks.coerceQuery()],

  // get: [],

  create: [hooks.disallow('rest'), globalHooks.timestamp()],

  update: [hooks.disallow('rest'), globalHooks.timestamp()],

  patch: hooks.disallow('rest'),
  remove: hooks.disallow('rest')
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