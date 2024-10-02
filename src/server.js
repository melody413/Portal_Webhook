const { app } = require('./config');
const router = require('./routes');
const port = process.env.PORT || 3000;
const axios = require('axios');

app.use("/", router);

// setInterval(monday_Ticketing, 10000)

app.listen(port, () => console.log(`Server listening at http://localhost:${port}`));