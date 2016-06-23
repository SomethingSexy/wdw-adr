import nodemailer from 'nodemailer';
import config from 'config';

// setup email transporter
const transporter = nodemailer.createTransport({
  host: config.get('email.host'),
  port: config.get('email.port'),
  auth: config.get('email.auth')
});
// given a response, used to notify
const notify = (response, person) => {
  transporter.sendMail({
    from: config.get('email.from'),
    to: person.email,
    subject: response.notification.subject,
    text: response.notification.bodyText,
    html: response.notification.bodyHtml
  });
};

const processResponse = (response) => {
  if (response) {
    console.log('notifying');
    // see who is configured for this reservation
    if (Array.isArray(response.notify)) {
      response.notify.forEach((element) => {
        notify(response, config.get('notifications')[element]);
      });
    }
  }

  return response;
};

export default processResponse;
