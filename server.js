require('dotenv').config();
const moment = require('moment-timezone'); // Import moment-timezone
const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.text()); // For parsing raw text

const { WebClient } = require('@slack/web-api');
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const token = process.env.SLACK_BOT_TOKEN; // Replace with your actual token
const channelId = process.env.SLACK_CHANNEL_ID; // Replace with your Slack channel ID

const web = new WebClient(token);


//--------------------------------------API--------------------------------------------------//

app.post('/webhook', (req, res) => {
  const data = JSON.parse(req.body);

  if (data.orderStatus === 'cancelled') {
    const timezone = data.property_address.timezone;

    const bookingDate = moment.tz(data.date, "dddd, DD MMM, YYYY", timezone);
    const scheduledTimeStart = moment.tz(data.scheduled_time.split(' - ')[0], ["h:mm A"], timezone);

    // Merge date and time
    bookingDate.set({
      hour: scheduledTimeStart.get('hour'),
      minute: scheduledTimeStart.get('minute')
    });

    const scheduledStartTime = bookingDate.toDate();
    console.log("scheduledStartTime:", scheduledStartTime);

    // Create a date object for current time in the given timezone
    const currentDateTime = moment.tz(new Date(), timezone).toDate();
    console.log("currentDateTime:", currentDateTime);

    // Calculate the difference in hours 
    const timeDifferenceInHours = (currentDateTime.getTime() - scheduledStartTime.getTime()) / (1000 * 60 * 60);
    console.log("time Difference:", timeDifferenceInHours);

    if (timeDifferenceInHours <= 4) {
      cancelNotifyToSlack("", scheduledStartTime, currentDateTime);
    }
  }

  res.send('Data processed!');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

//--------------------------------------Function---------------------------------------------//

/**
 * This function is responsible for sending a cancellation alert to a Slack channel.
 * It takes the photographer's name, the time of booking, 
 * and the time of cancellation as parameters, formats these details, 
 * and sends a pre-formatted message to the Slack channel.
 *
 * @param {string} photographer - The name of the photographer.
 * @param {Date} bookingTime - The date and time when the booking was initially made.
 * @param {Date} cancellationTime - The date and time when the booking was cancelled.
 */
function cancelNotifyToSlack(photographer = "", bookingTime, cancellationTime) {
  const simpleBookingTime = moment(bookingTime).format('MMMM Do, YYYY h:mm A');
  const simpleCancellationTime = moment(cancellationTime).format('MMMM Do, YYYY h:mm A');

  const text = `*Booking Cancelled* \nPhotographer: ${photographer} \nBooking Time: ${simpleBookingTime} \nCancelled Time: ${simpleCancellationTime}`;

  web.chat
    .postMessage({
      channel: channelId,
      text: text,
    })
    .then((res) => {
      console.log('Message sent: ', res.ts);
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}
