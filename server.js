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

app.post('/booking-cancel', (req, res) => {
  const data = JSON.parse(req.body);
  console.log("111111**************************:", data);

  if (data.orderStatus === 'cancelled') {
    const orderName = data.orderName;
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
    const timeDifferenceInHours = (scheduledStartTime.getTime() - currentDateTime.getTime()) / (1000 * 60 * 60);
    console.log("time Difference:", timeDifferenceInHours);

    if (timeDifferenceInHours <= 4 && timeDifferenceInHours >= 0) {
      cancelNotifyToSlack("", orderName, scheduledStartTime, currentDateTime);
    }
  }

  res.send('Data processed!');
});

app.post('/webhook', (req, res) => {
  const data = JSON.parse(req.body);
  console.log("22222**************************:", data);
  if (data.orderStatus === "pending") {
    const doNotSendPhotographers = {
      "Tony Scott": ["JMO", "JMO PROPERTY GROUP", "JMO Property Group Group", "Taleesha", "Taleesha Kelly", "Jennifer Oliver", "Jo Dryden", "Michelle Osmond", "Sam Ware", "Rebekah Ware", "Teza Fruzande", "Tammie Cory Jones", "Naveep Singh", "Belinda Beekman"],
      "Jocelyn Bong": ["JMO", "JMO PROPERTY GROUP", "JMO Property Group Group", "Taleesha", "Taleesha Kelly", "Jennifer Oliver", "Jo Dryden", "Michelle Osmond", "Peter Florentzos", "Alex Fan", "Nick Yamada", "Mary Chai", "Alan Gu", "Shirley Chow", "Sienna Kim", "Jackson Chow", "Pragya Ojha", "Faraz Peyman", "Ana Wang", "Kosmo Comino", "Sergio Chen", "Hanna Shine", "Rachael Lancaster", "Michael O’Brien", "Jack McKenzie", "Casey Brigland", "Louise Denisenko", "Naveep Singh", "Belinda Beekman"],
      "Catalina Araya": ["Belinda Beekman", "Naveep Singh"],
      "Kirk Halstead": ["Nick Yamada", "Mary Chai", "JMO", "JMO PROPERTY GROUP", "JMO Property Group Group", "Taleesha", "Taleesha Kelly", "Jennifer Oliver", "Jo Dryden", "Michelle Osmond", "Belinda Beekman"],
      "April O’Neil": ["Sharon DesPasquale", "JMO", "JMO PROPERTY GROUP", "JMO Property Group Group", "Taleesha", "Taleesha Kelly", "Jennifer Oliver", "Jo Dryden", "Michelle Osmond", "Gus Yoshida", "Kristy Milford", "Lizzie Basford", "Naveep Singh", "Belinda Beekman"],
      "Andreja Mitivoik": ["JMO", "JMO PROPERTY GROUP", "JMO Property Group Group", "Taleesha", "Taleesha Kelly", "Jennifer Oliver", "Jo Dryden", "Michelle Osmond", "Belinda Beekman"],
      "Chi Cantrell": ["JMO", "JMO PROPERTY GROUP", "JMO Property Group Group", "Taleesha", "Taleesha Kelly", "Jennifer Oliver", "Jo Dryden", "Michelle Osmond", "Naveep Singh", "Belinda Beekman"]
    };
    for (let photographer of data.photographers) {
      let photographerName = photographer.name;

      if (doNotSendPhotographers.hasOwnProperty(photographerName)) {
        if (doNotSendPhotographers[photographerName].includes(data.client_full_name)) {
          // await webhook.send({
          //   text: `Photographer ${photographerName} is booked with customer ${data.client_full_name}!`,
          // });
          customer2PhotographerNotifyToSlack(data.orderName, data.date, data.scheduled_time, data.client_full_name, photographerName,)
        }
      }
    }
  }
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
 * @param {string} orderName - The name of the oder. "Special Package - Brisbane QLD, Australia - Artem Zakharov",
 * @param {Date} bookingTime - The date and time when the booking was initially made.
 * @param {Date} cancellationTime - The date and time when the booking was cancelled.
 */
function cancelNotifyToSlack(photographer = "", orderName, bookingTime, cancellationTime) {
  const simpleBookingTime = moment(bookingTime).format('MMMM Do, YYYY h:mm A');
  const simpleCancellationTime = moment(cancellationTime).format('MMMM Do, YYYY h:mm A');

  const text = `*Booking Cancelled*\nOrder Name: ${orderName} \nPhotographer: ${photographer} \nBooking Time: ${simpleBookingTime} \nCancelled Time: ${simpleCancellationTime}`;

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

/**
 * Send a notification to a Slack channel about a booking.
 *
 * @param {string} orderName - The name of the order in question.
 * @param {string} orderDate - The date the order was made.
 * @param {string} schedule_time - The time the booking is scheduled for.
 * @param {string} customer - The customer involved in the transaction.
 * @param {string} photographer - The photographer involved in the transaction.
 * @param {string} simpleBookingTime - The simple (detailed) time of the booking.
 *
 * The function works by creating a detailed formatted string of the notification data and sending 
 * this as a chat message to the Slack channel dynamically.
 * 
 * If the message is sent successfully, a console log with the message receipt timestamp is shown.
 * If an error happens during message transmission, the error is caught and logged to the console.
 */
function customer2PhotographerNotifyToSlack(orderName, orderDate, schedule_time, customer, photographer, simpleBookingTime) {
  const text = `*Booking created*\nOrder name: ${orderName} \nOrder name: ${orderDate}, ${schedule_time} \nCustomer: ${customer} \nPhotographer: ${photographer} \nBooking Time: ${simpleBookingTime}`;

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