const express = require('express'),
	app = express(),
	port = process.env.PORT || 3000,
	token = require('token'),
	server = app.listen(port, function () {
		console.log('App running on port ' + port)
	})

app.get('/webhook', function (req, res) {
	if (req.query['hub.mode'] === 'subscribe' &&
		req.query['hub.verify_token'] === token) {
		console.log("Validating webhook");
		res.status(200).send(req.query['hub.challenge']);
	} else {
		console.error("Failed validation. Make sure the validation tokens match.");
		res.sendStatus(403);
	}
})