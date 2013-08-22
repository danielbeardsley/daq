var net     = require('net');
var assert  = require('assert');
var Q       = require('q');
var Queue   = require('./queue.js');

var portP   = 34595;
var portC   = 34596;

describe('Queue', function(){
  describe("network interface", function() {
    it('should allow connections', function(done) {
      var q = new Queue();
      q.listen(portP, portC).then(function() {
        return Q.all([
          testConnectionToPort(portP),
          testConnectionToPort(portC)
        ]);
      }).then(function teardown() {
        q.close();
        done();
      }).done();
    });

    it('should pass jobs', function(done) {
      var q = new Queue();
      q.listen(portP, portC).then(function() {
        log("Listening on both ports");
        return sendAJob({type:"blah"});
      }).
      then(receiveAJob).
      then(function () {
        q.close();
        done();
      }).done();
    });
  });
})

function testConnectionToPort(port) {
  var deferred = Q.defer();
  var connection = net.connect(port, null, function() {
    connection.end();
    deferred.resolve();
  });
  return deferred.promise;
}

function sendAJob(job) {
  var deferred = Q.defer();
  log("connecting producer");
  var connection = net.connect(portP, null, function() {
    log('sending as producer');
    connection.end(JSON.stringify(job) + "\n");
    log('resolving');
    deferred.resolve();
  });
  return deferred.promise;
}

function receiveAJob(job) {
  var deferred = Q.defer();
  var result = '';
  var connection = net.connect(portC);

  log("connecting consumer");
  connection.on('data', function(data) {
    log('received on consumer');
    result += data.toString();
    if (result[result.length-1] == "\n") {
      deferred.resolve(JSON.parse(result.toString()));
      connection.end();
    }
  });
  return deferred.promise;
}

function log(msg) {
  // console.log(msg);
}
