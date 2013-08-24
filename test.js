var net     = require('net');
var assert  = require('assert');
var Q       = require('q');
var Queue   = require('./queue.js');

var port   = 34595;

describe('Queue', function(){
  describe("network interface", function() {
    it('should allow connections', function(done) {
      var q = new Queue();
      q.listen(port).then(function() {
        return testConnectionToPort(port);
      }).then(function teardown() {
        q.close();
        done();
      }).done();
    });

    it('should pass jobs', function(done) {
      var q = new Queue();
      q.listen(port).then(function() {
        log("Listening on port: " + port);
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

var PriorityQueue = require('./priority_queue.js');
describe('PriorityQueue', function(){
  describe('with unprioritized things', function(){
    it('should work normally', function() {
      var p = new PriorityQueue();
      p.enq('a');
      p.enq('b');
      assert.strictEqual(p.deq(), 'a');
      p.enq('c');
      assert.strictEqual(p.deq(), 'b');
      assert.strictEqual(p.deq(), 'c');
    });
  });
});

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
  var connection = net.connect(port, null, function() {
    log('sending as producer');
    var msg = {
      action: 'add',
      data: job
    };
    connection.end(JSON.stringify(msg) + "\n");
    log('resolving');
    deferred.resolve();
  });
  return deferred.promise;
}

function receiveAJob(job) {
  var deferred = Q.defer();
  var result = '';
  var connection = net.connect(port);

  log("connecting consumer");
  var msg = {
    action: 'receive'
  };
  connection.write(JSON.stringify(msg) + "\n");
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
