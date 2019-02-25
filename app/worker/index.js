const newrelic = require('newrelic');
const redis = require('redis');
const amqp = require('amqplib/callback_api');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
const redisHost = process.env.GET_HOSTS_ENV !== 'env' ? 'redis-master' : process.env.REDIS_MASTER_SERVICE_HOST;

const client = redis.createClient({ host: redisHost, port: 6379 });
app.locals.newrelic = newrelic;

var listenToQueue = function() {
  console.error('Worker ' + process.env.K8S_POD_NAME + ': start listening to queue');
  amqp.connect('amqp://user:bitnami@queue:5672', function(err, conn) {
    if (conn != undefined) {
      conn.createChannel(function(err, ch) {
        var q = 'message';
        ch.assertQueue(q, {durable: false});
        console.error(' [*] ' + process.env.K8S_POD_NAME + ' Waiting for messages in %s', q);
        ch.consume(q, function(msg) {
          var message = msg.content.toString();
          console.error(' [x] ' + process.env.K8S_POD_NAME + ' Received %s', message);
          // Push to Redis
          client.set('message', message, function(err) {
            if (err) {
                console.error('Worker ' + process.env.K8S_POD_NAME + ': Error pushing to Redis')
            }
          });
        }, {noAck: true}, function(err, ok) {
          console.error(' [!] ' + process.env.K8S_POD_NAME + ' Error receiving from queue');
          console.error(' [!] ' + process.env.K8S_POD_NAME + ' ', err);
          console.error(' [!] ' + process.env.K8S_POD_NAME + ' ', ok);
        });
      });
    } else {
      console.error('Worker ' + process.env.K8S_POD_NAME + ': failed connecting with queue')
      newrelic.noticeError(err);
      // Try again
      listenToQueue();
    }
  });
}

client.on('error', function(err) {
  console.error('Worker: Could not connect to redis host:', err);
  newrelic.noticeError(err);
})

listenToQueue();