"use strict";

var express = require('express');
var bodyParser = require('body-parser');
var compress = require('compression');
var errorHandler = require('errorhandler');
var favicon = require('serve-favicon');
var http = require('http');
var moment = require('moment-timezone');
var request = require('request');
var cors = require('cors');
var ical = require('ical-generator');
var clc = require('cli-color');
var sm = require('sitemap');
var archives = require('./archives');

var cal = ical();

var config = require('./config.js');
var wb = require('webuild-main').init(config);

var podcastApiUrl = config.podcastApiUrl;

var sitemap = sm.createSitemap ({
  hostname: 'https://' + config.domain,
  cacheTime: 600000,
  urls: [
    {
      url: '/',
      changefreq: 'daily',
      priority: 0.3
    }
  ]
});

var app = express();

app.use(compress());
app.use('/public', express.static(__dirname + '/public'));
app.use('/humans.txt', express.static(__dirname + '/public/humans.txt'));
app.use('/robots.txt', express.static(__dirname + '/public/robots.txt'));
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(errorHandler());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(wb.passport.initialize());

app.locals.pretty = true;
app.locals.moment = require('moment-timezone');

app.get('/sitemap.xml', function(req, res) {
  sitemap.toXML( function (xml) {
    res.header('Content-Type', 'application/xml');
    res.send( xml );
  });
});

app.get('/', function(req, res) {
  res.render('./index.jade', {
    repos: wb.repos.feed.repos.slice(0, 10),
    events: wb.events.feed.events.slice(0, 10)
  });
});

app.get('/api/v1/check/:checkdate', cors(), function(req, res) {
  var checkdate = moment(req.params.checkdate, 'YYYY-MM-DD');
  var clashedEvents = {
    'meta': {
      'generated_at': new Date().toISOString(),
      'location': config.city,
      'api_version': config.api_version
    },
    'events': []
  };

  clashedEvents.events = wb.events.feed.events.filter(function(element) {
    if (moment(element.start_time).isSame(checkdate, 'day') ) {
      return true;
    }
  });

  clashedEvents.meta.total_events = clashedEvents.events.length;

  res.send(clashedEvents);

});

app.get('/api/v1/events', cors(), function(req, res) {
  res.send(wb.events.feed);
});

app.get('/api/v1/repos', cors(), function(req, res) {
  res.send(wb.repos.feed);
});

app.get('/api/v1/repos/:language', cors(), function(req, res) {
  var language = req.params.language.toLowerCase();
  var reposWIthLanguage = wb.repos.feed.repos.filter(function(repo) {
    if (!repo.language) {
      return false;
    }
    return repo.language.toLowerCase() === language;
  });

  res.send({
    meta: {
      generated_at: new Date().toISOString(),
      location: config.city,
      total_repos: wb.repos.length,
      api_version: config.api_version,
      max_repos: reposWIthLanguage.length
    },
    repos: reposWIthLanguage
  });
});

app.get('/admin', function(req, res) {
  res.render('./facebook_login.jade', {
    auth0: config.auth0,
    error: req.query.error ? true : false,
    user: req.query.user ? req.query.user : ''
  });
});

app.get('/cal', function(req, res) {
  cal.clear();
  cal.setDomain(config.domain).setName(config.calendarTitle);

  wb.events.feed.events.filter(function(thisEvent) {
    if (!(thisEvent.start_time && thisEvent.end_time && thisEvent.name && thisEvent.description)) {
      console.log('Not enough information on this event', thisEvent.name, thisEvent.start_time, thisEvent.end_time, thisEvent.description);
    }
    return thisEvent.start_time && thisEvent.end_time && thisEvent.name && thisEvent.description;
  }).forEach(function(thisEvent) {
      cal.addEvent({
        start: new Date(thisEvent.start_time),
        end: new Date(thisEvent.end_time),
        summary: thisEvent.name + ' by ' + thisEvent.group_name,
        description: thisEvent.description + ' \n\nEvent URL: ' + thisEvent.url || thisEvent.group_url,
        location: thisEvent.location || config.city,
        url: thisEvent.url || thisEvent.group_url
      });
  });

  // add next We Build LIVE show dat
  request(podcastApiUrl, function(err, msg, response) {
    if (err) {
     console.error(clc.red('Error: Fetching We Build Live podcast api'));
     return;
    }
    response = JSON.parse(response);
    cal.addEvent({
      start: new Date(response.meta.next_live_show.start_time),
      end: new Date(response.meta.next_live_show.end_time),
      summary: response.meta.next_live_show.summary,
      description: response.meta.next_live_show.description + ' \n\nEvent URL: ' + response.meta.next_live_show.url,
      location: config.city,
      url: response.meta.next_live_show.url
    });
    cal.serve(res);
  });

});

app.get('/check', function(req, res) {
  res.redirect('/#check');
});

app.get('/callback', wb.passport.callback);

app.post('/api/v1/events/update', function(req, res) {
  if (req.param('secret') !== process.env.WEBUILD_API_SECRET) {
    res.status(503).send('Incorrect secret key');
    return;
  }
  wb.events.update();
  res.status(200).send('Events feed updating...');
});

app.post('/api/v1/repos/update', function(req, res) {
  if (req.param('secret') !== process.env.WEBUILD_API_SECRET) {
    res.status(503).send('Incorrect secret key');
    return;
  }
  wb.repos.update().then(function() {
    console.log('GitHub feed generated');
  });
  res.status(200).send('Updating the repos feed; sit tight!');
});

app.post('/api/v1/archives/update', function(req, res) {
  if (req.param('secret') !== process.env.WEBUILD_API_SECRET) {
    res.status(503).send('Incorrect secret key');
    return;
  }
  archives.update();
  res.status(200).send('Updating the archives; sit tight!');

});

app.use('/api/v1/podcasts', cors(), function(req, res) {
 var url = podcastApiUrl;
 res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
 request(url, function(err, msg, response) {
  if (err) {
    res.status(503).send('We Build Live Error');
    return;
  }
  res.end(response);
 });
});

app.use(function(req, res) {
  res.redirect('/');
  return;
});


var ip = process.env.OPENSHIFT_IOJS_IP || '0.0.0.0';
var port = process.env.PORT || process.env.OPENSHIFT_IOJS_PORT || 3000;

http.createServer(app).listen(port, ip, function() {
  console.log(clc.black('Express server started at ', ip, ':', port));
});
