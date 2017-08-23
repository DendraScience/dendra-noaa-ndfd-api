/**
 * Tests for global hooks
 */

const globalHooks = require('../../../dist/server/hooks')

describe('Global hooks', function () {
  const date1Str = '2017-05-05T15:00:00.000Z'
  const date2Str = '2017-06-06T16:30:10Z'
  const date1 = new Date(date1Str)
  const date2 = new Date(date2Str)

  describe('#coerceQuery()', function () {
    it('should coerce values in query params', function () {
      const hook = {
        params: {
          query: {
            bool_value: true,
            bool_value_str: 'true',
            bool_value_ary: ['false', 'true'],
            bool_value_obj: {
              f: 'false',
              t: {t: 'true'}
            },
            num_value: 12.3,
            num_value_str: '4.56',
            num_value_ary: ['7.89', '010.110'],
            num_value_obj: {
              one: '-1.1',
              two: {two: '-2.2'}
            },
            date_value: date1,
            date_value_str: date1Str,
            date_value_ary: [date1Str, date2Str],
            date_value_obj: {
              one: date1Str,
              two: {two: date2Str}
            },
            str_value: 'abc',
            str_value_num: '\'123',
            str_value_ary: ['def', 'GHI'],
            str_value_obj: {
              one: 'One',
              two: {two: 'Two'}
            }
          }
        }
      }

      globalHooks.coerceQuery()(hook)

      assert.deepEqual(hook.params.query, {
        bool_value: true,
        bool_value_str: true,
        bool_value_ary: [false, true],
        bool_value_obj: {
          f: false,
          t: {t: true}
        },
        num_value: 12.3,
        num_value_str: 4.56,
        num_value_ary: [7.89, 10.11],
        num_value_obj: {
          one: -1.1,
          two: {two: -2.2}
        },
        date_value: date1,
        date_value_str: date1,
        date_value_ary: [date1, date2],
        date_value_obj: {
          one: date1,
          two: {two: date2}
        },
        str_value: 'abc',
        str_value_num: '\'123',
        str_value_ary: ['def', 'GHI'],
        str_value_obj: {
          one: 'One',
          two: {two: 'Two'}
        }
      })
    })
  })
})
