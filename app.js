var express = require('express')
  , http = require('http')
  , os = require('os')
  , url = require('url')
  , path = require('path')
  , Faker = require('faker2')
  , redis = require('redis');

var app = express();

var redisURL = url.parse(process.env.REDISCLOUD_URL || "redis://localhost:6379");
var redisClient = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});

if (redisURL.auth != undefined) {
  redisClient.auth(redisURL.auth.split(":")[1]);
}

app.configure(function(){
  app.set('port', process.env.PORT || 3030);
  app.set('view engine', 'html');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'app')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var subscribers = [];

app.get('/sse', function(req, res) {
    req.socket.setTimeout(Infinity);

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    res.write('\n');

    subscribers.push(res);

    // Remove a connection when it is closed.
    req.on("close", function() {
        var toRemove;
        for (var j =0 ; j < subscribers.length ; j++) {
            if (subscribers[j] == res) {
                toRemove = j;
                break;
            }
        }
        subscribers.splice(j,1);
    });
});

app.post('/widgets/:name', function(req, res) {
    // we walk through each connection
    subscribers.forEach(function(subscriber) {
        var d = new Date();

        subscriber.write('event: ' + 'message' + '\n');
        subscriber.write('id: ' + d.getMilliseconds() + '\n');
        subscriber.write('data:' + createMsg(req.params.name, req.body));
        subscriber.write('\n\n');
    });

    res.send(200);
});

function createMsg(name, data) {
    msg = {};

    msg.id = name;
    msg.value = data.value
    msg.updatedAt = new Date();

    return JSON.stringify(msg);
}

redisClient.on('ready', function() {
  redisClient.subscribe('aerodrome');
});

redisClient.on("message", function(channel, message){
  subscribers.forEach(function(subscriber) {
      var d = new Date();

      subscriber.write('event: ' + 'message' + '\n');
      subscriber.write('id: ' + d.getMilliseconds() + '\n');
      subscriber.write('data:' + message);
      subscriber.write('\n\n');
  });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
})