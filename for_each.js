var readline   = require('readline');
var stream     = require('stream');
var log        = require('./log.js');

function forEachJsonObject(socket, callback) {
  forEachLine(socket, function(line) {
    log("line:" + line);
    callback(JSON.parse(line.toString()));
  });
}

function forEachLine(inStream, callback) {
  var dummy = new stream();
  dummy.writable = true;
  var lineReader = readline.createInterface({
    input: inStream,
    output: dummy
  });

  lineReader.on('line', function(line) {
    callback(line);
  });
}

module.exports = {
  jsonObject: forEachJsonObject,
  line: forEachLine
}
