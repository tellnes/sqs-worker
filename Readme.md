# sqs-worker

sqs-worker reads messages from Amazon Simple Queue Service and call a function
provided by you. It also deletes the message from the queue if you signals
that everything went successfully.

Note: It does not guarantee that you don's sees the same message twice,
therefore should you design your application to handle that.


## Usage

```js
var SQSWorker = require('sqs-worker')

var options =
  { url: 'https://sqs.eu-west-1.amazonaws.com/001123456789/my-queue'
  }

var queue = new SQSWorker(options, worker)

function worker(notifi, done) {
  var message
  try {
    message = JSON.parse(notifi.Data)
  } catch (err) {
    throw err
  }

  // Do something with `message`

  var success = true

  // Call `done` when you are done processing a message.
  // If everything went successfully and you don't want to see it any more,
  // set the second parameter to `true`.
  done(null, success)
}

```

## Install

    npm install sqs-worker

## License

MIT
