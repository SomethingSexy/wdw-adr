
// this will handle dining requests
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _cookie = require('cookie');

var _cookie2 = _interopRequireDefault(_cookie);

var _querystring = require('querystring');

var _querystring2 = _interopRequireDefault(_querystring);

var _cheerio = require('cheerio');

var _cheerio2 = _interopRequireDefault(_cheerio);

var _q = require('q');

var _q2 = _interopRequireDefault(_q);

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _configVenues = require('../config/venues');

var _configVenues2 = _interopRequireDefault(_configVenues);

var sessionDataRequest = function sessionDataRequest(reservation, resolve, reject) {
  console.log('running session call'); // eslint-disable-line no-console

  _https2['default'].get(reservation.url, function (res) {
    if (!res.headers['set-cookie']) {
      reject(new Error('cannot retrieve session cookie'));
      return;
    }

    var sessionCookie = _cookie2['default'].parse(res.headers['set-cookie'].join(';')).PHPSESSID;
    var data = '';

    res.on('data', function (chunk) {
      data += chunk;
    });

    res.on('end', function () {
      var $ = _cheerio2['default'].load(data);
      var csrfToken = $('#pep_csrf').val();
      // add the necessary data to the reservation
      resolve((0, _merge2['default'])(true, {
        sessionCookie: sessionCookie,
        csrfToken: csrfToken
      }, reservation));
    });
  }).on('error', function sessionRequestError(e) {
    reject(new Error('cannot retrieve session data ' + e.message));
  });
};

/**
 * Function to get session cookie and csrf token
 */
var getSessionData = function getSessionData(reservation) {
  return _q2['default'].Promise(sessionDataRequest.bind(undefined, reservation)); // eslint-disable-line new-cap
};

var reservationDataRequest = function reservationDataRequest(reservation, resolve, reject) {
  console.log('running reservation call'); // eslint-disable-line no-console
  var time = undefined;
  if (reservation.time === 'dinner') {
    time = '80000714';
  } else if (reservation.time === 'lunch') {
    time = '80000717';
  } else if (reservation.time === 'breakfast') {
    time = '80000712';
  } else {
    time = reservation.time;
  }

  var postData = _querystring2['default'].stringify({
    pep_csrf: reservation.csrfToken,
    searchDate: reservation.date,
    skipPricing: true,
    searchTime: time,
    partySize: reservation.partySize,
    id: reservation.id,
    type: 'dining'
  });

  var options = {
    host: 'disneyworld.disney.go.com',
    path: '/finder/dining-availability/',
    method: 'POST',
    headers: {
      // these are the two things you definitely need
      // the s_vi one looks like it just needs to have been created at some point, keep alive is a couple years so don't need to try and get it each time
      'Cookie': 'PHPSESSID=' + reservation.sessionCookie + '; s_vi=[CS]v1|2AE01B6C05012E2B-4000013760054F62[CE];',
      // need these otherwise it 302
      Host: 'disneyworld.disney.go.com',
      Origin: 'https://disneyworld.disney.go.com',
      Referer: reservation.url,
      // end need
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length,
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.125 Safari/537.36',
      Accept: '*/*',
      // TODO: figure out how we can accept gzipping to be nice
      // 'Accept-Encoding':'gzip, deflate',
      'Accept-Language': 'en-US,en;q=0.8',
      'X-Requested-With': 'XMLHttpRequest'
    }
  };

  var callback = function callback(response) {
    var str = '';
    response.on('data', function (chunk) {
      str += chunk;
    });
    response.on('end', function () {
      console.log(response.statusCode); // eslint-disable-line no-console
      // add the raw response to the reservation data
      resolve((0, _merge2['default'])(true, {
        rawData: str
      }, reservation));
    });
  };

  var wdwReq = _https2['default'].request(options, callback).on('error', function reservationRequestError(err) {
    console.log(err); // eslint-disable-line no-console
    reject(err);
  });

  // This is the data we are posting, it needs to be a string or a buffer
  wdwReq.write(postData);
  wdwReq.end();
};

/**
 * This function will attempt to retrieve reservation availablity data
 */
var getReservationData = function getReservationData(reservation) {
  return _q2['default'].Promise(reservationDataRequest.bind(undefined, reservation)); // eslint-disable-line new-cap
};
/**
 * This function will process the data in a more human readable format
 */
var isReservationAvailable = function isReservationAvailable(reservation) {
  return _q2['default'].Promise(function (resolve) {
    // eslint-disable-line new-cap
    console.log('processing response'); // eslint-disable-line no-console
    console.log(reservation.rawData); // eslint-disable-line no-console
    var $ = _cheerio2['default'].load(reservation.rawData);
    if (!$('#diningAvailabilityFlag').data('hasavailability')) {
      console.log('no availablity'); // eslint-disable-line no-console
      resolve(false);
    } else {
      // assuming there are some times available
      // now grab the actual available times
      var times = $('.pillLink', '.ctaAvailableTimesContainer').get().map(function (el) {
        return $('.buttonText', el).text();
      });
      // add the results to the reservation data
      var searchText = $('.diningReservationInfoText.available').text().trim();
      // use the results for just the raw data
      // notification will be the data used if a notification is being sent
      console.log('has availablity'); // eslint-disable-line no-console
      resolve((0, _merge2['default'])(true, {
        results: {
          times: times,
          searchText: searchText
        },
        notification: {
          subject: reservation.title,
          bodyText: searchText + '\r\n' + times.join(' '),
          bodyHtml: searchText + '<br\><br\>' + times.join(' ')
        }
      }, reservation));
    }
  });
};

exports['default'] = function (reservation) {
  if (!reservation.id) {
    return Promise.reject('Your revservation is missing an id.');
  }

  var reservationConfig = _configVenues2['default'][reservation.id];
  if (!reservationConfig) {
    return Promise.reject('Could not find configuration for reservation ' + reservation.id);
  }

  // run
  return getSessionData((0, _merge2['default'])(true, reservation, reservationConfig)).then(getReservationData).then(isReservationAvailable);
};

module.exports = exports['default'];