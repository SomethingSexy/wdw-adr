
// this will handle dining requests
import https from 'https';
import cookie from 'cookie';
import querystring from 'querystring';
import cheerio from 'cheerio';
import Q from 'q';
import merge from 'merge';
/**
 * Function to get session cookie and csrf token
 */
const getSessionData = function(reservation) {
  return Q.Promise(function(resolve, reject) {
    console.log('running session call');

    let initReq = https.get(reservation.url, function(res) {
      const sessionCookie = cookie.parse(res.headers['set-cookie'].join(';'))['PHPSESSID'];
      let data = '';

      res.on('data', function(chunk) {
        data += chunk;
      });
      
      res.on('end', function() {
        let $ = cheerio.load(data);
        let csrfToken = $('#pep_csrf').val();
        // add the necessary data to the reservation
        resolve(merge(true, {
          sessionCookie: sessionCookie,
          csrfToken: csrfToken
        }, reservation));
      });
    }).on('error', function(e) {
      reject(new Error('cannot retrieve session data ' + e.message));
    });
  });
};
/**
 * This function will attempt to retrieve reservation availablity data
 */
const getReservationData = function(reservation) {
  return Q.Promise(function(resolve, reject) {
    console.log('running reservation call');
    let time;
    if (reservation.time === 'dinner') {
      time = '80000714';
    } if(reservation.time === 'breakfast'){
      time = '80000712';
    } else {
      time = reservation.time;
    }

    let postData = querystring.stringify({
      pep_csrf: reservation.csrfToken,
      searchDate: reservation.date,
      skipPricing: true,
      searchTime: time,
      partySize: reservation.partySize,
      id: reservation.id,
      type: 'dining'
    });

    const options = {
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

    const callback = function(response) {
      let str = '';
      response.on('data', function(chunk) {
          str += chunk;
      });
      response.on('end', function() {
        console.log(response.statusCode);
        // add the raw response to the reservation data
        resolve(merge(true, {
          rawData: str,
        }, reservation));
      });
    };

    const wdwReq = https.request(options, callback).on('error', function(err) {
      console.log(err);
    });

    // This is the data we are posting, it needs to be a string or a buffer
    wdwReq.write(postData);
    wdwReq.end();
  });
};
/**
 * This function will process the data in a more human readable format
 */
const isReservationAvailable = function(reservation) {
  return Q.Promise(function(resolve, reject) {
    console.log('processing response');
    console.log(reservation.rawData);
    let $ = cheerio.load(reservation.rawData);
    if (!$('#diningAvailabilityFlag').data('hasavailability')) {
      console.log('no availablity');
      resolve(false);
    } else {
      // assuming there are some times available
      // now grab the actual available times
      var times = $('.pillLink', '.ctaAvailableTimesContainer').get().map((el) => {
          return $('.buttonText', el).text();
      });
      // add the results to the reservation data
      const searchText = $('.diningReservationInfoText.available').text().trim();
      // use the results for just the raw data
      // notification will be the data used if a notification is being sent
      console.log('has availablity');
      resolve(merge(true, {
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

export default function(reservation) {
    // run
  return getSessionData(reservation).then(getReservationData).then(isReservationAvailable);
}
