var net = require('net');
var log = require('./log.js');
var Q = require('q');
var NotifyQueue = require('notify-queue');
var forEach = require('./for_each.js');
var DEFAULT_TYPE = 'default';

module.exports = function DumbAssQueue() {
  var server = net.createServer();
  var queue = new NotifyQueue();
  var nextJobId = 1;
  var waiting = {};

  this.listen = function listen(port) {
    var promise = Q.ninvoke(server, 'on', 'listening');
    server.on('connection', function(socket) {
      new Connection(socket);
    });
    server.listen(port);
    return promise;
  }

  this.close = function close() {
    server.close();
  }

  function Connection(socket) {
    log("client connected");
    forEach.jsonObject(socket, function(object) {
      log("data received from client: " + JSON.stringify(object));
      switch (object.action) {
        case 'add':
          addJob(object);
          var msg = {
            id: object.id
          };
          socket.write(JSON.stringify(msg) + "\n");
          break;

        case 'receive':
          var cancelListener = queue.pop(function(item) {
            log("sending job to consumer");
            socket.write(JSON.stringify(item) + "\n");
          }, matcherForTypes(object.types));
          socket.on('close', cancelListener);
          break;

        case 'finish':
          log('got job finished message: ' + object.id);
          var list = waiting[object.id];
          if (list) {
            log('notifying ' + list.length + " waiting clients");
            var msg = {
              id: object.id
            };
            list.forEach(function (socket) {
              socket.write(JSON.stringify(msg) + "\n");
            });
            delete waiting[object.id];
          }
          break;

        case 'wait':
          addToWaitingList(object.id, socket);
          break;
      }
    });
  }

  /**
   * Adds the provided job to the queue
   */
  function addJob(object) {
    object.type = object.type || DEFAULT_TYPE;
    object.id = nextJobId++;
    log("Job: " + object.id + " added to queue");
    queue.push(object);
  }

  /**
   * Adds the provided socket to the list of those waiting for the specified job
   * to complete.
   */
  function addToWaitingList(jobid, socket) {
    log('adding client to waiting list for job: ' + jobid);
    var list = waiting[jobid] || (waiting[jobid] = []);
    list.push(socket);
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

