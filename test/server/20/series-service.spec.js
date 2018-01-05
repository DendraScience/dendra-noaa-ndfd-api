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

  describe('/series datastreams #find()', function () {
    const datastreams = [{
      "interface": "unsummarized",
      "parameter": {
        "key_path": "/cloud-amount/total/p1h"
      },
      "unit": "m"
    }, {
      "interface": "unsummarized",
      "parameter": {
        "key_path": "/conditions-icon/forecast-NWS/p3h"
      },
      "unit": "m"
    }, {
      "interface": "unsummarized",
      "parameter": {
        "key_path": "/precipitation/liquid/p1h"
      },
      "unit": "e"
    }, {
      "interface": "unsummarized",
      "parameter": {
        "key_path": "/precipitation/liquid/p1h"
      },
      "unit": "m"
    }, {
      "interface": "unsummarized",
      "parameter": {
        "key_path": "/probability-of-precipitation/12 hour"
      },
      "unit": "m"
    }, {
      "interface": "unsummarized",
      "parameter": {
        "key_path": "/temperature/maximum/p24h"
      },
      "unit": "e"
    },{
      "interface": "unsummarized",
      "parameter": {
        "key_path": "/temperature/maximum/p24h"
      },
      "unit": "m"
    }, {
      "interface": "unsummarized",
      "parameter": {
        "key_path": "/temperature/minimum/p24h"
      },
      "unit": "e"
    }, {
      "interface": "unsummarized",
      "parameter": {
        "key_path": "/temperature/minimum/p24h"
      },
      "unit": "m"
    }, {
      "interface": "unsummarized",
      "parameter": {
        "key_path": "/weather/p3h"
      },
      "unit": "m"
    }, {
      "format": "12 hourly",
      "interface": "summarized",
      "numDays": 7,
      "parameter": {
        "key_path": "/conditions-icon/forecast-NWS/p12h"
      },
      "unit": "m"
    }, {
      "format": "12 hourly",
      "interface": "summarized",
      "numDays": 7,
      "parameter": {
        "key_path": "/weather/p12h"
      },
      "unit": "m"
    }, {
      "format": "12 hourly",
      "interface": "summarized",
      "numDays": 7,
      "parameter": {
        "key_path": "/temperature/maximum/p24h"
      },
      "unit": "m"
    }, {
      "format": "12 hourly",
      "interface": "summarized",
      "numDays": 7,
      "parameter": {
        "key_path": "/temperature/maximum/p24h"
      },
      "unit": "e"
    }, {
      "format": "12 hourly",
      "interface": "summarized",
      "numDays": 7,
      "parameter": {
        "key_path": "/temperature/minimum/p24h"
      },
      "unit": "e"
    }, {
      "format": "12 hourly",
      "interface": "summarized",
      "numDays": 7,
      "parameter": {
        "key_path": "/temperature/minimum/p24h"
      },
      "unit": "m"
    }, {
      "format": "12 hourly",
      "interface": "summarized",
      "numDays": 7,
      "parameter": {
        "key_path": "/probability-of-precipitation/12 hour"
      },
      "unit": "m"
    }]

    const localM = moment().startOf('d')
    const time = {
      $gte: localM.toISOString()
    }
    const geo = {
      lat: 39.739167,
      lng: -123.630833
    }
    const opts = {
      compact: true,
      $limit: 20,
      $sort: {
        time: 1
      }
    }

    for (let datastream of datastreams) {
      it(`should find ${datastream.parameter.key_path} using time`, function () {
        const query = Object.assign({}, datastream, geo, {time}, opts)

        return main.app.service('/series').find({query}).then(res => {
          expect(res).to.have.nested.property('data.0').to.include({
            o: (new Date).getTimezoneOffset() * -60
          })
          expect(res).to.have.nested.property('data.0.t').to.be.a('date')
        })
      })
    }
  })
})
