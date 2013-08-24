var net = require('net');
var log = require('./log.js');
var Q = require('q');
var NotifyQueue = require('notify-queue');
var forEach = require('./for_each.js');

module.exports = function DumbAssQueue() {
  var server = net.createServer();
  var queue = new NotifyQueue();
  var connections = [];

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
          queue.push(object);
          break;

        case 'receive':
          cancelListener = queue.pop(function(object) {
            log("sending job to consumer");
            socket.write(JSON.stringify(object) + "\n");
          });
          socket.on('close', cancelListener);
          break;
      }
    });
  }
}

