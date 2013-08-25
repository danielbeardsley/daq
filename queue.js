var net = require('net');
var log = require('./log.js');
var Q = require('q');
var NotifyQueue = require('notify-queue');
var forEach = require('./for_each.js');
var DEFAULT_TYPE = 'default';

module.exports = function DumbAssQueue() {
  var server = net.createServer();
  var queue = new NotifyQueue();
  var connections = [];
  var nextJobId = 1;

  this.listen = function listen(port) {
    var promise = Q.ninvoke(server, 'on', 'listening');
    server.on('connection', function(socket) {
      connections.push(new Connection(socket));
    });
    server.listen(port);
    return promise;
  }

  this.close = function close() {
    server.close();
  }

  function Connection(socket) {
    var cancelListener;

    log("client connected");
    forEach.jsonObject(socket, function(object) {
      log("data received from client: " + JSON.stringify(object));
      switch (object.action) {
        case 'add':
          addJob(object);
          break;

        case 'receive':
          cancelListener = queue.pop(function(item) {
            log("sending job to consumer");
            socket.write(JSON.stringify(item) + "\n");
          }, matcherForTypes(object.types));
          socket.on('close', cancelListener);
          break;
      }
    });
  }

  function addJob(object) {
    object.type = object.type || DEFAULT_TYPE;
    object.id = nextJobId++;
    queue.push(object);
  }
}


/**
 * Returns a function(item){} then returns true if
 * item.type is in the provided types array
 */
function matcherForTypes(types) {
  if (!types) {
    types = [DEFAULT_TYPE];
  }

  var typesMap = {};
  types.forEach(function(type) {
    typesMap[type] = true;
  });

  return function(item) {
    return typesMap[item.type];
  }
}

