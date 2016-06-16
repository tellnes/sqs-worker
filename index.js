
module.exports = SQSWorker

function SQSWorker(options, fn) {
  if (!(this instanceof SQSWorker)) return new SQSWorker(options, fn)

  this.client = options.client || new (require('aws-sdk').SQS)(options)

  // Five seconds more than WaitTimeSeconds
  this.client.config.httpOptions.timeout = 25000

  this.url = options.url
  this.parallel = options.parallel || 1
  this.timeout = options.timeout || void 0
  this.parse = options.parse
  this.log = options.log || console
  this.attributes = Array.isArray(options.attributes) ? options.attributes.slice() : []
  this.attempts = options.attempts || 3

  if (this.attempts && !~this.attributes.indexOf('ApproximateReceiveCount')) {
    this.attributes.push('ApproximateReceiveCount')
  }

  this.fn = fn

  this.handling = 0
  this.receiving = 0

  this.maybeMore()
}

SQSWorker.prototype.maybeMore = function (retries) {
  if (this.receiving) return
  if (this.handling >= this.parallel) return

  this.receiving++

  retries = retries || 0
  retries++

  var self = this

  var params =
    { 'QueueUrl': this.url
    , 'MaxNumberOfMessages': Math.min(this.parallel, 10)
    , 'VisibilityTimeout': this.timeout
    , 'WaitTimeSeconds': 20
    , 'AttributeNames': this.attributes
    }

  this.client.receiveMessage(params, function (err, data) {
    self.receiving--

    if (err) {
      self.log.error({ err: err, params: params }, 'failed to receive messages')
      setTimeout(self.maybeMore.bind(self), Math.min(Math.pow(2, retries), 300) * 1000, retries)
      return
    }

    // self.log.info({ params: params, response: data }, 'receiveMessage response')

    if (Array.isArray(data.Messages)) {
      data.Messages.map(self.handleMessage, self)
    }

    self.maybeMore()
  })
}

SQSWorker.prototype.handleMessage = function (message) {
  this.handling++

  var payload = message.Body

  if (this.parse) {
    try {
      payload = this.parse(payload)
    } catch (err) {
      this.log.error({ err: err, message: message }, 'error parsing message body')
      return
    }
  }

  var self = this

  if (this.fn.length === 2) {
    this.fn(payload, callback)
  } else {
    this.fn(payload, message, callback)
  }

  function callback(err, del) {
    self.handling--

    if (err) {
      self.log.error({ err: err, message: message, payload: payload }, 'error handling message')
      del = (self.attempts && Number(message['Attributes']['ApproximateReceiveCount']) >= self.attempts)
    }

    var params =
      { 'QueueUrl': self.url
      , 'ReceiptHandle': message.ReceiptHandle
      }

    if (!del) {
      params['VisibilityTimeout'] = 0
    }

    self.client[del ? 'deleteMessage' : 'changeMessageVisibility'](params, function (err) {
      if (err) {
        self.log.error(
            { err: err, message: message, payload: payload }
          , 'failed to ' + (del ? 'delete message' : 'change visibility timeout')
          )
        // Keep retrying even if updating the props fails
        // return
      }

      self.maybeMore()
    })
  }
}
