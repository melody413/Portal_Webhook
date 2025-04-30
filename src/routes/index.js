const express = require('express');
const path = require('path');
const fs = require('fs');
const tj = require("@tmcw/togeojson");
const turf = require('@turf/turf');
const router = express.Router();
const cron = require('node-cron');
const axios = require("axios");
const { monday_Ticketing } = require('../utils');

const { moment, app } = require('../config');
const { cancelNotifyToSlack, customer2PhotographerNotifyToSlack, isPointInPoly, droneNotifySlack, sendTextMessage, createMondayTickeet } = require('../utils');
const { droneServices, geoShape, cityDroneServices } = require('../constant');
const DOMParser = require("xmldom").DOMParser;

// Use process.cwd() to get the root directory
const rootDir = process.cwd();

const kmlFilePath = path.join(rootDir, 'Airports1.kml');
const kml = new DOMParser().parseFromString(fs.readFileSync(kmlFilePath, "utf8"));
const converted = tj.kml(kml);

const commericalKmlFilePath = path.join(rootDir, 'Commercial.kml');
const commerical_kml = new DOMParser().parseFromString(fs.readFileSync(commericalKmlFilePath, "utf8"));
const converted_commerical = tj.kml(commerical_kml);

const airportDroneKmlFilePath = path.join(rootDir, 'Untitled.kml');
const airport_drone_kml = new DOMParser().parseFromString(fs.readFileSync(airportDroneKmlFilePath, "utf8"));
const converted_airport = tj.kml(airport_drone_kml);


const SHEET_ID = "1nsg7GiRInIWkacmPdmxDOBxQ_7VeHu1efRgTAtwJeLM";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
const SHEET_URL1 = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=1428483837`;

async function fetchCancellPhotographers() {
    try {
        const response = await axios.get(SHEET_URL1);
        const rows = response.data.split("\n"); // Don't slice rows, include all

        let allowedPhotographers = [];

        // Start from the first row and handle it properly
        rows.forEach(row => {
            if (row.trim() === "") return; // Skip empty rows

            const columns = row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g); // Properly split while keeping quoted values intact
            const photographerEmail = columns[0].replace(/"/g, "").trim(); // Remove any quotes

            // Check if the email is in the allowed list
            if (!allowedPhotographers.includes(photographerEmail)) {
                allowedPhotographers.push(photographerEmail);
            }
        });

        return allowedPhotographers;
    } catch (error) {
        console.error("Error fetching Google Sheet:", error);
        return [];
    }
}

async function fetchDoNotSendPhotographers() {
    try {
        const response = await axios.get(SHEET_URL);
        const rows = response.data.split("\n"); // Don't slice rows, include all

        let doNotSendPhotographers = {};

        // Start from the first row and handle it properly
        rows.forEach(row => {
            if (row.trim() === "") return; // Skip empty rows

            const columns = row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g); // Properly split while keeping quoted values intact
            const photographer = columns[0].replace(/"/g, "").trim(); // Remove any quotes
            let clients = columns[1] ? columns[1].replace(/"/g, "").trim() : "";

            // Convert to an array, handling empty values properly
            doNotSendPhotographers[photographer] = clients
                ? clients.split(/\s*,\s*/).map(client => client.trim()) // Split by commas and remove spaces
                : [];
        });

        return doNotSendPhotographers;
    } catch (error) {
        console.error("Error fetching Google Sheet:", error);
        return {};
    }
}


app.get('/test', async (req, res) => {
    console.log('-------------------')
    await monday_Ticketing();
    res.send('Data success!')

})

app.post('/booking-change', async (req, res) => {
    try {
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

            let allowedPhotographers1 = fetchCancellPhotographers()

            console.log('----------------------------------allowedPhotographers1:', allowedPhotographers1)
            // Check whether the booking photographer is in the allowed photographers list
            const isAllowNotify = photographers.some(photographer =>
                allowedPhotographers1.includes(photographer.email)
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

        // Call monday_Ticketing before sending response
        await monday_Ticketing();
        res.send('Data processed!');
    } catch (error) {
        console.log("*********************** booking Change API Route")
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/webhook', async (req, res) => {
    try {
        const data = JSON.parse(req.body);

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
                doNotSendPhotographers1 = await fetchDoNotSendPhotographers();

                if (doNotSendPhotographers1.hasOwnProperty(photographerName)) {
                    if (doNotSendPhotographers1[photographerName].includes(data.client_full_name)) {
                        customer2PhotographerNotifyToSlack(data.orderName, data.date, data.scheduled_time, data.client_full_name, photographerName, data.property_address.timezone)
                    }
                }
            }
        }

        // Call monday_Ticketing before sending response
        await monday_Ticketing();
        res.send('Data processed!');
    } catch (error) {
        console.log("*** webhook API Route")
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/dialpad-webhook', (req, res) => {
    try {
        let rawBody = '';
        req.on('data', chunk => {
            rawBody += chunk.toString();
        });
        req.on('end', () => {
            console.log('--------------------------------Raw Body:', rawBody);
            const data = JSON.parse(rawBody)
            const phoneNumber = data.contact.phone;
            const name = data.contact.name;
            console.log('------------', data.state, phoneNumber, name)
            if (data.state === 'missed') {
                console.log('------------------Missed evenet appeared.');
                const now = new Date(); // Current time
                const formattedDate = moment(now).tz("Australia/Brisbane").format('YYYY-MM-DD');
                const formattedTime = moment(now).tz("Australia/Brisbane").format('HH:mm');
                const itemNameValue = phoneNumber + " | " + name;

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
    } catch (error) {
        console.log("*** dialpad-webhook API Route")
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

app.post('/dialpad-webhook1', (req, res) => {
    try {
        let rawBody = '';
        req.on('data', chunk => {
            rawBody += chunk.toString();
        });
        req.on('end', () => {
            console.log('--------------------------------Raw Body from dialpage message:', rawBody);
            const data = JSON.parse(rawBody)
            const phoneNumber = data.contact.phone;
            const name = data.contact.name;
        });
        res.status(200).send('Webhook received!');
    } catch (error) {
        console.log("*** dialpad-webhook API Route")
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

module.exports = router;