'use strict';

/**
 * NOAA API Express server.
 *
 * @author J. Scott Smith
 * @license BSD-2-Clause-FreeBSD
 * @module server/main
 */

// TODO: Define hooks to prevent updating!

const feathers = require('feathers');
const compress = require('compression');
const cors = require('cors');
const configuration = require('feathers-configuration');
const bodyParser = require('body-parser');
const hooks = require('feathers-hooks');
const rest = require('feathers-rest');
const socketio = require('feathers-socketio');
const databases = require('./databases');
const services = require('./services');
const middleware = require('./middleware');
const tasks = require('./tasks');

const app = feathers();

// TODO: Winston is configured in middleware; deal with this
// TODO: Replace logger with winston
const log = console;

// Configure
app.configure(configuration());

// Feathers setup
app.use(compress()).options('*', cors()).use(cors()).use(bodyParser.json()).use(bodyParser.urlencoded({ extended: true })).configure(hooks()).configure(rest()).configure(socketio()).configure(databases).configure(services).configure(middleware).configure(tasks);

// TODO: Handle SIGTERM gracefully for Docker
// SEE: http://joseoncode.com/2014/07/21/graceful-shutdown-in-node-dot-js/
Promise.resolve(app.get('middlewareReady')).then(() => {
  const port = app.get('port');
  const server = app.listen(port);

  server.once('listening', () => log.info('Feathers application started on %s:%s', app.get('host'), port));
}).catch(err => {
  log.error(err);
});

exports.app = app; // For testing