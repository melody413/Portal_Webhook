
const { web, moment, channelId } = require('../config');

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

module.exports = { cancelNotifyToSlack, customer2PhotographerNotifyToSlack };