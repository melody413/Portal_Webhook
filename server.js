require('dotenv').config();

const express = require('express');
const app = express();
const { WebClient } = require('@slack/web-api');
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const token = process.env.SLACK_BOT_TOKEN; // Replace with your actual token
const channelId = process.env.SLACK_CHANNEL_ID; // Replace with your Slack channel ID

const web = new WebClient(token);

function notifySlack(photographer, bookingTime, cancellationTime) {
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

// notifySlack('test', 'test', 'test');
app.get('/notifySlack', (req, res) => {
  // Calls notifySlack function with parameters supplied by the user
  const photographer = req.query.photographer;
  const bookingTime = req.query.bookingTime;
  const cancellationTime = req.query.cancellationTime;

  notifySlack(photographer, bookingTime, cancellationTime);

  res.send('Notification sent to Slack!');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
