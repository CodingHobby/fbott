const express = require('express'),
	app = express(),
	port = process.env.PORT || 3000,
	pwd = require('./tokens').pwd,
	token = require('./tokens').token,
	api = require('./tokens').api,
	bodyParser = require('body-parser'),
	request = require('request'),
	server = app.listen(port, function () {
		console.log('App running on port ' + port)
	})

var weather = require("Openweather-Node")

weather.setAPPID(api)
weather.setCulture("it");

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
	extended: true
}))

app.get('/webhook', function (req, res) {
	if (req.query['hub.mode'] === 'subscribe' &&
		req.query['hub.verify_token'] === pwd) {
		console.log("Validating webhook");
		res.status(200).send(req.query['hub.challenge']);
	} else {
		console.error("Failed validation. Make sure the validation tokens match.");
		res.sendStatus(403);
	}
})

app.post('/webhook', function (req, res) {
	var data = req.body;

	// Make sure this is a page subscription
	if (data.object === 'page') {

		// Iterate over each entry - there may be multiple if batched
		data.entry.forEach(function (entry) {
			var pageID = entry.id;
			var timeOfEvent = entry.time;

			// Iterate over each messaging event
			entry.messaging.forEach(function (event) {
				if (event.message) {
					receivedMessage(event);
				} else {
					console.log("Webhook received unknown event: ", event);
				}
			});
		});

		// Assume all went well.
		//
		// You must send back a 200, within 20 seconds, to let us know
		// you've successfully received the callback. Otherwise, the request
		// will time out and we will keep trying to resend.
		res.sendStatus(200);
	}
});

function receivedMessage(event) {
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	var timeOfMessage = event.timestamp;
	var message = event.message;

	console.log("Received message for user %d and page %d at %d with message:",
		senderID, recipientID, timeOfMessage);
	console.log(JSON.stringify(message));

	var messageId = message.mid;

	var messageText = message.text;
	var messageAttachments = message.attachments;

	if (messageText) {
		sendTextMessage(senderID, messageText)
	} else if (messageAttachments) {
		sendTextMessage(senderID, "Message with attachment received");
	}
}

function sendTextMessage(id, messageText) {
	let text

	if (messageText.charAt(0) == '!') {
		let city = messageText.split('')
		city.splice(0, 1)
		city = city.join('')

		weather.now(city, function (err, aData) {
			if (err) text = `Error: ${err}`

			if (!aData) text = 'No data'
			else {
				text = `Temperature in ${city} is ${aData.getDegreeTemp()}`
			}
		})
	} else {
		text = messageText
	}

	var messageData = {
		recipient: {
			id
		},
		message: {
			text: text || 'Something went wrong'
		}
	}

	callSendAPI(messageData);
}

function callSendAPI(messageData) {
	request({
		uri: 'https://graph.facebook.com/v2.6/me/messages',
		qs: { access_token: token },
		method: 'POST',
		json: messageData

	}, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var recipientId = body.recipient_id;
			var messageId = body.message_id;

			console.log("Successfully sent generic message with id %s to recipient %s",
				messageId, recipientId);
		} else {
			console.error("Unable to send message.\n", response, '\n', error);
		}
	})
}