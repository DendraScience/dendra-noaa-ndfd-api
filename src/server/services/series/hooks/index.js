const globalHooks = require('../../../hooks')
const hooks = require('feathers-hooks-common')
const {errors} = require('feathers-errors')

exports.before = {
  // all: [],

  find: [
    globalHooks.coerceQuery(),

    (hook) => {
      /*
        Timeseries services must:
        * Support a 'compact' query field
        * Support a 'time[]' query field with operators $gt, $gte, $lt and $lte
        * Support a '$sort[time]' query field
        * Accept and return time values in simplified extended ISO format (ISO 8601)
       */

      const query = hook.params.query

      if (typeof query.parameter !== 'object') throw new errors.BadRequest('Expected parameter')

      hook.params.compact = query.compact
    },

    hooks.removeQuery('compact')
  ],

  get: hooks.disallow(),
  create: hooks.disallow(),
  update: hooks.disallow(),
  patch: hooks.disallow(),
  remove: hooks.disallow()
}

exports.after = {
  // all: [],

  find (hook) {
    if (!hook.params.compact) return

    // Reformat results asynchronously; 20 items at a time (hardcoded)
    // TODO: Move hardcoded 'count' to config
    // TODO: Move this into a global hook?
    const count = 20
    const data = hook.result.data
    const mapTask = function (start) {
      return new Promise((resolve) => {
        setImmediate(() => {
          const len = Math.min(start + count, data.length)
          for (let i = start; i < len; i++) {
            const item = data[i]

            const newItem = {}
            if (item.time.startDate) newItem.t = item.time.startDate
            if (item.time.startOffset) newItem.o = item.time.startOffset
            if (item.time.endDate) newItem.te = item.time.endDate
            if (item.time.endOffset) newItem.oe = item.time.endOffset
            if (item.url) newItem.url = item.url
            if (item.value) newItem.v = item.value

            data[i] = newItem
          }
          resolve()
        })
      })
    }
    const tasks = []
    for (let i = 0; i < data.length; i += count) {
      tasks.push(mapTask(i))
    }
    return Promise.all(tasks).then(() => {
      return hook
    })
  }

  // get: [],
  // create: [],
  // update: [],
  // patch: [],
  // remove: []
}
