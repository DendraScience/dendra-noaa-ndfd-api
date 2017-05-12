'use strict';

// Add any common hooks you want to share across services in here.
//
// Below is an example of how a hook is written and exported. Please
// see http://docs.feathersjs.com/hooks/readme.html for more details
// on hooks.
//
// exports.myHook = (options) => {
//   return (hook) => {
//     console.log('My custom global hook ran. Feathers is awesome!')
//   }
// }

// TODO: Query hooks should allow multiple fields to be specified?
// TODO: Add option to ValidationContext for servicePath?

const { treeMap } = require('../lib/utils');

// Regular expressions for data type detection
const ISO_DATE_REGEX = /^([0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9]).([0-9]{3})Z$/i;

function coercer(obj, path) {
  if (typeof obj !== 'string') return obj;

  if (ISO_DATE_REGEX.test(obj)) {
    const ms = Date.parse(obj);
    if (!isNaN(ms)) return new Date(ms);
  }
  return obj;
}

exports.coerce = () => {
  return hook => {
    if (typeof hook.data === 'undefined') return;
    hook.data = treeMap(hook.data, coercer);
  };
};

exports.coerceQuery = () => {
  return hook => {
    if (typeof hook.params.query === 'undefined') return;
    hook.params.query = treeMap(hook.params.query, coercer);
  };
};

exports.parseBoolQuery = field => {
  return hook => {
    hook.params.query[field] = /^(true|1)$/i.test(hook.params.query[field]);
  };
};

exports.parseIntQuery = (field, defaultValue = 0) => {
  return hook => {
    hook.params.query[field] = parseInt(hook.params.query[field], 10) || defaultValue;
  };
};

exports.splitQuery = (field, sep, op, max) => {
  return hook => {
    const value = hook.params.query[field];
    if (typeof value !== 'string') return;

    const items = value.split(sep);
    if (Number.isInteger(max) && items.length > max) items.length = max; // Truncate
    if (items.length < 2) {} else if (typeof op === 'string') hook.params.query[field] = { [op]: items };else hook.params.query[field] = items;
  };
};

exports.timestamp = () => {
  return hook => {
    delete hook.data.created_at;
    delete hook.data.updated_at;

    switch (hook.method) {
      case 'create':
        hook.data.created_at = new Date();
        hook.data.updated_at = hook.data.created_at;
        break;
      case 'update':
      case 'patch':
        hook.data.updated_at = new Date();
        break;
    }
  };
};