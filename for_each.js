var split      = require('split');
var log        = require('./log.js');

function forEachJsonObject(inStream, callback) {
  inStream.pipe(split(JSON.parse))
  .on('data', callback)
  .on('error', function (err) {
     log("Error: " + err);
  })
}

module.exports = {
  jsonObject: forEachJsonObject
}
