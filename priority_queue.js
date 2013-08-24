var util = require('util');

function PriorityQueue() {
  this._items = [];
}

PriorityQueue.prototype.enq = function(item, priority) {
  this._items.push(item);
  this.emit('added', item);
}

PriorityQueue.prototype.deq = function(item, priority) {
  return this._items.shift();
}

util.inherits(PriorityQueue, EventEmitter);
module.exports = PriorityQueue;
