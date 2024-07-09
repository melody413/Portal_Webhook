
const { web, moment, channelId } = require('../config');
const turf = require('@turf/turf');

/**
 * This function is responsible for sending a cancellation alert to a Slack channel.
 * It takes the photographer's name, the time of booking, 
 * and the time of cancellation as parameters, formats these details, 
 * and sends a pre-formatted message to the Slack channel.
 *
 * @param {string} photographer - The name of the photographer.
 * @param {string} orderName - The name of the oder.
 * @param {Date} bookingTime - The date and time when the booking was initially made.
 * @param {Date} cancellationTime - The date and time when the booking was cancelled.
 */
function cancelNotifyToSlack(photographer = "", orderName, bookingTime, cancellationTime) {
    const simpleBookingTime = moment(bookingTime).tz("Australia/Brisbane").format('MMMM Do, YYYY h:mm A');
    const simpleCancellationTime = moment(cancellationTime).tz("Australia/Brisbane").format('MMMM Do, YYYY h:mm A');

    const text = `*FT PHOTOGRAPHER CANCELLATION*\nOrder Name: ${orderName} \nPhotographer: ${photographer} \nBooking Time: ${simpleBookingTime}/Brisbane \nCancelled Time: ${simpleCancellationTime}/Brisbane`;

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
function customer2PhotographerNotifyToSlack(orderName, orderDate, schedule_time, customer, photographer,) {
    const text = `*DO NOT SEND PHOTOGRAPHER*\nOrder name: ${orderName} \nBooking Time: ${orderDate}, ${schedule_time}/Brisbane \nCustomer: ${customer} \nPhotographer: ${photographer}`;

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

function isPointInPoly(poly, pt) {
    const geoPoint = turf.point([pt.x, pt.y]);
    let newCoordinates = poly.map(coordinate => [coordinate[0], coordinate[1]]);
    const geoPolygon = turf.polygon([newCoordinates]);
    const isPointInPolygon = turf.booleanPointInPolygon(geoPoint, geoPolygon);
    return isPointInPolygon;
}

/**
 * This function is used to send different notification messages to a Slack channel 
 * depending on the 'type' of drone booking.
 *
 * @param {number} type - The type of the drone booking which determines the message to be sent. It can be from 1 to 8.
 * @param {string} address - The address of the drone booking.
 * @param {string} date - The date of the drone booking.
 */
function droneNotifySlack(type, address, date) {
    let text = '';

    if (type == 1) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${date}/Brisbane* cannot be done. Please inform customer and remove item from booking`;
    } else if (type == 2) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${date}/Brisbane* must be done after 5pm (with any drone)`;
    } else if (type == 3) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${date}/Brisbane* has been made at Gold Coast airport. Drone must be done before 6:00am otherwise inform customer it cannot be
done and remove from booking. Unlocking licence required`;
    } else if (type == 4) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${date}/Brisbane* must be done with mini drone (anytime of day)`;
    } else if (type == 5) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${date}/Brisbane*. This can be done with mini drone with unlocking licence (anytime of day)`;
    } else if (type == 6) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${date}/Brisbane* cannot be done. Please inform customer and remove item from booking`;
    } else if (type == 7) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${date}/Brisbane* must be done after 5pm with mini drone and unlocking licence`;
    } else if (type == 8) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${date}/Brisbane* has been made at Gold Coast airport. Drone must be done before 6:00am otherwise inform customer it cannot be
done and remove from booking. Unlocking licence required`;
    }

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

module.exports = { cancelNotifyToSlack, customer2PhotographerNotifyToSlack, isPointInPoly, droneNotifySlack };