'use strict';
// this will handle dining requests
var http = require('http');
var https = require('https');
var cookie = require('cookie');
var querystring = require('querystring');
var cheerio = require('cheerio');
var Q = require('q');
var merge = require('merge');
/**
 * Function to get session cookie and csrf token
 */
var getSessionData = function(reservation) {
    return Q.Promise(function(resolve, reject, notify) {
        console.log('running session call');
        var initReq = https.get(reservation.url, function(res) {
            var sessionCookie = cookie.parse(res.headers['set-cookie'].join(';'))['PHPSESSID'];
            // console.log(sessionCookie);
            var data = '';
            res.on("data", function(chunk) {
                data += chunk;
            });
            res.on('end', function() {
                var $ = cheerio.load(data);
                var csrfToken = $('#pep_csrf').val();
                resolve(merge(true, {
                    sessionCookie: sessionCookie,
                    csrfToken: csrfToken
                }, reservation));
            });
        }).on('error', function(e) {
            reject(new Error("cannot retrieve session data " + e.message));
        });
    });
};
/**
 * This function will attempt to retrieve reservation availablity data
 */
var getReservationData = function(reservation) {
    return Q.Promise(function(resolve, reject, notify) {
        console.log('running reservation call');
        var time;
        if (reservation.time === 'dinner') {
            time = ' 80000714';
        } else {
            time = reservation.time;
        }
        var postData = querystring.stringify({
            pep_csrf: reservation.csrfToken,
            searchDate: reservation.date,
            skipPricing: true,
            searchTime: '18:30',
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
                'Cookie': 'PHPSESSID=' + reservation.sessionCookie + '; s_vi=[CS]v1|2AE01B6C05012E2B-4000013760054F62[CE]',
                // need these otherwise it 302
                Host: 'disneyworld.disney.go.com',
                Origin: 'https://disneyworld.disney.go.com',
                Referer: 'https://disneyworld.disney.go.com/dining/magic-kingdom/be-our-guest-restaurant/',
                // end need
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length,
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.125 Safari/537.36',
                Accept: '*/*',
                // TODO: figure out how we can accept gzipping to be nice
                // 'Accept-Encoding':'gzip, deflate',
                'Accept-Language': 'en-US,en;q=0.8',
                'X-Requested-With': 'XMLHttpRequest',
                'X-NewRelic-ID': 'Uw4BWVZSGwUCXFVVBwI='
            }
        };
        var callback = function(response) {
            var str = ''
            response.on('data', function(chunk) {
                str += chunk;
            });
            response.on('end', function() {
                console.log(response.statusCode);
                console.log(response.statusMessage);
                resolve(merge(true, {
                    rawData: str,
                }, reservation));
            });
        }
        var wdwReq = https.request(options, callback).on('error', function(err) {
            console.log(err);
        });
        //This is the data we are posting, it needs to be a string or a buffer
        wdwReq.write(postData);
        wdwReq.end();
    });
};
/**
 * This function will process the data in a more human readable format
 */
var isReservationAvailable = function(reservation) {
    console.log('processing response');
    console.log(reservation.rawData);
    var $ = cheerio.load(reservation.rawData);
    if (!$('#diningAvailabilityFlag').data('hasavailability')) {
        return false;
    } else {
        // assuming there are some times available
        // now grab the actual available times
        var times = $('.pillLink', '.ctaAvailableTimesContainer').get().map(function(i, el) {
            return $('.buttonText', el).text();
        });
        console.log(times);
        return merge(true, {
            results: {
                times: times,
                searchText: $('.diningReservationInfoText.available').text().trim()
            }
        }, reservation)
        return {};
    }
};

module.exports = function(reservation) {
    // run 
    return getSessionData(reservation).then(getReservationData).then(isReservationAvailable);
};