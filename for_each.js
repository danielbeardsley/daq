var readline   = require('readline');
var stream     = require('stream');
var log        = require('./log.js');

function forEachJsonObject(stream, callback) {
  return forEachLine(stream, function(line, next) {
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
  emitLines(inStream);

  inStream.on('line', function(line) {
    callback(line);
  });
}

/**
 * By TooTallNate, originally posted at https://gist.github.com/1785026
 * A quick little thingy that takes a Stream instance and makes
 * it emit 'line' events when a newline is encountered.
 *
 *   Usage:
 *   ‾‾‾‾‾
 *  emitLines(process.stdin)
 *  process.stdin.resume()
 *  process.stdin.setEncoding('utf8')
 *  process.stdin.on('line', function (line) {
 *    console.log(line event:', line)
 *  })
 *
 */
function emitLines(stream) {
  var backlog = ''
  stream.on('data', function (data) {
    backlog += data
    var n = backlog.indexOf('\n')
    // got a \n? emit one or more 'line' events
    while (~n) {
      stream.emit('line', backlog.substring(0, n))
      backlog = backlog.substring(n + 1)
      n = backlog.indexOf('\n')
    }
  })
  stream.on('end', function () {
    if (backlog) {
      stream.emit('line', backlog)
    }
  })
}

module.exports = {
  jsonObject: forEachJsonObject,
  line: forEachLine
}
