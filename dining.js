// this will handle dining requests
var http = require('http');
var https = require('https');
var cookie = require('cookie');
var querystring = require('querystring');
var cheerio = require('cheerio');
var Q = require('q');
/**
 * Function to get session cookie and csrf token
 */
var getSessionData = function() {
    return Q.Promise(function(resolve, reject, notify) {
        console.log('running session call');
        var initReq = https.get("https://disneyworld.disney.go.com/dining/magic-kingdom/be-our-guest-restaurant/", function(res) {
            var sessionCookie = cookie.parse(res.headers['set-cookie'].join(';'))['PHPSESSID'];
            // console.log(sessionCookie);
            var data = '';
            res.on("data", function(chunk) {
                data += chunk;
            });
            res.on('end', function() {
                $ = cheerio.load(data);
                var csrfToken = $('#pep_csrf').val();
                resolve({
                    sessionCookie: sessionCookie,
                    csrfToken: csrfToken
                });
            });
        }).on('error', function(e) {
            reject(new Error("cannot retrieve session data " + e.message));
        });
    });
};
// eventually this will get passed information to process
var getReservationData = function(sessionData) {
    return Q.Promise(function(resolve, reject, notify) {
        console.log('running reservation call');
        var postData = querystring.stringify({
            pep_csrf: sessionData.csrfToken,
            searchDate: '2015-12-11',
            skipPricing: true,
            searchTime: '18:30',
            partySize: 2,
            id: '90002066;entityType=restaurant',
            type: 'dining'
        });
        var options = {
            host: 'disneyworld.disney.go.com',
            path: '/finder/dining-availability/',
            method: 'POST',
            headers: {
                // these are the two things you definitely need
                // the s_vi one looks like it just needs to have been created at some point, keep alive is a couple years so don't need to try and get it each time
                'Cookie': 'PHPSESSID=' + sessionData.sessionCookie + '; s_vi=[CS]v1|2AE01B6C05012E2B-4000013760054F62[CE]',
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
        callback = function(response) {
            var str = ''
            response.on('data', function(chunk) {
                str += chunk;
            });
            response.on('end', function() {
                console.log(response.statusCode);
                console.log(response.statusMessage);
                resolve(str);
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
var isReservationAvailable = function(html) {
    console.log('processing response');
    $ = cheerio.load(html);
    if ($('.ctaNoAvailableTimesContainer').length) {
        return false;
    } else {
        return true;
    }
};
// run 
getSessionData().then(getReservationData).then(isReservationAvailable).then(function(has) {
    console.log(has);
})