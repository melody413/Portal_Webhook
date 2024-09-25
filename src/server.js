const { app } = require('./config');
const router = require('./routes');
const port = process.env.PORT || 3000;
const axios = require('axios');

app.use("/", router);

setInterval(monday_Ticketing, 10000)
async function monday_Ticketing() {
    console.log("This function is called every X milliseconds");
    //Get the items from Edit group
    const query = `
        query {
            boards (ids: 1642511224) {
                groups (ids: "new_group50030") {
                    items_page {
                        items {
                            id,
                            name,
                            column_values(ids: ["name", "text", "department"]){
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
            let formattedTime = today.getHours() + ":" + today.getMinutes();

            items?.forEach(async element => {
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
                            item_name: "[${element.name}][${element.column_values[0].text}][${element.column_values[1].text}]",
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
                        let query = `mutation { delete_item (item_id: ${element.id}) { id }}`;

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
                                console.log('Delete item on the Edit group:', element.id)
                            })
                            .catch(err => {

                            })
                    })
                    .catch(err => {

                    })

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
                console.log('Each item in New Request group :', element);
                const totalTime = element.column_values[2].text;
                console.log('Total Time:', totalTime);
                const [hours, minutes, seconds] = totalTime.split(':');

                // Convert the time to minutes
                const totalTimeInMinutes = parseInt(hours) * 60 + parseInt(minutes) + parseInt(seconds) / 60;

                // Check if the totalTimeInMinutes is equal to or greater than 5
                if (totalTimeInMinutes >= 5) {
                    console.log("Total time is equal to or greater than 5 minutes.");
                    let today = new Date();
                    let formattedDate = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, '0') + '-' + today.getDate().toString().padStart(2, '0');
                    let formattedTime = today.getHours() + ":" + today.getMinutes();
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
                            item_name: "[${element.name}][${element.column_values[0].text}][${element.column_values[1].text}]",
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
                            let query = `mutation { delete_item (item_id: ${element.id}) { id }}`;

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
                                    console.log('Delete item on the Edit group:', element.id)
                                })
                                .catch(err => {

                                })
                        })
                        .catch(err => {

                        })


                } else {
                    console.log("Total time is less than 5 minutes.");
                }


            });
        })
        .catch(err => {
            console.log('err', err);
        });
}


app.listen(port, () => console.log(`Server listening at http://localhost:${port}`));