const { app } = require('./config');
const router = require('./routes');
const port = process.env.PORT || 3000;
const axios = require('axios');

app.use("/", router);

// const query = `
//   query {
//     boards (ids: 7012463051) {
//         groups {
//             id
//             title
//         }
//     }
//   }
// `;

// axios({
//     url: 'https://api.monday.com/v2',
//     method: 'post',
//     headers: {
//         'Authorization': process.env.MONDAY_API_KEY,
//         'Content-Type': 'application/json'
//     },
//     data: JSON.stringify({ query })
// })
//     .then(result => {
//         console.log('------', result.data.data.boards[0]);
//     })
//     .catch(err => {
//         console.log('err', err);
//     });

// const itemColumnValues = {
//     "status_1__1": "ADMIN",
//     "status": "DRONE BOOKING",
//     "date_10__1": "2024-07-12",
//     "hour4__1": { "hour": 16, "minute": 42 }
// };

// const query1 = `
//   mutation {
//     create_item (
//         board_id: 7012463051,
//         group_id: "new_group__1",
//         item_name: "Test",
//         column_values: "${JSON.stringify(itemColumnValues).replace(/"/g, '\\"')}"
//     ) {
//       id
//     }
//   }
// `;

// // ...


// fetch("https://api.monday.com/v2", {
//     method: 'post',
//     headers: {
//         'Content-Type': 'application/json',
//         'Authorization': process.env.MONDAY_API_KEY
//     },
//     body: JSON.stringify({
//         query: query1
//     })
// })
//     .then(res => res.json())
//     .then(res => console.log(JSON.stringify(res, null, 2)));

app.listen(port, () => console.log(`Server listening at http://localhost:${port}`));