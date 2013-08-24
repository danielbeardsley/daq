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
        return sendAJob({X:"blah"});
      }).
      then(receiveAJob).
      then(function () {
        q.close();
        done();
      }).done();
    });

    it('should have separate queues for each job type', function(done) {
      var q = new Queue();
      q.listen(port).then(function() {
        log("Listening on port: " + port);
        return sendJobs([
          {type:"B"},
          {type:"A"},
          {type:"B"}
        ]);
      }).
      then(function() {
        return receiveAJob(['A']);
      }).
      then(function (job) {
        assert.strictEqual(job.type, 'A');
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
  return sendJobs([job]);
}

function sendJobs(jobs) {
  var deferred = Q.defer();
  log("connecting producer");
  var connection = net.connect(port, null, function() {
    log('sending as producer');
    var msg = {
      action: 'add'
    };
    jobs.forEach(function(job) {
      msg.data = job;
      msg.type = job.type;
      connection.write(JSON.stringify(msg) + "\n");
    });
    connection.end();
    log('resolving');
    deferred.resolve();
  });
  return deferred.promise;
}

function receiveAJob(types) {
  var deferred = Q.defer();
  var result = '';
  var connection = net.connect(port);

  log("connecting consumer");
  var msg = {
    action: 'receive',
    types: types || null
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
