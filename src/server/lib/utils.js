/**
 * Web API utilities and helpers.
 *
 * @author J. Scott Smith
 * @license BSD-2-Clause-FreeBSD
 * @module lib/utils
 */

/**
 * Works like Array.map, expect for objects.
 */
function treeMap (obj, callback, path = '') {
  if (Array.isArray(obj)) return obj.map((el, i) => { return treeMap(el, callback, `${path}/${i}`) })

  // NOTE: Kinda a hack - we just wanna traverse plain old objects
  // SEE: https://toddmotto.com/understanding-javascript-types-and-reliable-type-checking/
  if (Object.prototype.toString.call(obj) === '[object Object]') {
    obj = Object.assign({}, obj)
    Object.keys(obj).forEach(key => {
      obj[key] = treeMap(obj[key], callback, `${path}/${key}`)
    })
    return obj
  }
  return callback(obj, path)
}

exports.treeMap = treeMap
