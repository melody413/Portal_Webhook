const express = require('express');
const path = require('path');
const fs = require('fs');
const tj = require("@tmcw/togeojson");
const turf = require('@turf/turf');
const router = express.Router();
const cron = require('node-cron');

const { moment, app } = require('../config');
const { cancelNotifyToSlack, customer2PhotographerNotifyToSlack, isPointInPoly, droneNotifySlack, sendTextMessage, createMondayTickeet } = require('../utils');
const { doNotSendPhotographers, allowedPhotographers, droneServices, geoShape, cityDroneServices } = require('../constant');
const DOMParser = require("xmldom").DOMParser;
const kml = new DOMParser().parseFromString(fs.readFileSync(__dirname + '../../../Airports1.kml', "utf8"));
const converted = tj.kml(kml);

const commerical_kml = new DOMParser().parseFromString(fs.readFileSync(__dirname + '../../../Commercial.kml', "utf8"));
const converted_commerical = tj.kml(commerical_kml);

const airport_drone_kml = new DOMParser().parseFromString(fs.readFileSync(__dirname + '../../../Untitled.kml', "utf8"));
const converted_airport = tj.kml(airport_drone_kml);

app.get('/test', (req, res) => {
    console.log('-------------------')
    res.send('Data success!')
})

app.post('/booking-change', (req, res) => {
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
    } else if (data.orderStatus === 'complete') {
        const phoneNumber = data.phone_number;
        console.log('***phoneNumber', phoneNumber);

        // //read the file with previous sent messages
        // fs.readFile('messages.json', (err, data) => {
        //     if (err) throw err;

        //     let messages = JSON.parse(data);
        //     //Find if a message has already been sent within 180 days
        //     let foundMessage = messages.find(message => {
        //         return message.phoneNumber === phoneNumber && moment().diff(moment(message.date), 'days') <= 180
        //     });
        //     console.log('*** FoundMessage', foundMessage);
        //     if (!foundMessage) {
        //         //If message not found, send a text message
        //         let message = {
        //             phoneNumber: phoneNumber,
        //             date: moment().format()
        //         };
        //         //Add to messages array
        //         messages.push(message);

        //         // Update the messages file
        //         fs.writeFile('messages.json', JSON.stringify(messages), err => {
        //             if (err) throw err;
        //         });

        //         cron.schedule('0 */4 * * *', () => {
        //             console.log('***This is a cron after 4 hoursa');
        //         });
        //     }
        // });
    }

    res.send('Data processed!');
});

app.post('/webhook', (req, res) => {
    const data = JSON.parse(req.body);
    // console.log('----Data:', data);

    const services = data.services;
    const services_a_la_cart = data.services_a_la_cart;
    const property_address = data.property_address;
    const photographerName = data.photographers[0].name;

    const isDroneServiceIncluded = services.some(service => droneServices.includes(service));
    const isDroneServiceIncludedInAlaCart = services_a_la_cart.some(service => droneServices.includes(service));

    const isDroneServiceIncluded1 = services.some(service => cityDroneServices.includes(service));
    const isDroneServiceIncludedInAlaCart1 = services_a_la_cart.some(service => cityDroneServices.includes(service));


    var pt = { x: property_address.lng, y: property_address.lat };

    for (var i = 0; i < converted_airport.features.length; i++) {
        feature = converted_airport.features[i];
        poly = feature.geometry.coordinates;

        if (isPointInPoly(poly, pt)) {
            console.log("The given point is in the new city Point : ", feature.properties.name);

            if (isDroneServiceIncluded1 || isDroneServiceIncludedInAlaCart1) {
                console.log("One of the City Drone Services is involved either in services or services_a_la_cart");
                droneNotifySlack(11, data.orderName, data.date, data.scheduled_time, data.property_address.timezone, photographerName)
            } else {
                console.log("One of the City Drone Services is not involved either in services or services_a_la_cart");
            }
        }
    }

    if (isDroneServiceIncluded || isDroneServiceIncludedInAlaCart) {
        console.log("One of the Drone Services is involved either in services or services_a_la_cart");
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
                droneNotifySlack(1, data.orderName, data.date, data.scheduled_time, data.property_address.timezone, photographerName)
            } else if (folders.length == 1 && folders[0] == 'Splays After 5pm') {
                droneNotifySlack(2, data.orderName, data.date, data.scheduled_time, data.property_address.timezone, photographerName)
            } else if (folders.length == 1 && folders[0] == 'Splay before 6:00am') {
                droneNotifySlack(3, data.orderName, data.date, data.scheduled_time, data.property_address.timezone, photographerName)
            } else if (folders.length == 1 && folders[0] == 'Mini drone') {
                droneNotifySlack(4, data.orderName, data.date, data.scheduled_time, data.property_address.timezone, photographerName)
            } else if (folders.length >= 2 && folders.includes('Unlocking Licence') && folders.includes('Mini drone')) {
                droneNotifySlack(5, data.orderName, data.date, data.scheduled_time, data.property_address.timezone, photographerName)
            } else if (folders.length >= 2 && folders.includes('Unlocking Licence') && folders.includes('Splays Never')) {
                droneNotifySlack(6, data.orderName, data.date, data.scheduled_time, data.property_address.timezone, photographerName)
            } else if (folders.length >= 2 && folders.includes('Unlocking Licence') && folders.includes('Splays After 5pm')) {
                droneNotifySlack(7, data.orderName, data.date, data.scheduled_time, data.property_address.timezone, photographerName)
            } else if (folders.length >= 2 && folders.includes('Unlocking Licence') && folders.includes('Splay before 6:00am')) {
                droneNotifySlack(8, data.orderName, data.date, data.scheduled_time, data.property_address.timezone, photographerName)
            } else if (folders.length == 1 && folders[0] == 'Splays Never1') {
                droneNotifySlack(9, data.orderName, data.date, data.scheduled_time, data.property_address.timezone, photographerName)
            } else if (folders.length == 1 && folders[0] == 'New Airports' || placeMarkNames.includes('Redcliffe')) {
                droneNotifySlack(12, data.orderName, data.date, data.scheduled_time, data.property_address.timezone, photographerName)
            }
        }

        for (var i = 0; i < converted_commerical.features.length; i++) {
            feature = converted_commerical.features[i];
            poly = feature.geometry.coordinates[0];

            if (isPointInPoly(poly, pt)) {
                console.log("The given point is in the commercial Point : ", feature.properties.name);
                droneNotifySlack(10, data.orderName, data.date, data.scheduled_time, data.property_address.timezone, photographerName)
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
                    customer2PhotographerNotifyToSlack(data.orderName, data.date, data.scheduled_time, data.client_full_name, photographerName, data.property_address.timezone)
                }
            }
        }
    }
    res.send('Data processed!');
});


app.post('/dialpad-webhook', (req, res) => {
    let rawBody = '';
    req.on('data', chunk => {
        rawBody += chunk.toString();
    });
    req.on('end', () => {
        console.log('Raw Body:', rawBody);
        const data = JSON.parse(rawBody)
        const phoneNumber = data.contact.phone;
        const name = data.contact.name;
        console.log('------------', data.state, phoneNumber, name)
        if (data.state === 'missed') {
            console.log('------------------Missed evenet appeared.');
            const now = new Date(); // Current time
            const formattedDate = moment(now).tz("Australia/Brisbane").format('YYYY-MM-DD');
            const formattedTime = moment(now).tz("Australia/Brisbane").format('HH:mm');
            const itemNameValue = phoneNumber + " | " + name + " | " + formattedTime + formattedDate;

            const itemColumnValues = {
                "status_1__1": "ADMIN",
                "status": 'DIALPAD',
                "date_10__1": formattedDate,
                "hour4__1": {
                    "hour": parseInt(formattedTime.split(':')[0]),
                    "minute": parseInt(formattedTime.split(':')[1])
                }
            };

            const query = `
                    mutation {
                        create_item (
                            board_id: 7012463051,
                            group_id: "group_title",
                            item_name: "${itemNameValue}",
                            column_values: "${JSON.stringify(itemColumnValues).replace(/"/g, '\\"')}"
                        ) {
                        id
                        }
                    }
                    `;
            createMondayTickeet(query);

        }
    });

    res.status(200).send('Webhook received!');
})

module.exports = router;