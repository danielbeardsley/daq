var net     = require('net');
var assert  = require('assert');
var Q       = require('q');
var Queue   = require('./queue.js');

// Faux paux : using part of the program under testing in the tests
// It's just so darn useful.
var forEach = require('./for_each.js');

var port   = 34595;

describe('daq', function(){
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

    it('should allow jobs to be added and consumed', function(done) {
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

    it('should give every job a unique job id', function(done) {
      var q = new Queue();
      q.listen(port).then(function() {
        log("Listening on port: " + port);
        return sendJobs(
          ["a", "b", "c", "d", "e"],
          true
        );
      }).
      then(function (jobs) {
        var ids = jobs.map(function(job) { return job.id; });
        var allUnique =
        ids.every(function (value, index, self) { 
          return self.indexOf(value) === index;
        });

        assert.ok(allUnique);
        q.close();
        done();
      }).done();
    });

    it('should allow blocking on a particular job', function(done) {
      var q = new Queue();
      var jobComplete = false;
      q.listen(port).then(function() {
        log("Listening on port: " + port);
        return sendAJob("YY", true);
      }).
      then(function (job) {
        var deferred = Q.defer();
        // This blocks until a job is complete
        afterJobCompletion(job.id, function() {
          // Make sure we marked the job as complete before we got here.
          assert.ok(jobCompleted);
          q.close();
          done();
        });
        setTimeout(function() {
          deferred.resolve(receiveAJob());
        },100);
        return deferred.promise;
      }).
      then(finishAJob).
      then(function () {
        jobComplete = true;
        q.close();
        done();
      }).done();
    });
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
    then(jobReceiverForTypes(['A'])).
    then(function (job) {
      assert.strictEqual(job.type, 'A');
      q.close();
      done();
    }).done();
  });

  it('should have a default type whos queue is unaffected by typed jobs', function(done) {
    var q = new Queue();
    q.listen(port).then(function() {
      log("Listening on port: " + port);
      return sendJobs([
        {type: "A"},
        "B"
      ]);
    }).
    then(receiveAJob).
    then(function (job) {
      assert.strictEqual(job.data, "B");
      q.close();
      done();
    }).done();
  });

  it('should have a queue for each that is separate from the deafult queue', function(done) {
    var q = new Queue();
    q.listen(port).then(function() {
      log("Listening on port: " + port);
      return sendJobs([
        "B",
        {type:"A"},
      ]);
    }).
    then(jobReceiverForTypes(['A'])).
    then(function (job) {
      assert.strictEqual(job.data.type, "A");
      q.close();
      done();
    }).done();
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

/**
 * Sends a single job returning a promise that either resolves to the job
 * info object received from daq, or null
 */
function sendAJob(job, resolveToJob) {
  return sendJobs([job], resolveToJob).
  then(function(jobs) {
    return resolveToJob && jobs[0];
  });
}

/**
 * Sends multiple jobs returning a promise that either resolves to an array of
 * job info objects received from daq, or null
 */
function sendJobs(jobs, resolveToJobs) {
  var deferred = Q.defer();
  log("connecting producer");
  var connection = net.connect(port, null, function() {
    log('sending '+jobs.length+' job(s) as producer');
    var msg = {
      action: 'add'
    };
    jobs.forEach(function(job) {
      msg.data = job;
      msg.type = job.type;
      connection.write(JSON.stringify(msg) + "\n");
    });
    var jobInfo = [];
    var count = jobs.length;
    var reader = forEach.jsonObject(connection, function(object) {
      log('received ack for job: '+object.id);
      jobInfo.push(object);
      if (--count == 0) {
        reader.close();
        connection.end();
        deferred.resolve(resolveToJobs && jobInfo);
        log('resolving');
      }
    });
  });
  return deferred.promise;
}

function jobReceiverForTypes(types) {
  return function() {
    return receiveAJob(types);
  };
}

function receiveNJobs(count, types) {
  var connection = net.connect(port);
  var jobs = [];

  return function() {
    var promise = receiveAndStoreAJob();
    while (--count) {
      promise = promise.then(receiveAndStoreAJob);
    }
    return promise.then(function() {
      return jobs;
    });
  }

  function receiveAndStoreAJob() {
    return receiveAJobOnConnection(types, connection).
    then(function(job) {
      jobs.push(job);
      return job;
    });
  }
}

function finishAJob(job) {
  var connection = net.connect(port);
  var msg = {
    action: 'finish',
    id: job.id
  };
  connection.end(JSON.stringify(msg) + "\n");
  return job;
}

function receiveAJob(types) {
  log("Trying to receive a job of types: " + (types || []).join(','));
  var connection = net.connect(port);

  return receiveAJobOnConnection(types, connection).
  then(function(job) {
    connection.end();
    return job;
  });
}

function receiveAJobOnConnection(types, connection) {
  var deferred = Q.defer();
  var msg = {
    action: 'receive',
    types: types || null
  };
  connection.write(JSON.stringify(msg) + "\n");
  var reader = forEach.jsonObject(connection, function(object) {
    log("received job: " + JSON.stringify(object));
    deferred.resolve(object);
    reader.close();
  });
  return deferred.promise;
}

function afterJobCompletion(jobid) {
  var deferred = Q.defer();
  var connection = net.connect(port);
  var msg = {
    action: 'wait',
    id: jobid
  };
  connection.end(JSON.stringify(msg) + "\n");
  var reader = forEach.jsonObject(connection, function(object) {
    log("job marked as finished: " + JSON.stringify(object));
    deferred.resolve(object);
    reader.close();
  });
  return deferred.promise;
}

function log(msg) {
  // console.log(msg);
}
