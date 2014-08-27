
var SQSWorker = require('./')

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

  console.log(message)

  done()
}
