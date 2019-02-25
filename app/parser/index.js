const newrelic = require('newrelic');
var amqp = require('amqplib/callback_api');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.locals.newrelic = newrelic;

// Do some heavy calculations
var lookBusy = function() {
  const end = Date.now() + 2000;
  while (Date.now() < end) {
    const doSomethingHeavyInJavaScript = 1 + 2 + 3;
  }
};

var pushToQueue = function(message) {
  console.error('Parser ' + process.env.K8S_POD_NAME + ': try connecting with queue');
  lookBusy();
  amqp.connect('amqp://user:bitnami@queue:5672', function(err, conn) {
    console.error('Parser ' + process.env.K8S_POD_NAME + ': connected with queue');
    if (conn != undefined) {
      conn.createChannel(function(err, ch) {
        var q = 'message';
        ch.assertQueue(q, {durable: false});
        ch.sendToQueue(q, new Buffer(message));
        console.error('Parser ' + process.env.K8S_POD_NAME + ': message sent to queue ' + message);
      });
      setTimeout(function() { conn.close() }, 500);
    } else {
      console.error('Parser ' + process.env.K8S_POD_NAME + ': failed connecting with queue');
    }
  });
}

// Look busy middleware
app.use(function(req, res, next) {
  if (process.env.LOOK_BUSY == 't') {
    console.log('looking busy ' + process.env.K8S_POD_NAME)
    lookBusy();
  }

  next();
});

app.get('/healthz', function (req, res) {
  res.status(200).send('OK');    
});

app.post('/', function(req, res) {
  console.error('Parser ' + process.env.K8S_POD_NAME + ': handling request to /');
  var message = req.body.message.toUpperCase();
  pushToQueue(message)
});

app.listen(process.env.PORT || 3000, function () {
  console.error('Parser ' + process.env.K8S_POD_NAME + ': listening on port 3000!');
});
