## daq (dumb-ass-queue) ##
A distributed queue with minimalist features and a TCP protocol.

Seriously, it has no fancy features. But it passes the tests! (hopefully) 
[![Build
Status](https://travis-ci.org/danielbeardsley/daq.png?branch=master)](https://travis-ci.org/danielbeardsley/daq)

### Protocol ###
* TCP, single port
* As many producers and consumers as you want.
* All communication is JSON (one object with a trailing newline)
   * A valid mesage `{"action":"add","data":"blah"}\n`

### Commands ###
The `action` property defines the command.

#### add ####
Adds an item into the queue and triggers an immediate acknowledgement (ACK) of
an object like `{id: "unique item identifer"}`.

The command is a single object with these properties:
* `action`: `"add"` (required)
* `data`: whatever you want, it will be passed straight through
* `type`: `"some string"` (optional defaults to `"default"`) Only consumers that
  signify they want to see items of this type can receive this item.
* `notify`: if truthy, ACK message is delayed until item is pulled from the
  queue and marked finished. This allows the client to block until an item is
  completed.

#### receive ####
Remove a single item from the queue. A response will only be sent once an item is
available: `{id: "unique item identifer", "data":"stuff"}`. When the client is
finished dealing with the item, it must send a `finish` command for the item.

The command is a single object with these properties:
* `action`: `"receive"` (required)
* `types`: `['string1', 'string2']` (optional, defaults to `['default']`)
   Only items that are one of these types will be received.

#### finish ####
Mark an item as finished. After receiving and processing an item, consumers
should send this command. A single object: `{id: "itemid"}`. Sending `finish`
is only necessecary if you use the `notify` option from the `add` command.

The command is a single object with these properties:
* `id`: "item identifier" from `receive` command response. (required)
