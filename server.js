var http = require('http');
var https = require('https');
var cookie = require('cookie');
var querystring = require('querystring');
var server = http.createServer(function(req, res) {
    if (req.url === '/favicon.ico') {
        res.writeHead(200, {
            'Content-Type': 'image/x-icon'
        });
        res.end();
        console.log('favicon requested');
        return;
    }
    var initReq = https.get("https://disneyworld.disney.go.com/dining/magic-kingdom/be-our-guest-restaurant/", function(res) {
        var sessionCookie = cookie.parse(res.headers['set-cookie'].join(';'))['PHPSESSID'];
        sessionCookie = 'at5ki0qibtkc19htuobj9sepb2';
        console.log(sessionCookie);
        var postData = querystring.stringify({
        	// TODO: Need to pull this from the above request HTML response
            pep_csrf: '0c5e143929d14eb707be68af219598ca286eac692114d10f36a1fea4344d0d35502347be602cc8e4d5dba30b4e0eeeb6c3beb3deef17395530a43a4d4b6f76a4',
            searchDate: '2015-08-04',
            skipPricing: true,
            searchTime: '08:00',
            partySize: 2,
            id: '16660079;entityType=restaurant',
            type: 'dining'
        });
        var options = {
            host: 'disneyworld.disney.go.com',
            path: '/finder/dining-availability/',
            method: 'POST',
            headers: {
            	// these are the two things you definitely need
            	// the s_vi one looks like it just needs to have been created at some point, keep alive is a couple years so don't need to try and get it each time
                'Cookie': 'PHPSESSID=at5ki0qibtkc19htuobj9sepb2; s_vi=[CS]v1|2AE01B6C05012E2B-4000013760054F62[CE]',
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
                'Accept-Language':'en-US,en;q=0.8',
                'X-Requested-With': 'XMLHttpRequest',
                'X-NewRelic-ID':'Uw4BWVZSGwUCXFVVBwI='
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
                console.log(str);
            });
        }
        var wdwReq = https.request(options, callback).on('error', function(err) {
            console.log(err);
        });
        //This is the data we are posting, it needs to be a string or a buffer
        wdwReq.write(postData);
        wdwReq.end();
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
    res.writeHead(200);
    res.end('Hello Http');
});
server.listen(8080);