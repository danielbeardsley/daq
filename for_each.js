var readline   = require('readline');
var stream     = require('stream');
var log        = require('./log.js');

function forEachJsonObject(stream, callback) {
  return forEachLine(stream, function(line) {
    log("line:" + line.trim());
    try {
      var object = JSON.parse(line.toString());
    } catch(error) {
      log("Error: " + error);
      return;
    }
    callback(object);
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

  return lineReader;
}

module.exports = {
  jsonObject: forEachJsonObject,
  line: forEachLine
}
