'use strict';

const globalHooks = require('../../../hooks');
const hooks = require('feathers-hooks-common');
const { errors } = require('feathers-errors');

exports.before = {
  // all: [],

  find: [globalHooks.coerceQuery(), hook => {
    /*
      Timeseries services must:
      * Support a 'compact' query field
      * Support a 'time[]' query field with operators $gt, $gte, $lt and $lte
      * Support a '$sort[time]' query field
      * Accept and return time values in simplified extended ISO format (ISO 8601)
     */

    const query = hook.params.query;

    if (typeof query.parameter !== 'object') throw new errors.BadRequest('Expected parameter');

    hook.params.compact = query.compact;
  }, hooks.removeQuery('compact')],

  get: hooks.disallow(),
  create: hooks.disallow(),
  update: hooks.disallow(),
  patch: hooks.disallow(),
  remove: hooks.disallow()
};

exports.after = {
  // all: [],

  find(hook) {
    if (!hook.params.compact) return;

    // Reformat results asynchronously; 20 items at a time (hardcoded)
    // TODO: Move hardcoded 'count' to config
    // TODO: Move this into a global hook?
    const count = 20;
    const data = hook.result.data;
    const mapTask = function (start) {
      return new Promise(resolve => {
        setImmediate(() => {
          const len = Math.min(start + count, data.length);
          for (let i = start; i < len; i++) {
            const item = data[i];
            const newItem = {};

            // Compact time values
            const time = item.time;
            if (time) {
              if (time.start) {
                newItem.t = time.start.date;
                newItem.o = time.start.offset;
              }
              if (time.end) {
                newItem.te = {
                  t: time.end.date,
                  o: time.end.offset
                };
              }
            }

            // Compact data values
            if (Array.isArray(item.data)) {
              newItem.da = item.data;
            } else if (typeof item.data === 'object') {
              newItem.d = item.data;
            }
            if (typeof item.value === 'number') newItem.v = item.value;
            if (Array.isArray(item.values)) newItem.va = item.values;

            data[i] = newItem;
          }
          resolve();
        });
      });
    };
    const tasks = [];
    for (let i = 0; i < data.length; i += count) {
      tasks.push(mapTask(i));
    }
    return Promise.all(tasks).then(() => {
      return hook;
    });
  }

  // get: [],
  // create: [],
  // update: [],
  // patch: [],
  // remove: []
};