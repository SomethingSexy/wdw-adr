'use strict';
import nodemailer from 'nodemailer';
import emailConfig from './config/email';
import notificationConfig from './config/notification';

// setup email transporter
const transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    auth: emailConfig.auth
});
// given a response, used to notify
let notify = function(response, person) {
    transporter.sendMail({
        from: emailConfig.from,
        to: person.email,
        subject: 'Reservation - ' + response.title,
        text: response.notification.bodyText,
        html: response.notification.bodyHtml
    });
};

let processResponse = function(response){
    if (response) {
        console.log('notifying');
        // see who is configured for this reservation
        if(Array.isArray(response.notify)){
            response.notify.forEach((element, index, array) => {
                notify(response, notificationConfig[element]);
            });
        }
    }

    return response;
};

export default processResponse;