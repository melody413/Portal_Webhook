const express = require('express');
const router = express.Router();
const { moment, app } = require('../config');
const { cancelNotifyToSlack, customer2PhotographerNotifyToSlack } = require('../utils');
const { doNotSendPhotographers, allowedPhotographers } = require('../constant');

app.post('/booking-cancel', (req, res) => {
    const data = JSON.parse(req.body);

    if (data.orderStatus === 'cancelled') {
        const photographers = data.photographers;
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

        // Check whether the booking photographer is in the allowed photographers list
        const isAllowNotify = photographers.some(photographer =>
            allowedPhotographers.includes(photographer.email)
        );

        if (timeDifferenceInHours <= 4 && timeDifferenceInHours >= 0 && isAllowNotify) {
            cancelNotifyToSlack(photographers[0].name, orderName, scheduledStartTime, currentDateTime);
        }
    }

    res.send('Data processed!');
});

app.post('/webhook', (req, res) => {
    const data = JSON.parse(req.body);

    if (data.orderStatus === "pending") {
        for (let photographer of data.photographers) {
            let photographerName = photographer.name;

            if (doNotSendPhotographers.hasOwnProperty(photographerName)) {
                if (doNotSendPhotographers[photographerName].includes(data.client_full_name)) {
                    customer2PhotographerNotifyToSlack(data.orderName, data.date, data.scheduled_time, data.client_full_name, photographerName,)
                }
            }
        }
    }
    res.send('Data processed!');
});

module.exports = router;