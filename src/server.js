const { app } = require('./config');
const router = require('./routes');
const port = process.env.PORT || 3000;

app.use("/", router);


app.listen(port, () => console.log(`Server listening at http://localhost:${port}`));