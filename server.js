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

function cancelNotifyToSlack(photographer = "", bookingTime, cancellationTime) {
  const text = `${photographer}'s booking was cancelled. Booking Time was ${bookingTime} and cancelled at ${cancellationTime}`;

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

app.post('/webhook', (req, res) => {
  const data = JSON.parse(req.body);

  const timezone = data.property_address.timezone;
  console.log("Timezone:", timezone);

  // Prepare date and time
  const bookingDate = moment.tz(data.date, "dddd, DD MMM, YYYY", timezone); // Parse date
  console.log("bookingDate:", bookingDate);
  const scheduledTimeStart = moment.tz(data.scheduled_time.split(' - ')[0], ["h:mm A"], timezone); // Parse start time
  console.log("scheduledTimeStart:", scheduledTimeStart);

  // Merge date and time
  bookingDate.set({
    hour: scheduledTimeStart.get('hour'),
    minute: scheduledTimeStart.get('minute')
  });

  console.log("bookingDate:", bookingDate);

  const scheduledStartTime = bookingDate.toDate(); // Convert to JavaScript date
  console.log("scheduledStartTime:", scheduledStartTime);

  // Create a date object for current time in the given timezone
  const currentDateTime = moment.tz(new Date(), timezone).toDate();
  console.log("currentDateTime:", currentDateTime);

  // Calculate the difference in hours
  const timeDifferenceInHours = (scheduledStartTime.getTime() - currentDateTime.getTime()) / (1000 * 60 * 60);

  // Testing output
  // console.log(`Time difference: ${timeDifferenceInHours}`);

  // If the time difference is less than or equal to 4 hours, trigger the Slack notification
  if (data.orderStatus === 'cancelled') {
    cancelNotifyToSlack(scheduledStartTime, currentDateTime);
  }

  res.send('Data processed!');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
