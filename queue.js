var net = require('net');
var Q = require('q');

function DumbAssQueue() {
  var producerServer = net.createServer();
  var consumerServer = net.createServer();

  this.listen = function listen(portProducer, portConsumer) {
    var promise = Q.all([
      Q.ninvoke(producerServer, 'on', 'listening'),
      Q.ninvoke(consumerServer, 'on', 'listening'),
    ]);
    producerServer.listen(portProducer);
    consumerServer.listen(portConsumer);
    return promise;
  }

  this.close = function close() {
    producerServer.close();
    consumerServer.close();
  }
}
  
module.exports = DumbAssQueue;
