import dining from './src/dining/dining';
import notify from './src/notify';
import config from 'config';
import schedule from 'node-schedule';

// 15,000 * 14 minutes = 840,000
// shouldn't take a minute to run but just being safe
// const max = 840000;
// 15,000 * 9 minutes = 135, 000
const max = 135000;
const min = 0;

const processReservations = (element) => {
  dining(element).then(notify);
};

// cron style, run every 10 minutes
schedule.scheduleJob('*/10 * * * *', () => {
  const interval = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log('interval for this run is ' + Math.floor((interval % 3600000) / 60000) + ' minutes.');
  // at 15 minutes, then run the job randomly within there
  setTimeout(() => {
    config.get('reservations').forEach(processReservations);
  }, interval);
});
