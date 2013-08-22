## daq (dumb-ass-queue) ##
Seriously, it has no features. But it passes the tests! 
[![Build
Status](https://travis-ci.org/danielbeardsley/daq.png?branch=master)](https://travis-ci.org/danielbeardsley/daq)

### Protocol ###
* TCP
* As many producers and consumers as you want.
* JSON (one object with trailing newline)
  * add a job, send: `{action: 'add', data: "your stuff"}`
  * consume a job, send: `{action: 'receive'}`
    * wait for a line of response: `"your stuff"`

