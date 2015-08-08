// this will be the main scheduler for the app
'use strict';
import dining from './dining/dining';
import notify from './notify';
import reservations from './config/reservations';

var processReservations = function(element, index, array) {
	dining(element).then(notify);
};

reservations.forEach(processReservations);


