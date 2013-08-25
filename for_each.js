var readline   = require('readline');
var stream     = require('stream');
var log        = require('./log.js');
var isOldNode  = process.version.match(/^v0.6./);

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
  var lineReader = createReadline(inStream);

  lineReader.on('line', function(line) {
    callback(line);
  });

  return lineReader;
}

function createReadline(inStream) {
  var dummy = new stream();
  dummy.writable = true;

  if (isOldNode) {
    return readline.createInterface(
      inStream,
      dummy
    );
  } else {
    return readline.createInterface({
      input: inStream,
      output: dummy
    });
  }
}

module.exports = {
  jsonObject: forEachJsonObject,
  line: forEachLine
}
