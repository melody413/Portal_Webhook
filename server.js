const express = require('express');
const app = express();
const axios = require('axios');
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

function notifySlack(photographer, bookingTime, cancellationTime) {
  const token =
    'xoxe.xoxp-1-Mi0yLTEyMzk0MDY0NzIzODQtNzE4MDIzMDc0MjYxMi03MjQxNTMyMDE1ODEyLTcyNTE3MjA5ODA1NDUtOTEwZmVmOWM5ZTUxZjFkNjNjNWJlYmM1NjU3ODY0NzBkYmYxMjVkMTJjNTE0OGM5ODE5MmMyMTNjZmQ1MGM3Yg ';
  const channelId = 'C0770TLKYUB'; // Replace with the channel ID

  const text = `${photographer}'s booking was cancelled. Booking Time was ${bookingTime} and cancelled at ${cancellationTime}`;

  axios
    .post(
      'https://slack.com/api/chat.postMessage',
      { channel: channelId, text: text },
      { headers: { authorization: `Bearer ${token}` } },
    )
    .then((res) => {
      console.log(`Notification sent: ${res.data}`);
    })
    .catch((error) => {
      console.error(`Error in sending notification: ${error.message}`);
    });
}
notifySlack('testing', 'testing', '2024/08/01');

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
