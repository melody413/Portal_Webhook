const { app, web, channelId } = require('./config');
const router = require('./routes');
const port = process.env.PORT || 3000;
const axios = require('axios');
const { monday_Ticketing } = require('./utils');

app.use("/", router);

setInterval(monday_Ticketing, 50000)
app.listen(port, () => console.log(`Server listening at http://localhost:${port}`));


