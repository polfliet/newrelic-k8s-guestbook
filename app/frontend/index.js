const newrelic = require('newrelic');
const redis = require('redis');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const querystring = require('querystring');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

const redisHost = process.env.GET_HOSTS_ENV !== 'env' ? 'redis-master' : process.env.REDIS_MASTER_SERVICE_HOST;
const client = redis.createClient({ host: redisHost, port: 6379 });
app.set('view engine', 'pug');
app.locals.newrelic = newrelic;

// Do some heavy calculations
var lookBusy = function() {
  const end = Date.now() + 100;
  while (Date.now() < end) {
    const doSomethingHeavyInJavaScript = 1 + 2 + 3;
  }
};

// Throws an error 10% of the time
var maybeError = function() {
  var throwError = Math.floor(Math.random() * 10) === 1;
  if (throwError) {
    throw new Error('Error 500--Internal Server Error--' + process.env.K8S_POD_NAME);
  }
}

// Look busy functionality
app.use(function(req, res, next) {
  if (process.env.LOOK_BUSY == 't') {
    console.log('looking busy ' + process.env.K8S_POD_NAME)
    lookBusy();
  }

  next();
});

app.get('/', function (req, res) {
  if (process.env.THROW_ERROR == 't') {
    try {
      maybeError();
    } catch (e) {
      console.error('Frontend ' + process.env.K8S_POD_NAME + ': error: ', e);
      newrelic.noticeError(e);
      return res.status(500).send(e.toString());
    }
  }

  res.render('index', { title: 'New Relic K8s Guestbook', message: 'Send a string to our parser service. ' });
});

app.get('/message', function (req, res) {
  console.error('Frontend ' + process.env.K8S_POD_NAME + ': get messages from Redis')
  client.get('message', function(err, reply) {
    if (err) {
      console.error('error: ', e);
      return res.status(500).send(e);
    }
    return res.send(reply);
  });
});

app.post('/message', function(req, res) {
  var message = req.body.message;
  console.error('Frontend ' + process.env.K8S_POD_NAME + ': Sending message to parser: ' + message)

  var post_data = querystring.stringify({
      'message' : message
  });

  // An object of options to indicate where to post to
  var post_options = {
      host: 'parser',
      port: '80',
      path: '/',
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(post_data)
      }
  };

  // Set up the request
  var post_req = http.request(post_options, function(result) {
      result.setEncoding('utf8');
      result.on('data', function (chunk) {
          console.error('Frontend ' + process.env.K8S_POD_NAME + ': Response: ' + chunk);
      });
      res.render('index', { title: 'New Relic K8s Guestbook', message: 'Message was sent'})
  });

  // post the data
  post_req.write(post_data);
  post_req.end();

  res.redirect('/');
});

app.get('/healthz', function (req, res) {
  res.status(200).send('OK');    
});

app.listen(process.env.PORT || 3000, function () {
  console.error('Frontend ' + process.env.K8S_POD_NAME + ' listening on port 3000!');
});
