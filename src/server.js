const { app } = require('./config');
const router = require('./routes');
const port = process.env.PORT || 3000;
const axios = require('axios');
const { monday_Ticketing } = require('./utils');

// Use JSON and URL-encoded parsers
app.use("/", router);

app.listen(port, () => console.log(`Server listening at http://localhost:${port}`));




