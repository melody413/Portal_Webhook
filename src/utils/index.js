
const { web, moment, channelId } = require('../config');
const turf = require('@turf/turf');
const fs = require('fs');
const cron = require('node-cron');

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

    const formattedDate = simpleBookingTime.format('YYYY-MM-DD');
    const formattedTime = simpleBookingTime.format('HH:mm');
    console.log('---------------------------Cancel', formattedDate, formattedTime);

    const itemColumnValues = {
        "status_1__1": "ADMIN",
        "status": 'FT CANCELLATION',
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
                            item_name: ${orderName},
                            column_values: "${JSON.stringify(itemColumnValues).replace(/"/g, '\\"')}"
                        ) {
                        id
                        }
                    }
                    `;
    createMondayTickeet(query);
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
function customer2PhotographerNotifyToSlack(orderName, orderDate, schedule_time, customer, photographer, timezone) {
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

    //Monday Ticekt 
    const today = moment();
    const bookingDate = moment.tz(orderDate, "dddd, DD MMM, YYYY", timezone);
    const scheduledTimeStart = moment.tz(schedule_time.split(' - ')[0], ["h:mm A"], timezone);
    const formattedDate = bookingDate.format('YYYY-MM-DD');
    const formattedTime = scheduledTimeStart.format('HH:mm');
    let flag = false;

    if (bookingDate.isSame(today, 'day')) {
        console.log('-------------------------------------------FT Same Day: True');
        const hoursDifference = scheduledTimeStart.diff(today, 'hours');
        if (Math.abs(hoursDifference) <= 2) {
            console.log('-------------------------------------------FT Same Day: True');
            const itemColumnValues = {
                "status_1__1": "ADMIN",
                "status": 'DONT SEND PHOTOGRAPHER',
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
                            item_name: ${orderName},
                            column_values: "${JSON.stringify(itemColumnValues).replace(/"/g, '\\"')}"
                        ) {
                        id
                        }
                    }
                    `;
            createMondayTickeet(query);
            flag = true;
        }
    }
    if (flag === false) {
        const itemColumnValues = {
            "status_1__1": "ADMIN",
            "status": 'DONT SEND PHOTOGRAPHER',
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
                                group_id: "new_group__1",
                                item_name: ${orderName},
                                column_values: "${JSON.stringify(itemColumnValues).replace(/"/g, '\\"')}"
                            ) {
                            id
                            }
                        }
                        `;
        createMondayTickeet(query);
    } else {
        flag = false;
    }
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
function droneNotifySlack(type, address, day, time, timezone) {
    let text = '';

    if (type == 1) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${day}, ${time}/Brisbane* cannot be done. Please inform customer and remove item from booking`;
    } else if (type == 2) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${day}, ${time}/Brisbane* must be done after 5pm (with any drone)`;
    } else if (type == 3) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${day}, ${time}/Brisbane* has been made at Gold Coast airport. Drone must be done before 6:00am otherwise inform customer it cannot be
done and remove from booking. Unlocking licence required`;
    } else if (type == 4) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${day}, ${time}/Brisbane* must be done with mini drone (anytime of day)`;
    } else if (type == 5) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${day}, ${time}/Brisbane*. This can be done with mini drone with unlocking licence (anytime of day)`;
    } else if (type == 6) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${day}, ${time}/Brisbane* cannot be done. Please inform customer and remove item from booking`;
    } else if (type == 7) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${day}, ${time}/Brisbane* must be done after 5pm with mini drone and unlocking licence`;
    } else if (type == 8) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${day}, ${time}/Brisbane* has been made at Gold Coast airport. Drone must be done before 6:00am otherwise inform customer it cannot be
done and remove from booking. Unlocking licence required`;
    } else if (type == 9) {
        text = `*DRONE BOOKING*\nDrone booking *${address}* on *${day}, ${time}/Brisbane* is near Amberley. Please check details, an unlocking licence may be required`;
    } else if (type == 10) {
        text = `*COMMERCIAL BOOKING*\nCommercial Booking *${address}* on *${day}, ${time}/Brisbane*\nCheck, call agent about the job and move onto a FT photographer`;
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

    //Monday Ticket
    const today = moment();
    const bookingDate = moment.tz(day, "dddd, DD MMM, YYYY", timezone);
    const scheduledTimeStart = moment.tz(time.split(' - ')[0], ["h:mm A"], timezone);
    const formattedDate = bookingDate.format('YYYY-MM-DD');
    const formattedTime = scheduledTimeStart.format('HH:mm');
    let flag = false;
    let type_Title;
    if (type === 10) {
        type_Title = "COMMERCIAL BOOKING"
    } else {
        type_Title = 'DRONE BOOKING'
    }
    console.log('----------------------------------- Type_Title:', type_Title);

    if (bookingDate.isSame(today, 'day')) {
        console.log('-------------------------------------------Same Day: True');

        const hoursDifference = scheduledTimeStart.diff(today, 'hours');
        if (Math.abs(hoursDifference) <= 2) {
            console.log('-------------------------------------------Same Hour: True');
            const itemColumnValues = {
                "status_1__1": "ADMIN",
                "status": type_Title,
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
                            item_name: ${address},
                            column_values: "${JSON.stringify(itemColumnValues).replace(/"/g, '\\"')}"
                        ) {
                        id
                        }
                    }
                    `;
            createMondayTickeet(query);
            flag = true;
        }
    }
    if (flag === false) {
        console.log('-------------------------------------------Same Day: False');

        const itemColumnValues = {
            "status_1__1": "ADMIN",
            "status": type_Title,
            "date_10__1": formattedDate,
            "hour4__1": {
                "hour": parseInt(formattedTime.split(':')[0]),
                "minute": parseInt(formattedTime.split(':')[1])
            }
        };

        console.log('------------------------------------ItemColumValues:', itemColumnValues);

        const query = `
                        mutation {
                            create_item (
                                board_id: 7012463051,
                                group_id: "new_group__1",
                                item_name: ${address},
                                column_values: "${JSON.stringify(itemColumnValues).replace(/"/g, '\\"')}"
                            ) {
                            id
                            }
                        }
                        `;
        createMondayTickeet(query);
    } else {
        flag = false;
    }
}

function createMondayTickeet(query) {
    fetch("https://api.monday.com/v2", {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.MONDAY_API_KEY
        },
        body: JSON.stringify({
            query: query
        })
    })
        .then(res => console.log('-----------------------------Moanday Success:', res.json()))
        .then(res => console.log('-----------------------------Moanday Fail:', JSON.stringify(res, null, 2)));
}

function sendTextMessage(phoneNumber) {
    console.log('*** SendTextMessage Function');
    let currentTime = moment().tz("Australia/Brisbane");
    let start = currentTime.clone().hour(10).minute(0);
    let end = currentTime.clone().hour(18).minute(30);

    if (currentTime.isBetween(start, end)) {
        console.log('*** SendTextMessage Function1');
        sendMessage(phoneNumber);
    } else {
        let nextStart = start.add(1, 'day');
        let waitTime = nextStart.diff(currentTime, 'minutes');

        //Scheduling the task for the next day within the time range
        cron.schedule(`*/${waitTime} * * *`, () => {
            console.log('*** SendTextMessage Function2');
            sendMessage(phoneNumber);
        });
    }
}

function sendMessage(phoneNumber) {
    console.log('*** SendMessage function');
    // const options = {
    //     method: 'POST',
    //     headers: { accept: 'application/json', 'content-type': 'application/json' },
    //     body: JSON.stringify({
    //         channel_hashtag: 'string',
    //         from_number: 'string',
    //         infer_country_code: false,
    //         media: 'string',
    //         sender_group_id: 0,
    //         sender_group_type: 'callcenter',
    //         text: `Regarding your recent booking with The Picket Fence; on a scale of 0 to 10(where 0 is "extremely unlikely" and 10 is "extremely likely') based on this photoshoot, how likely are you to recommend The Picket Fence to co-workers and other agents?`,
    //         to_numbers: [phoneNumber],
    //         user_id: 0
    //     })
    // };

    // fetch('https://dialpad.com/api/v2/sms', options)
    //     .then(response => response.json())
    //     .then(response => console.log(response))
    //     .catch(err => console.error(err));
}

module.exports = { cancelNotifyToSlack, customer2PhotographerNotifyToSlack, isPointInPoly, droneNotifySlack, sendTextMessage };