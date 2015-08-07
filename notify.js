'use strict';
var nodemailer = require('nodemailer');
var emailConfig = require('./config/email');

// setup email transporter
var transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    auth: emailConfig.auth
});
// given a response, used to notify
var notify = function(response) {
    console.log('notifying');
    if (response) {
        transporter.sendMail({
            from: 'admin@collectionstash.com',
            to: 'tyler.cvetan@gmail.com',
            subject: 'Reservation',
            text: response.results.searchText + '\r\n' + response.results.times.join(' '),
            html: response.results.searchText + '<br\><br\>' + response.results.times.join(' ')
        });
    }
    return response;
};
module.exports = notify;