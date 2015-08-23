import dining from './dining/dining';
import notify from './notify';
import reservations from './config/reservations';
import schedule from 'node-schedule';

const processReservations = (element) => {
  dining(element).then(notify);
};

// cron style, run every 15 minutes
schedule.scheduleJob('*/15 * * * *', () => {
  reservations.forEach(processReservations);
});
