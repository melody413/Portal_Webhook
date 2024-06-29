require('dotenv').config();
const moment = require('moment-timezone');
const express = require('express');
const { WebClient } = require('@slack/web-api');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

const channelId = process.env.SLACK_CHANNEL_ID;
const web = new WebClient(process.env.SLACK_BOT_TOKEN);

module.exports = { app, web, moment, channelId };