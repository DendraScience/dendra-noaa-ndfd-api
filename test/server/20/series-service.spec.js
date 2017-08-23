/**
 * Tests for series service
 */

const moment = require('moment')

describe('Service /series', function () {
  const databases = main.app.get('databases')

  this.timeout(60000)

  before(function () {
    if (databases.nedb && databases.nedb.cache) {
      return Promise.resolve(databases.nedb.cache.db).then(db => {
        return Promise.all([
          db.docs.remove({}, {
            multi: true
          })
        ])
      })
    }
  })

  after(function () {
    if (databases.nedb && databases.nedb.cache) {
      return Promise.resolve(databases.nedb.cache.db).then(db => {
        return Promise.all([
          db.docs.remove({}, {
            multi: true
          })
        ])
      })
    }
  })

  describe('/series summarized #find()', function () {
    it('should find using time', function () {
      const localM = moment().utc().subtract(8, 'h').startOf('d')

      return main.app.service('/series').find({query: {
        lat: 33.2574,
        lng: -116.4073,
        parameter: {
          key_path: '/probability-of-precipitation/12 hour'
        },
        time: {
          $gte: localM.toDate()
        },
        numDays: 7,
        interface: 'summarized',
        compact: true,
        $limit: 200,
        $sort: {
          time: -1
        }
      }}).then(res => {
        expect(res).to.have.nested.property('data.3').to.include({
          o: (new Date).getTimezoneOffset() * -60
        })
        expect(res).to.have.nested.property('data.3.t').to.be.a('date')
        expect(res).to.have.nested.property('data.3.v').to.be.a('number')
      })
    })
  })

  describe('/series unsummarized #find()', function () {
    it('should find using time', function () {
      const localM = moment().utc().subtract(8, 'h').startOf('d')

      return main.app.service('/series').find({query: {
        lat: 33.2574,
        lng: -116.4073,
        unit: 'm',
        parameter: {
          key_path: '/precipitation/liquid/p1h'
        },
        time: {
          $gte: localM.toDate(),
          $lte: localM.clone().add(1, 'd').toDate()
        },
        interface: 'unsummarized',
        compact: true,
        $limit: 200,
        $sort: {
          time: -1
        }
      }}).then(res => {
        expect(res).to.have.nested.property('data.0').to.include({
          o: (new Date).getTimezoneOffset() * -60
        })
        expect(res).to.have.nested.property('data.0.t').to.be.a('date')
        expect(res).to.have.nested.property('data.0.v').to.be.a('number')
      })
    })
  })

  describe('/cache/docs #find()', function () {
    it('should find', function () {
      return main.app.service('/cache/docs').find().then(res => {
        expect(res).to.have.nested.property('data.length', 2)
      })
    })
  })
})
