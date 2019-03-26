const newrelic = require('newrelic');
var amqp = require('amqplib');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.locals.newrelic = newrelic;

// Do some heavy calculations
var lookBusy = function() {
  const end = Date.now() + 100;
  while (Date.now() < end) {
    const doSomethingHeavyInJavaScript = 1 + 2 + 3;
  }
};

var pushToQueue = function(message, res) {
  lookBusy();

  amqp.connect('amqp://user:bitnami@queue:5672').then(function(conn) {
    return conn.createChannel().then(function(ch) {
      var q = 'message';
      var ok = ch.assertQueue(q, {durable: false});

      // New Relic DT instrumentation
      // var transactionHandle = newrelic.getTransaction();
      // var payload = transactionHandle.createDistributedTracePayload().httpSafe();
      // var headers = {headers: {'x-newrelic-payload': payload};

      return ok.then(function(_qok) {
        newrelic.addCustomAttribute('msgData', message);
        console.error(' [x] Sending to queue: ' + message);
        ch.sendToQueue(q, Buffer.from(message));
        
        // New Relic DT instrumentation
        // ch.sendToQueue(q, Buffer.from(message), {headers: {'x-newrelic-payload': payload}});
        // console.error(' [x] New Relic payload: ', payload);
        return ch.close();
      });
    }).finally(function() { 
      conn.close();
      res.status(200).send('OK');
    });
  }).catch(console.error);
}

// Look busy middleware
app.use(function(req, res, next) {
  if (process.env.LOOK_BUSY == 't') {
    console.log('looking busy ' + process.env.NEW_RELIC_METADATA_KUBERNETES_POD_NAME)
    lookBusy();
  }

  next();
});

app.get('/healthz', function (req, res) {
  newrelic.setIgnoreTransaction(true);
  res.status(200).send('OK');    
});

app.get('/', function(req, res) {
  var message = req.query.message.toUpperCase();
  pushToQueue(message, res)
});

app.listen(process.env.PORT || 3000, function () {
  console.error('Parser ' + process.env.NEW_RELIC_METADATA_KUBERNETES_POD_NAME + ': listening on port 3000!');
});
