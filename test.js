var net     = require('net');
var assert  = require('assert');
var Q       = require('q');
var Queue   = require('./queue.js');

var port    = 34595;
var port2   = 34596;

describe('Queue', function(){
  var q = new Queue();
  describe("network interface", function() {
    it('should allow connections', function(done) {
      q.listen(port, port2).then(function() {
        return Q.all([
          testConnectionToPort(port),
          testConnectionToPort(port2)
        ]);
      }).then(function teardown() {
        q.close();
        done();
      });
    });
  });
})

function testConnectionToPort(port) {
  var deferred = Q.defer();
  var connection = net.connect(port, null, function() {
    connection.end();
    deferred.resolve(true);
  });
  return deferred.promise;
}
