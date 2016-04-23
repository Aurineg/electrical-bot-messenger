"use strict";

let request = require('request'),
    salesforce = require('./salesforce'),
    processor = require('./processor'),
    formatter = require('./formatter-messenger');

let sendMessage = (message, recipient) => {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: process.env.PAGE_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: recipient},
            message: message
        }
    }, (error, response) => {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
};

let handlers = {};

handlers.searchPropertyByPriceRange = (recipient, values) => {
    sendMessage({text: `OK, looking for houses between ${values[1]} and ${values[2]}...`}, sender);
    //salesforce.findProperties({min: values[1], max: values[2]}).then(properties => {
        //sendMessage(formatter.formatProperties(properties), sender);
    //});
};

handlers.searchProperty = (recipient) => {
    sendMessage({text: `OK, looking for houses for sale around you...`}, sender);
    //salesforce.findProperties({min: values[1], max: values[2]}).then(properties => {
    //sendMessage(formatter.formatProperties(properties), sender);
    //});
};

handlers.searchPropertyByBedrooms = (recipient, values) => {
    sendMessage({text: `OK, looking for houses with ${values[1]} bedrooms...`}, sender);
    //salesforce.findProperties({min: values[1], max: values[2]}).then(properties => {
    //sendMessage(formatter.formatProperties(properties), sender);
    //});
};

processor.init("dictionary.txt", handlers);


//let match = (text, patterns) => {
//
//    patterns.forEach(pattern => {
//        let m = text.match(pattern);
//        if (m) {
//            return m;
//        }
//    });
//
//    return false;
//
//};
//
//let processText = (text, sender)  => {
//
//
//    let match;
//    match = text.match(/help/i);
//    if (match) {
//        sendMessage({text:
//            `You can ask me things like:
//    Search account Acme
//    Search Acme in accounts
//    Search contact Smith
//    What are my top 3 opportunities?
//        `}, sender);
//        return;
//    }

    //match(text, [/find houses between (.*) and (.*)/i], (values) => {
    //    salesforce.findProperties({min: values[1], max: values[2]}).then(properties => {
    //        sendMessage({text: `Here are the properties for sale around you between ${values[1]} and ${values[2]}`}, sender);
    //        //sendMessage(formatter.formatProperties(properties), sender);
    //    });
    //    return;
    //});
    //
    //match(text, [/find houses/i, /find properties/i], () => {
    //    salesforce.findProperties().then(properties => {
    //        sendMessage({text: `Here are the properties for sale around you`}, sender);
    //        sendMessage(formatter.formatProperties(properties), sender);
    //    });
    //});



    //match = text.match(/find houses/i);
    //if (match) {
    //    salesforce.findProperties().then(properties => {
    //        sendMessage({text: `Here are the properties for sale around you`}, sender);
    //        sendMessage(formatter.formatProperties(properties), sender);
    //    });
    //    return;
    //}
    //
    //match = text.match(/search contact (.*)/i);
    //if (match) {
    //    salesforce.findContact(match[1]).then(contacts => {
    //        sendMessage({text: `Here are the contacts I found matching "${match[1]}":`}, sender);
    //        sendMessage(formatter.formatContacts(contacts), sender)
    //    });
    //    return;
    //}
    //
    //match = text.match(/top (.*) opportunities/i);
    //if (match) {
    //    salesforce.getTopOpportunities(match[1]).then(opportunities => {
    //        sendMessage({text: `Here are your top ${match[1]} opportunities:`}, sender);
    //        sendMessage(formatter.formatOpportunities(opportunities), sender)
    //    });
    //    return;
    //}
//};

let handleGet = (req, res) => {
    if (req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);
    } else {
        res.send('Error, wrong validation token');
    }
};

let handlePost = (req, res) => {
    console.log('handlepost');
    let events = req.body.entry[0].messaging;
    for (let i = 0; i < events.length; i++) {
        let event = events[i];
        let sender = event.sender.id;
        if (process.env.MAINTENANCE_MODE && ((event.message && event.message.text) || event.postback)) {
            sendMessage({text: `Sorry I'm taking a break right now.`}, sender);
        } else if (event.message && event.message.text) {
            //processText(event.message.text, sender);
            console.log('processing....');
            let result = processor.match(event.message.text);
            console.log(result);
            if (result) {
                let handler = handlers[result.handlerName];
                if (handler && typeof handler === "function") {
                    handler(result.matchValues);
                } else {
                    console.log("Handler " + result.handlerName + " is not defined");
                }
            }
        } else if (event.postback) {
            let payload = event.postback.payload.split(",");
            if (payload[0] === "view_contacts") {
                sendMessage({text: "OK, looking for your contacts at " + payload[2] + "..."}, sender);
                salesforce.findContactsByAccount(payload[1]).then(contacts => sendMessage(formatter.formatContacts(contacts), sender));
            } else if (payload[0] === "close_won") {
                sendMessage({text: `OK, I closed the opportunity "${payload[2]}" as "Close Won". Way to go Christophe!`}, sender);
            } else if (payload[0] === "close_lost") {
                sendMessage({text: `I'm sorry to hear that. I closed the opportunity "${payload[2]}" as "Close Lost".`}, sender);
            }
        }
    }
    res.sendStatus(200);
};

exports.handleGet = handleGet;
exports.handlePost = handlePost;