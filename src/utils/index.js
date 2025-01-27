
const { web, moment, channelId } = require('../config');
const turf = require('@turf/turf');
const fs = require('fs');
const cron = require('node-cron');
const axios = require('axios');

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
    const parts = orderName.split(' - ');
    agentName = parts[0]
    addressName = parts[1]
    itemNameValue = photographer + " | " + addressName + " | " + agentName + " | " + formattedDate + "," + formattedTime;

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
                            item_name: "${itemNameValue}",
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
    const parts = orderName.split(' - ');
    agentName = parts[0]
    addressName = parts[1]
    itemNameValue = photographer + " | " + addressName + " | " + agentName + " | " + formattedDate + "," + formattedTime;

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
                "status__1": 'CAUTION',
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
            flag = true;
        }
    }
    if (flag === false) {
        const itemColumnValues = {
            "status_1__1": "ADMIN",
            "status": 'DONT SEND PHOTOGRAPHER',
            "date_10__1": formattedDate,
            "status__1": 'ADVISORY',
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
                                item_name:"${itemNameValue}",
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
function droneNotifySlack(type, address, day, time, timezone, photographerName) {
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
    } else if (type == 11) {
        text = `*DRONE BOOKING IN CITY*\n*${address}* has been made on *${day}, ${time}/Brisbane*. Immediately put a note on photographers calendar to not do drone and inform agent.`;
    } else if (type == 12) {
        text = `*DRONE BOOKING*\n*Drone booking ${address}* on *${day}, ${time}/Brisbane* requires unlocking license`;

    }

    console.log('--------------------', text);

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
    const parts = address.split(' - ');
    agentName = parts[0]
    addressName = parts[1]
    itemNameValue = photographerName + " | " + addressName + " | " + agentName + " | " + formattedDate + "," + formattedTime;
    itemNameVlaue2 = parts[2] + " | " + parts[0] + " | " + parts[1];
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
            if (type === 10) {

                const itemColumnValues = {
                    "status_1__1": "ADMIN",
                    "status": type_Title,
                    "date_10__1": formattedDate,
                    "status__1": 'CAUTION',
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
                flag = true;
            } else {
                const itemColumnValues = {
                    "status_1__1": "ADMIN",
                    "status": type_Title,
                    "date_10__1": formattedDate,
                    "status__1": 'CAUTION',
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
                                item_name: "${itemNameVlaue2}",
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
    }
    if (flag === false) {
        console.log('-------------------------------------------Same Day: False');
        if (type === 10) {

            const itemColumnValues = {
                "status_1__1": "ADMIN",
                "status": type_Title,
                "date_10__1": formattedDate,
                "status__1": 'ADVISORY',
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
                                    item_name: "${itemNameValue}"
                                    column_values: "${JSON.stringify(itemColumnValues).replace(/"/g, '\\"')}"
                                ) {
                                id
                                }
                            }
                            `;
            createMondayTickeet(query);
        } else {
            const itemColumnValues = {
                "status_1__1": "ADMIN",
                "status": type_Title,
                "date_10__1": formattedDate,
                "status__1": 'ADVISORY',
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
                                item_name: "${itemNameVlaue2}"
                                column_values: "${JSON.stringify(itemColumnValues).replace(/"/g, '\\"')}"
                            ) {
                            id
                            }
                        }
                        `;
            createMondayTickeet(query);
        }
    } else {
        flag = false;
    }
}

async function createMondayTickeet(query) {
    console.log('-----------------------', process.env.MONDAY_API_KEY);

    try {
        const response = await fetch("https://api.monday.com/v2", {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': process.env.MONDAY_API_KEY
            },
            body: JSON.stringify({
                'query': query
            })
        });

        const responseData = await response.json();
        console.log('-----------------------------Monday Success:', responseData);
    } catch (error) {
        console.log('--------------------------Monday Error', error);
    }
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

async function monday_Ticketing() {
    console.log("This function is called every X milliseconds");
    try {
        let allTicketingItems = []
        //Get the items from Edit group
        const query = `
            query {
                boards (ids: 1642511224) {
                    groups (ids: "new_group50030") {
                        items_page {
                            items {
                                id,
                                name,
                                column_values(ids: ["name", "text", "department", "time_tracking3__1"]){
                                    id
                                    text
                                    value
                                    type
                                }
                            }
                        }
                    }
                }
            }
            `;

        await axios({
            url: 'https://api.monday.com/v2',
            method: 'post',
            headers: {
                Authorization: process.env.MONDAY_API_KEY,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({ query })
        })
            .then(result => {
                if (result.errors) {
                    console.error("API responded with errors", result.errors);
                    return;
                }
                const items = result.data.data.boards[0].groups[0].items_page.items;

                let today = new Date();
                let formattedDate = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, '0') + '-' + today.getDate().toString().padStart(2, '0');

                // Get the current time in UTC
                let utcHours = today.getUTCHours();
                let utcMinutes = today.getUTCMinutes();

                // Adjust for Brisbane time (UTC +10)
                let brisbaneHours = (utcHours + 10) % 24; // Wrap around if over 24 hours
                let brisbaneMinutes = utcMinutes;
                let formattedTime = brisbaneHours + ":" + brisbaneMinutes.toString().padStart(2, '0');

                items?.forEach(async element => {
                    allTicketingItems.push(`EDITED ${element.name} | ${element.column_values[0].text} | ${element.column_values[1].text}`)
                    const delivery_time = element.column_values[2].text

                    const timeParts = delivery_time.split(':');
                    const minsutes = parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);
                    console.log('---Delivery time:', delivery_time, minsutes);


                    if (minsutes >= 10) {
                        console.log("Deliver time is bigger thatn 10 mins");

                        const advisoryQuery = `
                            query {
                                boards (ids: 7012463051) {
                                    groups (ids: "new_group__1") {
                                        items_page (limit: 500) {
                                            items {
                                                id,
                                                name
                                            }
                                        }
                                    }
                                }
                                complexity {
                                    query
                                }
                            }
                        `;

                        // Check if the item already exists in the Advisory group
                        const advisoryResult = await axios({
                            url: 'https://api.monday.com/v2',
                            method: 'post',
                            headers: {
                                Authorization: process.env.MONDAY_API_KEY,
                                'Content-Type': 'application/json'
                            },
                            data: JSON.stringify({ query: advisoryQuery })
                        });

                        if (advisoryResult.errors) {
                            console.error("API responded with errors while fetching Advisory group items", advisoryResult.errors);
                            return;
                        }

                        const advisoryItems = advisoryResult.data.data.boards[0].groups[0].items_page.items;
                        console.log('----AdvisoruItems eidts', advisoryItems.length);

                        const advisoryItemExists = advisoryItems.some(advisoryItem => advisoryItem.name === `EDITED ${element.name} | ${element.column_values[0].text} | ${element.column_values[1].text}`);

                        if (!advisoryItemExists) {
                            console.log('---not exist');

                            const itemColumnValues = {
                                "status_1__1": "EDITS",
                                "status": 'TICKET',
                                "status__1": 'ADVISORY',
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
                                        item_name: "EDITED ${element.name} | ${element.column_values[0].text} | ${element.column_values[1].text}",
                                        column_values: "${JSON.stringify(itemColumnValues).replace(/"/g, '\\"')}"
                                    ) {
                                    id
                                    }
                                }
                                `;

                            await axios({
                                url: 'https://api.monday.com/v2',
                                method: 'post',
                                headers: {
                                    Authorization: process.env.MONDAY_API_KEY,
                                    'Content-Type': 'application/json'
                                },
                                data: JSON.stringify({ query })
                            })
                                .then(async result => {
                                    if (result.errors) {
                                        console.error("API responded with errors", result.errors);
                                        return;
                                    }

                                })
                                .catch(err => {

                                })
                        }
                    }

                });
            })
            .catch(err => {
                console.log('err', err);
            });


        //Get the items from New Requests group
        const query1 = `
            query {
                boards (ids: 1642511224) {
                    groups (ids: "topics") {
                        items_page {
                            items {
                                id,
                                name,
                                column_values(ids: ["name", "text", "department", "time_tracking9"]){
                                    id
                                    text
                                    value
                                    type
                                }
                            }
                        }
                    }
                }
            }
            `;

        await axios({
            url: 'https://api.monday.com/v2',
            method: 'post',
            headers: {
                Authorization: process.env.MONDAY_API_KEY,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({ query: query1 })
        })
            .then(result => {
                const items = result.data.data.boards[0].groups[0].items_page.items;

                items?.forEach(async element => {
                    allTicketingItems.push(`UPLOAD ${element.name} | ${element.column_values[0].text} | ${element.column_values[1].text}`)
                    const totalTime = element.column_values[2].text;
                    const [hours, minutes, seconds] = totalTime.split(':');

                    // Convert the time to minutes
                    const totalTimeInMinutes = parseInt(hours) * 60 + parseInt(minutes) + parseInt(seconds) / 60;

                    // Check if the totalTimeInMinutes is equal to or greater than 5
                    if (totalTimeInMinutes >= 5) {
                        console.log("Total time is equal to or greater than 5 minutes.");
                        const advisoryQuery = `
                            query {
                                boards (ids: 7012463051) {
                                    groups (ids: "new_group__1") {
                                        items_page (limit: 500) {
                                            items {
                                                id,
                                                name
                                            }
                                        }
                                    }
                                }
                                complexity {
                                    query
                                }
                            }
                        `;

                        // Check if the item already exists in the Advisory group
                        const advisoryResult = await axios({
                            url: 'https://api.monday.com/v2',
                            method: 'post',
                            headers: {
                                Authorization: process.env.MONDAY_API_KEY,
                                'Content-Type': 'application/json'
                            },
                            data: JSON.stringify({ query: advisoryQuery })
                        });

                        if (advisoryResult.errors) {
                            console.error("API responded with errors while fetching Advisory group items", advisoryResult.errors);
                            return;
                        }

                        const advisoryItems = advisoryResult.data.data.boards[0].groups[0].items_page.items;
                        console.log('----AdvisoruItems', advisoryItems.length);

                        const advisoryItemExists = advisoryItems.some(advisoryItem => advisoryItem.name === `UPLOAD ${element.name} | ${element.column_values[0].text} | ${element.column_values[1].text}`);
                        if (!advisoryItemExists) {
                            console.log('------------ not exist');
                            let today = new Date();
                            let formattedDate = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, '0') + '-' + today.getDate().toString().padStart(2, '0');

                            // Get the current time in UTC
                            let utcHours = today.getUTCHours();
                            let utcMinutes = today.getUTCMinutes();

                            // Adjust for Brisbane time (UTC +10)
                            let brisbaneHours = (utcHours + 10) % 24; // Wrap around if over 24 hours
                            let brisbaneMinutes = utcMinutes;
                            let formattedTime = brisbaneHours + ":" + brisbaneMinutes.toString().padStart(2, '0');

                            const itemColumnValues = {
                                "status_1__1": "EDITS",
                                "status": 'TICKET',
                                "status__1": 'ADVISORY',
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
                                        item_name: "UPLOAD ${element.name} | ${element.column_values[0].text} | ${element.column_values[1].text}",
                                        column_values: "${JSON.stringify(itemColumnValues).replace(/"/g, '\\"')}"
                                    ) {
                                    id
                                    }
                                }
                            `;
                            await axios({
                                url: 'https://api.monday.com/v2',
                                method: 'post',
                                headers: {
                                    Authorization: process.env.MONDAY_API_KEY,
                                    'Content-Type': 'application/json'
                                },
                                data: JSON.stringify({ query })
                            })
                                .then(async result => {
                                    if (result.errors) {
                                        console.error("API responded with errors", result.errors);
                                        return;
                                    }
                                })
                                .catch(err => {

                                })
                        }

                    }

                });

            })
            .catch(err => {
                console.log('err', err);
            });

        console.log('-------------Total ticketing items:', allTicketingItems);

        const targetGroupId = "new_group32010__1";

        const advisoryQuery = `
                            query {
                                boards (ids: 7012463051) {
                                    groups (ids: "new_group__1") {
                                        items_page (limit: 500) {
                                            items {
                                                id,
                                                name
                                                column_values(ids: ["status"]){
                                                    id
                                                    text
                                                    value
                                                    type
                                                }
                                            }
                                        }
                                    }
                                }
                                complexity {
                                    query
                                }
                            }
                        `;

        const advisoryResult = await axios({
            url: 'https://api.monday.com/v2',
            method: 'post',
            headers: {
                Authorization: process.env.MONDAY_API_KEY,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({ query: advisoryQuery })
        });

        if (advisoryResult.errors) {
            console.error("API responded with errors while fetching Advisory group items", advisoryResult.errors);
            return;
        }

        const advisoryItems = advisoryResult.data.data.boards[0].groups[0].items_page.items;
        const filteredAdvisoryItems = advisoryItems?.filter(item => item.column_values[0].text === 'TICKET');


        console.log('-----Number 1:', advisoryItems.length);
        console.log('-----Number 2:', filteredAdvisoryItems.length);
        for (const item of filteredAdvisoryItems) {
            const itemName = item.name;
            if (!allTicketingItems.includes(itemName)) {
                console.log(`Item ${itemName} is not in the array, moving to new group...`);
                const mutation = `
                        mutation {
                            move_item_to_group (item_id: ${item.id}, group_id: "${targetGroupId}") {
                                id
                            }
                        }
                    `;
                await axios({
                    url: 'https://api.monday.com/v2',
                    method: 'post',
                    headers: {
                        Authorization: process.env.MONDAY_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({ query: mutation })
                })
                    .then(response => {
                        if (response.errors) {
                            console.error("Error moving item:", response.errors);
                        } else {
                            console.log(`Item ${itemName} moved successfully.`);
                        }
                    })
                    .catch(error => {
                        console.error("Error during the mutation request:", error);
                    });
            }
        }
    }
    catch (error) {
        console.error("Monday_Ticketing An error occurred:");
    } finally {
        console.log("Execution completed.");
    }
}

module.exports = { cancelNotifyToSlack, customer2PhotographerNotifyToSlack, isPointInPoly, droneNotifySlack, sendTextMessage, createMondayTickeet, monday_Ticketing };