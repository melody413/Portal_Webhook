const express = require('express');
const path = require('path');
const fs = require('fs');
const tj = require("@tmcw/togeojson");
const turf = require('@turf/turf');
const router = express.Router();

const { moment, app } = require('../config');
const { cancelNotifyToSlack, customer2PhotographerNotifyToSlack, isPointInPoly, droneNotifySlack } = require('../utils');
const { doNotSendPhotographers, allowedPhotographers, droneServices, geoShape } = require('../constant');
const DOMParser = require("xmldom").DOMParser;
const kml = new DOMParser().parseFromString(fs.readFileSync(__dirname + '../../../Airports.kml', "utf8"));
const converted = tj.kml(kml);

// console.log("****", converted.features[0].geometry.coordinates);

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

    const services = data.services;
    const services_a_la_cart = data.services_a_la_cart;
    const property_address = data.property_address;

    const isDroneServiceIncluded = services.some(service => droneServices.includes(service));
    const isDroneServiceIncludedInAlaCart = services_a_la_cart.some(service => droneServices.includes(service));

    if (isDroneServiceIncluded || isDroneServiceIncludedInAlaCart) {
        // console.log("One of the Drone Services is involved either in services or services_a_la_cart");
        var pt = { x: property_address.lng, y: property_address.lat };

        let placeMarkNames = [];

        for (var i = 0; i < converted.features.length; i++) {
            feature = converted.features[i];
            poly = feature.geometry.coordinates[0];

            if (isPointInPoly(poly, pt)) {
                console.log("The given point is in the polygon : ", feature.properties.name);
                placeMarkNames.push(feature.properties.name);
            }
        }

        console.log('***Result:', placeMarkNames);
        const folders = [];

        for (let key in geoShape) {
            if (geoShape[key].some(name => placeMarkNames.includes(name)))
                folders.push(key);
        }

        console.log("****", folders)
        if (folders.length >= 1) {
            if (folders.length == 1 && folders[0] == 'Splays Never') {
                droneNotifySlack(1, data.orderName, data.date + ", " + data.scheduled_time)
            } else if (folders.length == 1 && folders[0] == 'Splays After 5pm') {
                droneNotifySlack(2, data.orderName, data.date + "," + data.scheduled_time)
            } else if (folders.length == 1 && folders[0] == 'Splay before 6:00am') {
                droneNotifySlack(3, data.orderName, data.date + ", " + data.scheduled_time)
            } else if (folders.length == 1 && folders[0] == 'Mini drone') {
                droneNotifySlack(4, data.orderName, data.date + ", " + data.scheduled_time)
            } else if (folders.length >= 2 && folders.includes('Unlocking Licence') && folders.includes('Mini drone')) {
                droneNotifySlack(5, data.orderName, data.date + ", " + data.scheduled_time)
            } else if (folders.length >= 2 && folders.includes('Unlocking Licence') && folders.includes('Splays Never')) {
                droneNotifySlack(6, data.orderName, data.date + ", " + data.scheduled_time)
            } else if (folders.length >= 2 && folders.includes('Unlocking Licence') && folders.includes('Splays After 5pm')) {
                droneNotifySlack(7, data.orderName, data.date + ", " + data.scheduled_time)
            } else if (folders.length >= 2 && folders.includes('Unlocking Licence') && folders.includes('Splay before 6:00am')) {
                droneNotifySlack(8, data.orderName, data.date + ", " + data.scheduled_time)
            }
        }

    } else {
        console.log("None of the Drone Services are involved in services or services_a_la_cart");
    }

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