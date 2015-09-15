import dining from './dining/dining';
import notify from './notify';
import reservations from './config/reservations';
import schedule from 'node-schedule';

// 15,000 * 14 minutes = 840,000
const max = 840000;
const min = 0;

const processReservations = (element) => {
  dining(element).then(notify);
};

// cron style, run every 15 minutes
schedule.scheduleJob('*/15 * * * *', () => {
  const interval = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log('interval for this run ' + interval);
  // at 15 minutes, then run the job randomly within there
  setTimeout(() => {
    reservations.forEach(processReservations);
  }, interval);
});
