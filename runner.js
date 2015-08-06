// this will be the main scheduler for the app
'use strict';

var dining  = require('./dining/dining');
var notify = require('./notify');

dining().then(notify);