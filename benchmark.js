var net = require('net');
var Q = require('q');
var DAQ = require('./queue.js');
var forEach = require('./for_each.js');
var port = 23423;
var queue = new DAQ();

queue.listen(port).then(function() {
   var producer = net.connect(port);
   var consumer = net.connect(port);

   var jobs = 1000;
   consumeJobs(consumer, jobProducer(producer, jobs)).then(function(diffs) {
      var sum = diffs.reduceRight(function(total, value) {
         return total + value;
      }, 0);
      log("One-at-a-time item processing (add -> receive -> finish -> repeat)");
      log("items: " + diffs.length + " Avg latency: " + (sum / diffs.length) + 'ms');
      queue.close();
      producer.end();
      consumer.end();
   }).done();
}).done();

function jobProducer(socket, count) {
   return function sendNextJob() {
      if (count <= 0) {
        return false;
      }

      var msg = {
         action: 'add',
         data: {time: Date.now()}
      };
      socket.write(str(msg));
      return count--;
   }
}


function consumeJobs(socket, produceJob) {
   var deferred = Q.defer();
   var diffs = [];
   receiveNext(socket);
   produceJob();
   forEach.jsonObject(socket, function(object) {
      socket.write(str({action:"finish",id:object.id}));
      var diff = Date.now() - object.data.time;
      diffs.push(diff);
      receiveNext(socket);
      if (!produceJob()) {
         deferred.resolve(diffs);
      }
   });
   return deferred.promise;
}

function receiveNext(socket) {
   socket.write(str({action:"receive"}));
}

function log(msg) {
  console.log("benchmark: " + msg);
}

function str(object) {
   return JSON.stringify(object) + "\n";
}
