const express = require('express');
const path = require('path');
const fs = require('fs');
const parseKML = require('parse-kml');
const router = express.Router();

const { moment, app } = require('../config');
const { cancelNotifyToSlack, customer2PhotographerNotifyToSlack } = require('../utils');
const { doNotSendPhotographers, allowedPhotographers, droneServices } = require('../constant');
const parseKml = require('parse-kml');

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
    console.log("****", data);

    const services = data.services;
    const services_a_la_cart = data.services_a_la_cart;
    const property_address = data.property_address;

    console.log("****Services:", services);
    console.log("****Services a la cart:", services_a_la_cart);
    console.log("****property_address:", property_address);

    const isDroneServiceIncluded = services.some(service => droneServices.includes(service));
    const isDroneServiceIncludedInAlaCart = services_a_la_cart.some(service => droneServices.includes(service));

    if (isDroneServiceIncluded || isDroneServiceIncludedInAlaCart) {
        console.log("One of the Drone Services is involved either in services or services_a_la_cart");
        parseKml.readKml(__dirname + '../../../Airports.kml')
            .then((data) => {
                console.log('***', data);
                // Function to check if a point is within a polygon
                function isPointInPolygon(point, polygon) {
                    let inside = false;
                    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                        const xi = polygon[i][0], yi = polygon[i][1];
                        const xj = polygon[j][0], yj = polygon[j][1];

                        const intersect = ((yi > point[1]) !== (yj > point[1])) &&
                            (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
                        if (intersect) inside = !inside;
                    }
                    return inside;
                }

                // Traverse the KML data and find the geo_shapes and sub-geo_shapes
                function findGeoShapes(folder) {
                    for (const item of folder.Folder || folder.Placemark || []) {
                        if (item.Folder) {
                            findGeoShapes(item);
                        } else if (item.Polygon) {
                            const coordinates = item.Polygon.outerBoundaryIs.LinearRing.coordinates.map(coord => coord.split(',').map(parseFloat));
                            if (isPointInPolygon([propertyAddress.lng, propertyAddress.lat], coordinates)) {
                                console.log(`Property is within the geo_shape: ${item.name}`);

                                // Check for sub-geo_shapes
                                if (folder.Folder) {
                                    console.log('Sub-geo_shapes:');
                                    findGeoShapes(folder);
                                }
                            }
                        }
                    }
                }
                findGeoShapes(data)
            })
            .catch(console.log)

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