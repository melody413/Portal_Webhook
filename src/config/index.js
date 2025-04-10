require('dotenv').config();
const moment = require('moment-timezone');
const express = require('express');
const { WebClient } = require('@slack/web-api');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

// Global error handler middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

const channelId = process.env.SLACK_CHANNEL_ID;
const web = new WebClient(process.env.SLACK_BOT_TOKEN);

module.exports = { app, web, moment, channelId };