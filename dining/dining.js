
// this will handle dining requests
import https from 'https';
import cookie from 'cookie';
import querystring from 'querystring';
import cheerio from 'cheerio';
import Q from 'q';
import merge from 'merge';
import venues from '../config/venues';

const sessionDataRequest = (reservation, resolve, reject) => {
  console.log('running session call'); // eslint-disable-line no-console

  https.get(reservation.url, (res) => {
    if (!res.headers['set-cookie']) {
      reject(new Error('cannot retrieve session cookie'));
      return;
    }

    const sessionCookie = cookie.parse(res.headers['set-cookie'].join(';')).PHPSESSID;
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      const $ = cheerio.load(data);
      const csrfToken = $('#pep_csrf').val();
      // add the necessary data to the reservation
      resolve(merge(true, {
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
const getSessionData = function getSessionData(reservation) {
  return Q.Promise(sessionDataRequest.bind(undefined, reservation)); // eslint-disable-line new-cap
};

const reservationDataRequest = function reservationDataRequest(reservation, resolve, reject) {
  console.log('running reservation call'); // eslint-disable-line no-console
  let time;
  if (reservation.time === 'dinner') {
    time = '80000714';
  } else if (reservation.time === 'lunch') {
    time = '80000717';
  } else if (reservation.time === 'breakfast') {
    time = '80000712';
  } else {
    time = reservation.time;
  }

  const postData = querystring.stringify({
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

  const callback = (response) => {
    let str = '';
    response.on('data', (chunk) => {
      str += chunk;
    });
    response.on('end', () => {
      console.log(response.statusCode); // eslint-disable-line no-console
      // add the raw response to the reservation data
      resolve(merge(true, {
        rawData: str
      }, reservation));
    });
  };

  const wdwReq = https.request(options, callback).on('error', function reservationRequestError(err) {
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
const getReservationData = function getReservationData(reservation) {
  return Q.Promise(reservationDataRequest.bind(undefined, reservation)); // eslint-disable-line new-cap
};
/**
 * This function will process the data in a more human readable format
 */
const isReservationAvailable = function isReservationAvailable(reservation) {
  return Q.Promise((resolve) => { // eslint-disable-line new-cap
    console.log('processing response'); // eslint-disable-line no-console
    console.log(reservation.rawData); // eslint-disable-line no-console
    const $ = cheerio.load(reservation.rawData);
    if (!$('#diningAvailabilityFlag').data('hasavailability')) {
      console.log('no availablity'); // eslint-disable-line no-console
      resolve(false);
    } else {
      // assuming there are some times available
      // now grab the actual available times
      const times = $('.pillLink', '.ctaAvailableTimesContainer').get().map((el) => {
        return $('.buttonText', el).text();
      });
      // add the results to the reservation data
      const searchText = $('.diningReservationInfoText.available').text().trim();
      // use the results for just the raw data
      // notification will be the data used if a notification is being sent
      console.log('has availablity'); // eslint-disable-line no-console
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
  if (!reservation.id) {
    return Promise.reject('Your revservation is missing an id.');
  }

  const reservationConfig = venues[reservation.id];
  if (!reservationConfig) {
    return Promise.reject('Could not find configuration for reservation ' + reservation.id);
  }

    // run
  return getSessionData(merge(true, reservation, reservationConfig)).then(getReservationData).then(isReservationAvailable);
}
