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

const {treeMap} = require('../lib/utils')

// Regular expressions for data type detection
const BOOL_REGEX = /^(false|true)$/i
const ISO_DATE_REGEX = /^([0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(.([0-9]{3}))?Z$/i

function coercer (obj, path) {
  if (typeof obj !== 'string') return obj

  // Date
  if (ISO_DATE_REGEX.test(obj)) {
    const ms = Date.parse(obj)
    if (!isNaN(ms)) return new Date(ms)
  }

  // ObjectID (strict)
  // if (ID_PATH_REGEX.test(path) && ID_STRING_REGEX.test(obj)) return new ObjectID(obj.toString())

  return obj
}

function queryCoercer (obj, path) {
  if (typeof obj !== 'string') return obj

  // Boolean
  if (BOOL_REGEX.test(obj)) return (obj === 'true')

  // Numeric
  const n = parseFloat(obj)
  if (!isNaN(n) && isFinite(obj)) return n

  return coercer(obj, path)
}

exports.coerce = () => {
  return (hook) => {
    if (typeof hook.data === 'undefined') return
    hook.data = treeMap(hook.data, coercer)
  }
}

exports.coerceQuery = () => {
  return (hook) => {
    if (typeof hook.params.query !== 'object') return
    hook.params.query = treeMap(hook.params.query, queryCoercer)
  }
}

exports.timestamp = () => {
  return (hook) => {
    delete hook.data.created_at
    delete hook.data.updated_at

    switch (hook.method) {
      case 'create':
        hook.data.created_at = new Date()
        hook.data.updated_at = hook.data.created_at
        break
      case 'update':
      case 'patch':
        hook.data.updated_at = new Date()
        break
    }
  }
}
