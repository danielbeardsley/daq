var net = require('net');
var Q = require('q');
var NotifyQueue = require('notify-queue');

module.exports = function DumbAssQueue() {
  var producerServer = net.createServer();
  var consumerServer = net.createServer();
  var queue = new NotifyQueue();

  this.listen = function listen(portProducer, portConsumer) {
    var promise = Q.all([
      Q.ninvoke(producerServer, 'on', 'listening'),
      Q.ninvoke(consumerServer, 'on', 'listening'),
    ]);
    producerServer.listen(portProducer);
    consumerServer.listen(portConsumer);

    setupConnectionHandlers();

    return promise;
  }

  this.close = function close() {
    producerServer.close();
    consumerServer.close();
  }

  function setupConnectionHandlers () {
    producerServer.on('connection', function(socket) {
      log("producer connected");
      forEachJsonObject(socket, function(object) {
        log("job received from producer: " + JSON.stringify(object));
        queue.push(object);
      });
    });

    consumerServer.on('connection', function(socket) {
      log("consumer connected");
      var cancel = queue.pop(function(object, done) {
        log("sending job to consumer");
        socket.write(JSON.stringify(object) + "\n");
        done();
      });

      socket.on('close', cancel);
    });

  }
}
  
function forEachJsonObject(socket, callback) {
  var data = '';
  socket.on('data', function(chunk) {
    log("chunk:" + chunk + " data:" + data);
    data += chunk.toString();
    if (data[data.length-1] == "\n") {
      callback(JSON.parse(data.toString()));
      data = '';
    }
  });
}

function log(msg) {
  // console.log(msg);
}
