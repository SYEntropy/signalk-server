const _ = require('lodash')
const assert = require('assert')
const {sendDelta} = require('./servertestutilities')
const freeport = require('freeport-promise')
const { startServerP, WsPromiser } = require('./servertestutilities')

function getDelta (overwrite) {
  const delta = {
    updates: [
      {
        timestamp: '2014-05-03T09:14:11.000Z',
        source: {
          pgn: 128275,
          label: '/dev/actisense',
          src: '115'
        },
        values: [
          {
            path: 'navigation.logTrip',
            value: 43374
          },
          {
            path: 'navigation.log',
            value: 17404540
          }
        ]
      },
      {
        timestamp: '2014-05-03T09:14:11.001Z',
        source: {
          label: '/dev/actisense',
          src: '115',
          pgn: 128267
        },
        values: [
          {
            path: 'navigation.courseOverGroundTrue',
            value: 172.9
          },
          {
            path: 'navigation.speedOverGround',
            value: 3.85
          }
        ]
      }
    ]
  }

  return _.assign(delta, overwrite)
}

function getNameDelta (overwrite) {
  const delta = {
    updates: [
      {
        timestamp: '2014-05-03T09:14:11.000Z',
        source: {
          pgn: 128275,
          label: '/dev/actisense',
          src: '115'
        },
        values: [
          {
            path: '',
            value: { name: 'SomeBoat' }
          }
        ]
      }
    ]
  }

  return _.assign(delta, overwrite)
}

function getClosePosistionDelta (overwrite) {
  const delta = {
    updates: [
      {
        source: {
          label: 'langford-canboatjs',
          type: 'NMEA2000',
          pgn: 129025,
          src: '3'
        },
        timestamp: '2017-04-15T14:58:01.200Z',
        values: [
          {
            path: 'navigation.position',
            value: {
              longitude: -76.4639314,
              latitude: 39.0700403
            }
          }
        ]
      }
    ],
    context: 'vessels.closeVessel'
  }

  return _.assign(delta, overwrite)
}

function getFarPosistionDelta () {
  const delta = {
    updates: [
      {
        source: {
          label: 'langford-canboatjs',
          type: 'NMEA2000',
          pgn: 129025,
          src: '3'
        },
        timestamp: '2017-04-15T14:58:01.200Z',
        values: [
          {
            path: 'navigation.position',
            value: {
              longitude: -76.4639314,
              latitude: 39.0700503
            }
          }
        ]
      }
    ],
    context: 'vessels.farVessel'
  }

  return delta
}

function getNullPositionDelta (overwrite) {
  const delta = {
    updates: [
      {
        source: {
          label: 'langford-canboatjs',
          type: 'NMEA2000',
          pgn: 129025,
          src: '3'
        },
        timestamp: '2017-04-15T14:58:01.200Z',
        values: [
          {
            path: 'navigation.position',
            value: {
              longitude: null,
              latitude: null
            }
          }
        ]
      }
    ],
    context: 'vessels.nullPosition'
  }

  return _.assign(delta, overwrite)
}

describe('Subscriptions', _ => {
  let serverP, port, deltaUrl

  before(() => {
    serverP = freeport().then(p => {
      port = p
      deltaUrl = 'http://localhost:' + port + '/signalk/v1/api/_test/delta'
      return startServerP(p)
    })
  })

  after(done => {
    serverP
      .then(server => server.stop())
      .then(() => {
        done()
      })
  })

  it('?subscribe=self subscription serves self data', function () {
    let self, wsPromiser

    return serverP
      .then(_ => {
        wsPromiser = new WsPromiser(
          'ws://localhost:' + port + '/signalk/v1/stream?subscribe=self'
        )
        return wsPromiser.nextMsg()
      })
      .then(wsHello => {
        self = JSON.parse(wsHello).self

        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(
            getDelta({
              context: self
            }),
            deltaUrl
          )
        ])
      })
      .then(results => {
        const deltaFromWs = JSON.parse(results[0])
        assert(deltaFromWs.updates[0].source.pgn === 128275)
        assert.equal(
          deltaFromWs.updates[0].timestamp,
          '2014-05-03T09:14:11.000Z'
        )

        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(getDelta({ context: 'vessels.othervessel' }), deltaUrl)
        ])
      })
      .then(results => {
        assert(results[0] === 'timeout')
      })
  })

  it('default subscription serves self data', function () {
    let self, wsPromiser

    return serverP
      .then(_ => {
        wsPromiser = new WsPromiser(
          'ws://localhost:' + port + '/signalk/v1/stream'
        )
        return wsPromiser.nextMsg()
      })
      .then(wsHello => {
        self = JSON.parse(wsHello).self

        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(
            getDelta({
              context: self
            }),
            deltaUrl
          )
        ])
      })
      .then(results => {
        assert(JSON.parse(results[0]).updates[0].source.pgn === 128275)

        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(getDelta({ context: 'vessels.othervessel' }), deltaUrl)
        ])
      })
      .then(results => {
        assert(results[0] === 'timeout')
      })
  })

  it('?subscribe=all subscription serves all data', function () {
    let self, wsPromiser

    return serverP
      .then(_ => {
        wsPromiser = new WsPromiser(
          'ws://localhost:' + port + '/signalk/v1/stream?subscribe=all'
        )
        return wsPromiser.nextMsg()
      })
      .then(wsHello => {
        self = JSON.parse(wsHello).self

        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(
            getDelta({
              context: self
            }),
            deltaUrl
          )
        ])
      })
      .then(results => {
        assert(JSON.parse(results[0]).updates[0].source.pgn === 128275)

        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(getDelta({ context: 'vessels.othervessel' }), deltaUrl)
        ])
      })
      .then(results => {
        assert(
          JSON.parse(results[0]).context === 'vessels.othervessel',
          'Sends other vessel data'
        )
      })
  })

  it('?subscribe=none subscription serves no data', function () {
    let self, wsPromiser

    return serverP
      .then(_ => {
        wsPromiser = new WsPromiser(
          'ws://localhost:' + port + '/signalk/v1/stream?subscribe=none'
        )
        return wsPromiser.nextMsg()
      })
      .then(wsHello => {
        self = JSON.parse(wsHello).self

        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(
            getDelta({
              context: self
            }),
            deltaUrl
          )
        ])
      })
      .then(results => {
        assert(results[0] === 'timeout')

        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(getDelta({ context: 'vessels.othervessel' }), deltaUrl)
        ])
      })
      .then(results => {
        assert(results[0] === 'timeout')
      })
  })

  it('unsubscribe all plus navigation.logTrip subscription serves correct data', function () {
    let self, wsPromiser

    return serverP
      .then(_ => {
        wsPromiser = new WsPromiser(
          'ws://localhost:' + port + '/signalk/v1/stream'
        )
        return wsPromiser.nextMsg()
      })
      .then(wsHello => {
        self = JSON.parse(wsHello).self

        return wsPromiser.send({ context: '*', unsubscribe: [{ path: '*' }] })
      })
      .then(() => {
        return wsPromiser.send({
          context: 'vessels.*',
          subscribe: [
            {
              path: 'navigation.logTrip'
            }
          ]
        })
      })
      .then(() => {
        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(
            getDelta({
              context: self
            }),
            deltaUrl
          )
        ])
      })
      .then(results => {
        const delta = JSON.parse(results[0])
        assert(
          delta.updates[0].values[0].path === 'navigation.logTrip',
          'Receives navigation.logTrip'
        )
        assert(delta.updates.length === 1, 'Receives just one update')
        assert(delta.updates[0].values.length === 1, 'Receives just one value')
        assert(delta.context === self)
        assert(delta.updates[0].timestamp, '2014-05-03T09:14:11.001Z')

        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(getDelta({ context: 'vessels.othervessel' }), deltaUrl)
        ])
      })
      .then(results => {
        const delta = JSON.parse(results[0])
        assert(delta.updates.length === 1, 'Receives just one update')
        assert(delta.updates[0].values.length === 1, 'Receives just one value')
        assert(
          delta.updates[0].values[0].path === 'navigation.logTrip',
          'Receives just navigation.logTrip'
        )
        assert(delta.context === 'vessels.othervessel')
      })
  })

  it('name subscription serves correct data', function () {
    let self, wsPromiser

    return serverP
      .then(_ => {
        wsPromiser = new WsPromiser(
          'ws://localhost:' + port + '/signalk/v1/stream?subsribe=none'
        )
        return wsPromiser.nextMsg()
      })
      .then(wsHello => {
        self = JSON.parse(wsHello).self

        return wsPromiser.send({
          context: 'vessels.*',
          subscribe: [
            {
              path: 'name'
            }
          ]
        })
      })
      .then(() => {
        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(
            getNameDelta({
              context: 'vessels.' + self
            }),
            deltaUrl
          )
        ])
      })
      .then(results => {
        const delta = JSON.parse(results[0])
        assert(delta.updates[0].values[0].path === '', 'Path is empty string')
        assert(
          typeof delta.updates[0].values[0].value === 'object',
          'Value is an object'
        )
        assert(
          typeof delta.updates[0].values[0].value.name !== 'undefined',
          'Value has name key'
        )
        assert(
          delta.updates[0].values[0].value.name === 'SomeBoat',
          'Name value is correct'
        )
        assert(delta.updates.length === 1, 'Receives just one update')
        assert(delta.updates[0].values.length === 1, 'Receives just one value')
        assert(delta.context === 'vessels.' + self)
        assert(delta.updates[0].timestamp, '2014-05-03T09:14:11.001Z')

        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(getNameDelta({ context: 'vessels.othervessel' }), deltaUrl)
        ])
      })
      .then(results => {
        const delta = JSON.parse(results[0])
        assert(delta.updates.length === 1, 'Receives just one update')
        assert(delta.updates[0].values.length === 1, 'Receives just one value')
        assert(delta.updates[0].values[0].path === '', 'Receives just name')
        assert(delta.context === 'vessels.othervessel')
      })
  })

  it('relativePosition subscription serves correct data', function () {
    let self, wsPromiser

    return serverP
      .then(_ => {
        wsPromiser = new WsPromiser(
          'ws://localhost:' + port + '/signalk/v1/stream?subsribe=none'
        )
        return wsPromiser.nextMsg()
      })
      .then(wsHello => {
        self = JSON.parse(wsHello).self

        return wsPromiser.send({
          context: {
            radius: 1,
            position: {
              longitude: -76.4639314,
              latitude: 39.0700403
            }
          },
          subscribe: [
            {
              path: 'navigation.position'
            }
          ]
        })
      })
      .then(results => {
        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(getClosePosistionDelta(), deltaUrl)
        ])
      })
      .then(results => {
        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(getClosePosistionDelta(), deltaUrl)
        ])
      })
      .then(results => {
        const delta = JSON.parse(results[0])

        assert(delta.updates.length === 1, 'Receives just one update')
        assert(delta.updates[0].values.length === 1, 'Receives just one value')
        assert(delta.context === 'vessels.closeVessel')

        return sendDelta(getFarPosistionDelta(), deltaUrl)
      })
      .then(results => {
        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(getFarPosistionDelta(), deltaUrl)
        ])
      })
      .then(results => {
        assert(results[0] === 'timeout')
      })
  })

it('relativePosition subscription works with null positions', function () {
    let self, wsPromiser

    return serverP
      .then(_ => {
        wsPromiser = new WsPromiser(
          'ws://localhost:' + port + '/signalk/v1/stream?subsribe=none'
        )
        return wsPromiser.nextMsg()
      })
      .then(wsHello => {
        self = JSON.parse(wsHello).self

        return wsPromiser.send({
          context: {
            radius: 1,
            position: {
              longitude: -76.4639314,
              latitude: 39.0700403
            }
          },
          subscribe: [
            {
              path: 'navigation.position'
            }
          ]
        })
      })
    .then(results => {
      return Promise.all([
        wsPromiser.nextMsg(),
        sendDelta(getNullPositionDelta(), deltaUrl)
      ])
    })
      .then(results => {
        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(getNullPositionDelta(), deltaUrl)
        ])
      })
    .then(results => {
      assert(results[0] === 'timeout')
      })
  })

  it('inconsistent subscription works', function () {
    let self, wsPromiser

    return serverP
      .then(_ => {
        wsPromiser = new WsPromiser(
          'ws://localhost:' + port + '/signalk/v1/stream?subscribe=none'
        )
        return wsPromiser.nextMsg()
      })
      .then(wsHello => {
        self = JSON.parse(wsHello).self

        //SubscriptionManager does nothing unless we have some matching
        //data, so send some first
        return Promise.all([
          wsPromiser.nextMsg(),
          sendDelta(
            getDelta({
              context: self
            }),
            deltaUrl
          )
        ])
      })
      .then(() => {
        return Promise.all([
          wsPromiser.nextMsg(),
          wsPromiser.send({
            context: '*',
            subscribe: [
              {
                path: 'navigation.courseOverGroundTrue',
                policy: 'ideal',
                minPeriod: 500
              }
            ]
          })
        ])
      })
      .then(([response]) => {
        assert.equal(
          '"minPeriod assumes policy \'instant\', ignoring policy ideal"',
          response
        )
      })
  })
})
