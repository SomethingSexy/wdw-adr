import dining from './dining/dining';
import notify from './notify';
import reservations from './config/reservations';
import schedule from 'node-schedule';

var processReservations = function(element, index, array) {
  dining(element).then(notify);
};

// cron style, run every 15 minutes
schedule.scheduleJob('*/15 * * * *', function() {
  reservations.forEach(processReservations);
});
