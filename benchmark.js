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
      producer.end();
      consumer.end();
      queue.close();
   }).done();
});

function jobProducer(socket, count) {
   return function sendNextJob() {
      var msg = {
         action: 'add',
         data: {time: Date.now()}
      };
      socket.write(str(msg));
      if (count--) {
         return true;
      } else {
         return false;
      };
   }
}


function consumeJobs(socket, produceJob) {
   var deferred = Q.defer();
   var diffs = [];
   receiveNext(socket);
   produceJob();
   var lineReader = forEach.jsonObject(socket, function(object) {
      socket.write(str({action:"finish",id:object.id}));
      var diff = Date.now() - object.data.time;
      diffs.push(diff);
      receiveNext(socket);
      if (!produceJob()) {
         lineReader.close();
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
