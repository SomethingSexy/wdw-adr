// this will be the main scheduler for the app
'use strict';
var dining = require('./dining/dining');
var notify = require('./notify');
var reservations = require('./config/reservations');


var processReservations = function(element, index, array) {
	dining(element).then(notify);
};

reservations.forEach(processReservations);


