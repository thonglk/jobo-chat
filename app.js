/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */
'use strict';

const
    bodyParser = require('body-parser'),
    config = require('config'),
    crypto = require('crypto'),
    express = require('express'),
    https = require('https'),
    request = require('request'),
    axios = require('axios'),
    firebase = require('firebase-admin');
var app = express();


app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({verify: verifyRequestSignature}));
app.use(express.static('public'));

/*
 * Be sure to setup your config values before running this code. You can 
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ?
    process.env.MESSENGER_APP_SECRET :
    config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
    (process.env.MESSENGER_VALIDATION_TOKEN) :
    config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
    (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
    config.get('pageAccessToken');

// URL where the app is running (include protocol). Used to point to scripts and 
// assets located at this address. 
const SERVER_URL = (process.env.SERVER_URL) ?
    (process.env.SERVER_URL) :
    config.get('serverURL');

const FIRE_BASE_ADMIN = {
    jobochat: {
        databaseURL: "https://jobo-chat.firebaseio.com",
        cert: {
            "type": "service_account",
            "project_id": "jobo-chat",
            "private_key_id": "dadaa2894385e39becf4224109fd59ba866414f4",
            "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZDEwnCY6YboXU\nd0fSmOAL8QuPVNj6P+fJc+sa7/HUqpcZrnubJAfPYjDCiUOf9p6mo2g5nQEZiiim\nQYiB+KMt8sHPvRtNF5tWeXN3s7quKAJcwCZC8RySeiR9EfKTniI6QrFwQt0pU1Ay\ncPg/whb1LwXoyA6C7PErOEJ+xsDQmCxEOLmGrbmDe81tBJZIBU8WupV7j9416qOs\n3iPnYIJxr6gqJWKNp6ALUM/48c1pAompn6aB7zOweyvvfC6ZKuMUfsEii5FDYR+A\n9eeeghZFXv9VLp4zpsWUZqytGEEW9xgWdC5aCbMN6PoAvhbrr+CEz2hqimMFEqyn\nfRnrDTx3AgMBAAECggEAEGqys90wMO1jJ//hqdcwUxbnVe8H/l2pDX68EKyHcRt6\nFFIzPTfLc28s2voA6G+B7n67mmf6tlDR5Elept4Ekawj5q+aCgm4ESFcj3hDrXqP\nOy65diTAkX+1lNQvseSrGBcFTsVv7vlDPp122XO3wtHMs5+2IUcEss0tkmM8IErO\nmuG1TweQccK6CU+GdvtZ0bsMv16S0fBz9hNfWQ0JRtiBSMeYJahf1wMKoLPHzdfU\nMyK39U3JPHOjaQaYkj80MAdXVOT4fjy7j//p7cLT57Exj4y8jHFpwI9XRawCyKrw\nl6yLzHpGQ4To5ERur8JUtMHF9gYctDr3XI5zZ1fZ0QKBgQDxoZQtlxWpfHBPXwB3\nwclUqfsTZHvmCBeGROX73+Hy2S84W0lrvmr3mrLMnl6syx8OS4tZdA3s8pbvj0HH\nFD8IXV2acc3Mf+OfQiawRowobSSeSPUr//vsPYfobsMtLzOjiO0n20p/nVV3gGCG\nZQyUDuHZVDvSBGz3bUXDeHiZLwKBgQDl9HuIBkW3pcpGvfBMqwOyRhLJFEXL14Nh\npwJ2nBs7eTd09S95+P14s2Y0U2AGc96FmElVrXk8teSn982pocAW3mdD6KgBpC6m\nlEGCJB9da7f27qspUpqsne1+a4GfhBrFp3IVx9HOYgDsJ/xSLnr+Ajhn5lNiJMN5\n3H3iuUSvOQKBgQDi3W4ej+gKxYc9PllWF2BMWXwe7Q1XIOnVawLzxXSDal7nbu40\ndwg/icOuUlNZsSxrY4pmZoxcmDgWnE6J9/xmgiLMS2WKR9kTQizI/LPDkRX8d0ua\nEDIb0Hm2RaiC1/qH5Jul/EKqJrKEDMiT5nQ03vQ19Nxlhzo35STHLmksiQKBgQCQ\nEES8CUHwNfutqh07yv/71g66zuqTNCdpLFpMuKwO7Hgj29+siKMz1SC4s2s7X6gP\nBkMbXBzSPhpMaOD93woayabkUoO+038ueT85KyxDONL97rRopQmmDyLUysFgkEC9\nh5PftVnp9Fgjm0Fmsxv2uqlf3lpq6CFW3R44xl0TcQKBgHC+jSs3fVr7/0uTVXIE\n89V+ypBbPfI4T2Fl9wPuizTxmLTbbnq3neIVurs6RyM5bWUSPIIoU59NajgCBATL\naE8us6ldgDneXCDGt8z1YwFtpLz5H9ItkOMFl4+Y3WLbk3mgdvpI5M8YsgcnDQ8y\nk1GnVuyRg5oTiYM6g7UTvLnx\n-----END PRIVATE KEY-----\n",
            "client_email": "firebase-adminsdk-h83yt@jobo-chat.iam.gserviceaccount.com",
            "client_id": "117827674445250600196",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://accounts.google.com/o/oauth2/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-h83yt%40jobo-chat.iam.gserviceaccount.com"
        }
    },
    production: {
        databaseURL: "https://jobo-b8204.firebaseio.com",
        cert: {
            "type": "service_account",
            "project_id": "jobo-b8204",
            "private_key_id": "14ea0b26388024fd4e0aef26837d779e6360f70f",
            "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC6hhT4dkFvQ9dx\n+LtdyCt69WV+ffL4d0qsFUaAZftHt4npIlyqKNImSWvtOyDYHFpwSosL99+Va1/G\n6EeKKvJgdH8iCEApaxCyCRM1oZuXNVfDc3sH39NJoTpilcNmEbDteTOUN1blpqry\nnIG476P7NxXanly/ltrJwP2iLn4fQHGrtXohEsx3eChPL1fMsOxA6YfXhPQlGrUz\nG0wSvxE9iz8T2PKQJrzXxzcKCYAD9lFViHYEdNMnv6T3MdVVthAVD5v5d092Mlah\nxqNmBpfaqVWpYnlGrrEH0czxip0ZVvGuAU6gvvfxOwhrtmwCdpJaQzhm4FaWlgrH\n94oCWerTAgMBAAECggEAQ28FNtyeBIlc4y3/I0UifxYoBuanCHAsVXFtpy73fTKc\nT+Zl5PjUHRZvR/mYArmhcrZodb+8HAuROVqxvoCPVxLXAalE9RRpmUwRn1KZaz3U\nSGvAH5UqkJSTBKBLX+PmeLxYSu4E4wryA7tUZNVyjfiY1IxrULLLz6QPrmorm8Uz\nvrb/NpNO7j1YiCVVx6cQH0/PA/hQwlLFW6XL9+X7ATUuxUQI4sjwGjA9we9bfU3M\nNvcovUsMwLEPg3TaHVnaeDbpf8X0GHvUMgkpDmNrFQkwskKWCtsIMWB35f5Rh50B\nRpzEF8RDlv98i8GQeFCM/sWuI4pE8mAOQi+gvxAxpQKBgQD6OIAVTh5xYFlvk3+O\nSOM/CcqrM5Gatg36cOQ2W8HvWz6cEKjiueWmfPGxq/pfLOQzA3MMRWlH+UDC7nME\nq3gvGoWaja4dqlbpWt343icaKqeViuybB/y80fsuhLWATrN8bggq3OplCI+Jg5Bw\n75x8zE8Ib2XIbwx5Ok+gqzXERQKBgQC+1PSkcOhQYIHy1zUiMbS7Klxq95Mzodjz\noTt4YtvjMuJCguJ2Eo6Rlf3ArtxFh+3TTncnttM1LezNRdjdRZdhjwX1qH4LT5Jx\n5b6Cw4JycLy9GB7VWnIx9xw2yvBKk7ZyyQCzZA3YcHpngbl3mpyzGryPgoZX4vMN\njOETAEXANwKBgQCzpg8nvL+UrRVpS2AAewpU/yW4hzzZ9C3TCmx/Lp/txvgLutZW\nehuMzhYFdzE6VhO9IJPgUpGFMEqz6dlAmA+g2gzkayaAfAUMY8YM4Qr3+Xn6nxTD\nNhfaRXRu8K8TYO3yv1kz1Qqg4WWU2JXCz/XtkA6KQtiz8C7ndtsmwuXGdQKBgGT1\nZThaQ43CgP1ovcOJaIRctOgics4uIglCk6PtKUfZ87ocZJLy3lpHcCgwWniuoTPZ\nn1BzeOn5kf5HpaPq3VvPvudobMavIlr/oPqtVKYW3sNrr2RQpXmpslOKqfXKkAvK\nK4S8ulZ3q0p3ZxfPxHc8/eUuuMRmXRAeKDVVP5GhAoGAW+7NYzQpN5LTVh4XD7yR\nqPSwvYu8srmGB+spp8GO+1VJGYqNI9V35jTkbnZk3kJlYli72npBr96wnxUK/ln2\nOm50rCs+7AkbvzPGkmtMzcOCpstrs2GqtQz8UQGMpsMrlZ7g6lKG42r7DpQ8G/vj\n3Hg+Lu6M8x26b5mFimstO0Y=\n-----END PRIVATE KEY-----\n",
            "client_email": "firebase-adminsdk-q7ytj@jobo-b8204.iam.gserviceaccount.com",
            "client_id": "113764809503712074592",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://accounts.google.com/o/oauth2/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-q7ytj%40jobo-b8204.iam.gserviceaccount.com"
        }
    },
    Jobo: {
        databaseURL: "https://jobfast-359da.firebaseio.com",
        cert: {
            "type": "service_account",
            "project_id": "jobfast-359da",
            "private_key_id": "faf771e474a27ed686df35ef37eba42836d1952e",
            "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCq+hHcEgWbqtAM\nzpOBNCIedvSDHkrBqFh/+YjCdPda74C5fBOzbBr4n1Jnl0KQBCdF3+RU0f8psSf3\nIt8ByaPNzEnnU0/21Mbo6UewNh/01lrmIq8yC0LvbrCTsR4A6Kyz45yx0GiI9l+a\nZ17MyoaoiY/n0kr752PXGHdDVhH+n+v8zVCCwk0jyr4Ibsb8AThD2wXbspUn7yAK\n6aIProXCBs+KwXzw2h7ATQocfthzoVDyNQYIefueHPV2kMNno2CxCNBIzaD7Bw5s\nu3xElijONlP2z0O/3ehhTb8iVnYIpS9iUi8Qghoji8WgKX0JQNSGWKPIIZCq9fzM\n41geDzFXAgMBAAECggEAB8EgZDxxAqwO6YseR4Lcyp2XM1yBWXfQI7sRMniUQLc8\nvazcm+DwTDcK9BB5KrJK3FwY1/v6OE2E7tbRtHFiZigOG1lnoV3pyOXOTuCgNxOD\nEI2hfSyOPvEPPcjk/8zjCvmXbBJ0Be+JSyXFt+tg4MNJwo2CwcVZ0tyU3s9IMPsZ\nT4NEDAmiz0FsR897XqehGkZvUum6eYN05zdFNXHw33hhbp5iq3Bctxf+CNzSGMV7\n/Zra7MPYXCI2L2YO0fM6zUKScyYnpv185xKIQVp6DR9kFULr249utzJq3pDyJ3VL\n9A4Gd2HMhDGSNHgRF9OBIxDE8z2/3CRozP4P0rdEmQKBgQDxvevtjn98+PINQ6Gt\nJcu1cmA2OFXsoQzgvtLiSpGk7sezwrTohgompzg7yR9LSvwevAyMUoRRrrTYkNyp\npsIdhlazvnAMXpDrLlTKLw9e62iJME82KQcnQgqg5uKoCkqHS3GuolKE1nOEhGPK\nBvZmOQ+juFqMZ+cigGQslsquqwKBgQC1D6la+b437ol+OG8BXV8/EqHN1AUBIaHf\nwKIf2wFKPRqvWMm4Skg3/n43EcGnfdU36sCWrq/ydNrzci95U2D0HeqqNzqhOxFZ\nT/Zivd8mP8/0zpEupkJrOjVrB+C5B535E5PGRgcN93KYubxSAn9nC/rS31eWZrEQ\njaZYZC1YBQKBgQCCWF6C+6fAMdcJ0eK2IsABOQeplJy392qjMCEzRPPdE6b4RU8Y\nZVXJ27ZVfi9ygJ8Kz2iQrNmN1X7LmuhwTWszUkEjr9ZoxQCs3pF3ZwKJsrLt7e94\nC41A3LowYe3qn4nqA4Lrn7iQybUFygCoaTKokbHeHEQumsOk9ceNx0zH+wKBgF4L\n0YLQwC4bN82ZEIeb8VI4olTgMO1Cg+tOCqgTQJtIG+lCbBzOcK6tAPAnx/fw02Rl\nCj36ZKfCbMwQ3nndhjmmpHJfl5ORs9Q5RZhKWXNrp9/Xv++EKnG53W9Hu0FApJxw\nv8w4KYfmpN6RczEB3R0wSstneP5FPumDOgkll6vlAoGBAMPakXEejITjNomKaUBX\ngIxfTTBWuWoE3q78zLnmDUMBOaLX4e5b7Xi0e0do30MUChM+dxF6aDLQl0ycBW+Q\nCu5PXTkuKOjc9bLlqVX/vmbRiA3ebVDQaCoVw3ED+36g9tyFA3JMmNCo46nA6oiv\nOynT9HetkK43NU9HmFLB69QH\n-----END PRIVATE KEY-----\n",
            "client_email": "firebase-adminsdk-q1cj9@jobfast-359da.iam.gserviceaccount.com",
            "client_id": "117389239828615707572",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://accounts.google.com/o/oauth2/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-q1cj9%40jobfast-359da.iam.gserviceaccount.com"
        }
    }
}

var jobochat = firebase.initializeApp({
    credential: firebase.credential.cert(FIRE_BASE_ADMIN['jobochat'].cert),
    databaseURL: FIRE_BASE_ADMIN['jobochat'].databaseURL
}, "jobochat");
var db = jobochat.database();
var conversationData, conversationRef = db.ref('conversation')

conversationRef.on('value', function (snap) {
    conversationData = snap.val()
})

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
    console.error("Missing config values");
    process.exit(1);
}

/*
 * Use your own validation token. Check that the token used in the Webhook 
 * setup is the same token used here.
 *
 */
app.get('/webhook', function (req, res) {
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === VALIDATION_TOKEN) {
        console.log("Validating webhook");
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error("Failed validation. Make sure the validation tokens match.");
        res.sendStatus(403);
    }
});


/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
    var data = req.body;

    // Make sure this is a page subscription
    if (data.object == 'page') {
        // Iterate over each entry
        // There may be multiple if batched
        data.entry.forEach(function (pageEntry) {
            var pageID = pageEntry.id;
            var timeOfEvent = pageEntry.time;

            // Iterate over each messaging event
            pageEntry.messaging.forEach(function (messagingEvent) {

                console.log('pageEntry', messagingEvent)

                var savedMess = Object({}, messagingEvent)
                delete savedMess.recipient
                delete savedMess.sender
                savedMess.messengerId = messagingEvent.sender.id
                savedMess.type = 'received'
                console.log('savedMess', savedMess)
                conversationRef.child(savedMess.messengerId).child(timeOfEvent).update(savedMess).then(() => {

                    if (messagingEvent.optin) {
                        receivedAuthentication(messagingEvent);
                    } else if (messagingEvent.message) {
                        receivedMessage(messagingEvent);
                    } else if (messagingEvent.delivery) {
                        receivedDeliveryConfirmation(messagingEvent);
                    } else if (messagingEvent.postback) {
                        receivedPostback(messagingEvent);
                    } else if (messagingEvent.read) {
                        receivedMessageRead(messagingEvent);
                    } else if (messagingEvent.account_linking) {
                        receivedAccountLink(messagingEvent);
                    } else {
                        console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                    }


                })


            });
        });

        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know you've
        // successfully received the callback. Otherwise, the request will time out.
        res.sendStatus(200);
    }
});

/*
 * This path is used for account linking. The account linking call-to-action
 * (sendAccountLinking) is pointed to this URL. 
 * 
 */
app.get('/authorize', function (req, res) {
    var accountLinkingToken = req.query.account_linking_token;
    var redirectURI = req.query.redirect_uri;

    // Authorization Code should be generated per user by the developer. This will
    // be passed to the Account Linking callback.
    var authCode = "1234567890";

    // Redirect users to this URI on successful login
    var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;

    res.render('authorize', {
        accountLinkingToken: accountLinkingToken,
        redirectURI: redirectURI,
        redirectURISuccess: redirectURISuccess
    });
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
    var signature = req.headers["x-hub-signature"];

    if (!signature) {
        // For testing, let's log an error. In production, you should throw an
        // error.
        console.error("Couldn't validate the signature.");
    } else {
        var elements = signature.split('=');
        var method = elements[0];
        var signatureHash = elements[1];

        var expectedHash = crypto.createHmac('sha1', APP_SECRET)
            .update(buf)
            .digest('hex');

        if (signatureHash != expectedHash) {
            throw new Error("Couldn't validate the request signature.");
        }
    }
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to 
 * Messenger" plugin, it is the 'data-ref' field. Read more at 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfAuth = event.timestamp;

    // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
    // The developer can set this to an arbitrary value to associate the
    // authentication callback with the 'Send to Messenger' click event. This is
    // a way to do account linking when the user clicks the 'Send to Messenger'
    // plugin.
    var passThroughParam = event.optin.ref;

    console.log("Received authentication for user %d and page %d with pass " +
        "through param '%s' at %d", senderID, recipientID, passThroughParam,
        timeOfAuth);

    // When an authentication is received, we'll send a message back to the sender
    // to let them know it was successful.
    sendTextMessage(senderID, "Authentication successful");
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message' 
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some 
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've 
 * created. If we receive a message with an attachment (image, video, audio), 
 * then we'll simply confirm that we've received the attachment.
 * 
 */
function jobJD(job) {
    var storeName = '', address = '', jobName = '', salary = '', hourly_wages = '', working_type = '', work_time = '',
        figure = '', unit = '', experience = '', sex = '', description = '';

    if (job.storeName) storeName = job.storeName
    if (job.address) address = job.address
    if (job.jobName) jobName = job.jobName

    if (job.salary) salary = `🏆Lương: ${job.salary} triệu/tháng\n`;
    if (job.hourly_wages) hourly_wages = `🏆Lương: ${job.hourly_wages} k/h + thưởng hấp dẫn\n`;
    if (job.working_type) working_type = `🏆Hình thức làm việc: ${job.working_type}\n`;
    let timeStr = '';
    if (job.work_time) {
        if (job.work_time.length > 1) {
            timeStr = 'Ca làm:\n';
            job.work_time.forEach(t => timeStr += `- ${t.start} giờ đến ${t.end} giờ\n`);
        } else timeStr = `Ca làm: ${job.work_time[0].start} giờ - ${job.work_time[0].end} giờ`;
    }

    if (job.description) description = `🏆Mô tả công việc: ${job.description}\n`;
    if (job.unit) unit = `🏆Số lượng cần tuyển: ${job.unit} ứng viên\n`;
    if (job.experience) experience = `🏆Yêu cầu kinh nghiệm\n`;
    else experience = '🏆Không cần kinh nghiệm\n';
    if (job.sex === 'female') sex = `🏆Giới tính: Nữ\n`;
    else if (job.sex === 'male') sex = `🏆Giới tính: Nam\n`;
    if (job.figure) figure = '🏆Yêu cầu ngoại hình\n';

    const text = `${storeName} - ${address}👩‍💻👨‍💻\n
        🏆Vị trí của bạn sẽ là: ${jobName}\n
${working_type}${salary}${hourly_wages}${timeStr}\n${experience}${sex}${unit}${figure}\n`
    return text;
}

function receivedMessage(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    console.log("Received message for user %d and page %d at %d with message:",
        senderID, recipientID, timeOfMessage);
    console.log(JSON.stringify(message));

    var isEcho = message.is_echo;
    var messageId = message.mid;
    var appId = message.app_id;
    var metadata = message.metadata;

    // You may get a text or attachment but not both
    var messageText = message.text;
    var messageAttachments = message.attachments;
    var quickReply = message.quick_reply;

    if (isEcho) {
        // Just logging message echoes to console
        console.log("Received echo for message %s and app %d with metadata %s",
            messageId, appId, metadata);
        return;
    } else if (quickReply) {
        var quickReplyPayload = quickReply.payload;
        console.log("Quick reply for message %s with payload %s",
            messageId, quickReplyPayload);
        //vd: 'quickReply_confirmJob_yes_jobId'
        var payload = quickReplyPayload.split('_');


        if (payload[1] == 'confirmJob') {

            if (payload[2] == 'yes') {
                var jobId = payload[3];
                sendTextMessage(senderID, "Hãy kiểm tra lại chi tiết công việc 1 lần nữa trước khi đặt lịch phỏng vấn nhé!")
                loadJob(jobId).then(result => {
                    var jobData = result
                    jobData.storeName = result.storeData.storeName
                    jobData.address = result.storeData.address
                    console.log(jobData)
                    var text = jobJD(jobData);

                    var messageData = {
                        recipient: {
                            id: senderID
                        },
                        message: {
                            text,
                            quick_replies: [
                                {
                                    "content_type": "text",
                                    "title": "Ứng tuyển",
                                    "payload": "quickReply_bookingInterview_yes_" + jobId
                                },
                                {
                                    "content_type": "text",
                                    "title": "Từ chối ",
                                    "payload": "quickReply_bookingInterview_no_" + jobId
                                }
                            ]
                        }
                    };

                    callSendAPI(messageData);


                })


            } else {


            }


        } else sendTextMessage(senderID, "Quick reply tapped");


        return;
    }

    if (messageText) {

        // If we receive a text message, check to see if it matches any special
        // keywords and send back the corresponding example. Otherwise, just echo
        // the text we received.
        switch (messageText) {
            case 'image':
                sendImageMessage(senderID);
                break;

            case 'gif':
                sendGifMessage(senderID);
                break;

            case 'audio':
                sendAudioMessage(senderID);
                break;

            case 'video':
                sendVideoMessage(senderID);
                break;

            case 'file':
                sendFileMessage(senderID);
                break;

            case 'button':
                sendButtonMessage(senderID);
                break;

            case 'generic':
                sendGenericMessage(senderID);
                break;

            case 'receipt':
                sendReceiptMessage(senderID);
                break;

            case 'quick reply':
                sendQuickReply(senderID);
                break;

            case 'read receipt':
                sendReadReceipt(senderID);
                break;

            case 'typing on':
                sendTypingOn(senderID);
                break;

            case 'typing off':
                sendTypingOff(senderID);
                break;

            case 'account linking':
                sendAccountLinking(senderID);
                break;

            default:{}

        }
    } else if (messageAttachments) {
        sendTextMessage(senderID, "Message with attachment received");
    }
}


/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about 
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var delivery = event.delivery;
    var messageIDs = delivery.mids;
    var watermark = delivery.watermark;
    var sequenceNumber = delivery.seq;

    if (messageIDs) {
        messageIDs.forEach(function (messageID) {
            console.log("Received delivery confirmation for message ID: %s",
                messageID);
        });
    }

    console.log("All message before %d were delivered.", watermark);
}


/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */
function receivedPostback(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;
    var postback = event.postback
    // The 'payload' param is a developer-defined field which is set in a postback
    // button for Structured Messages.
    var payload = postback.payload;
    console.log('Received', event)

    console.log("Received postback for user %d and page %d with payload '%s' " +
        "at %d", senderID, recipientID, payload, timeOfPostback);

    if (postback.referral) {
        var jobId = postback.referral.ref;
        // get data job

        loadJob(jobId).then(result => {
            var jobData = result
            var messageData = {
                recipient: {
                    id: senderID
                },
                message: {
                    text: `Có phải bạn đang muốn ứng tuyển vào vị trí ${jobData.jobName} của ${jobData.storeData.storeName} ?`,
                    quick_replies: [
                        {
                            "content_type": "text",
                            "title": "Đúng rồi (Y)",
                            "payload": "quickReply_confirmJob_yes_" + jobId
                        },
                        {
                            "content_type": "text",
                            "title": "Không phải",
                            "payload": "quickReply_confirmJob_no_" + jobId
                        },
                    ]
                }
            };

            callSendAPI(messageData);
        }).catch(err => sendTextMessage(senderID, JSON.stringify(err)))


        //
    } else sendTextMessage(senderID, "Postback called");


    // When a postback is called, we'll send a message back to the sender to
    // let them know it was successful
}

function loadJob(jobId) {
    return new Promise(function (resolve, reject) {
        const url = `https://jobo-server.herokuapp.com/on/job?jobId=${jobId}`;
        axios.get(url)
            .then(result => resolve(result.data))
            .catch(err => reject(err));
    })
}


/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 * 
 */
function receivedMessageRead(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;

    // All messages before watermark (a timestamp) or sequence have been seen.
    var watermark = event.read.watermark;
    var sequenceNumber = event.read.seq;

    console.log("Received message read event for watermark %d and sequence " +
        "number %d", watermark, sequenceNumber);
}

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 * 
 */
function receivedAccountLink(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;

    var status = event.account_linking.status;
    var authCode = event.account_linking.authorization_code;

    console.log("Received account link event with for user %d with status %s " +
        "and auth code %s ", senderID, status, authCode);
}

/*
 * Send an image using the Send API.
 *
 */
function sendImageMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "image",
                payload: {
                    url: SERVER_URL + "/assets/rift.png"
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a Gif using the Send API.
 *
 */
function sendGifMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "image",
                payload: {
                    url: SERVER_URL + "/assets/instagram_logo.gif"
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send audio using the Send API.
 *
 */
function sendAudioMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "audio",
                payload: {
                    url: SERVER_URL + "/assets/sample.mp3"
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a video using the Send API.
 *
 */
function sendVideoMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "video",
                payload: {
                    url: SERVER_URL + "/assets/allofus480.mov"
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a file using the Send API.
 *
 */
function sendFileMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "file",
                payload: {
                    url: SERVER_URL + "/assets/test.txt"
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText,
            metadata: "DEVELOPER_DEFINED_METADATA"
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: "This is test text",
                    buttons: [{
                        type: "web_url",
                        url: "https://www.oculus.com/en-us/rift/",
                        title: "Open Web URL"
                    }, {
                        type: "postback",
                        title: "Trigger Postback",
                        payload: "DEVELOPER_DEFINED_PAYLOAD"
                    }, {
                        type: "phone_number",
                        title: "Call Phone Number",
                        payload: "+16505551234"
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendGenericMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: "rift",
                        subtitle: "Next-generation virtual reality",
                        item_url: "https://www.oculus.com/en-us/rift/",
                        image_url: SERVER_URL + "/assets/rift.png",
                        buttons: [{
                            type: "web_url",
                            url: "https://www.oculus.com/en-us/rift/",
                            title: "Open Web URL"
                        }, {
                            type: "postback",
                            title: "Call Postback",
                            payload: "Payload for first bubble",
                        }],
                    }, {
                        title: "touch",
                        subtitle: "Your Hands, Now in VR",
                        item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: SERVER_URL + "/assets/touch.png",
                        buttons: [{
                            type: "web_url",
                            url: "https://www.oculus.com/en-us/touch/",
                            title: "Open Web URL"
                        }, {
                            type: "postback",
                            title: "Call Postback",
                            payload: "Payload for second bubble",
                        }]
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a receipt message using the Send API.
 *
 */
function sendReceiptMessage(recipientId) {
    // Generate a random receipt ID as the API requires a unique ID
    var receiptId = "order" + Math.floor(Math.random() * 1000);

    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "receipt",
                    recipient_name: "Peter Chang",
                    order_number: receiptId,
                    currency: "USD",
                    payment_method: "Visa 1234",
                    timestamp: "1428444852",
                    elements: [{
                        title: "Oculus Rift",
                        subtitle: "Includes: headset, sensor, remote",
                        quantity: 1,
                        price: 599.00,
                        currency: "USD",
                        image_url: SERVER_URL + "/assets/riftsq.png"
                    }, {
                        title: "Samsung Gear VR",
                        subtitle: "Frost White",
                        quantity: 1,
                        price: 99.99,
                        currency: "USD",
                        image_url: SERVER_URL + "/assets/gearvrsq.png"
                    }],
                    address: {
                        street_1: "1 Hacker Way",
                        street_2: "",
                        city: "Menlo Park",
                        postal_code: "94025",
                        state: "CA",
                        country: "US"
                    },
                    summary: {
                        subtotal: 698.99,
                        shipping_cost: 20.00,
                        total_tax: 57.67,
                        total_cost: 626.66
                    },
                    adjustments: [{
                        name: "New Customer Discount",
                        amount: -50
                    }, {
                        name: "$100 Off Coupon",
                        amount: -100
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a message with Quick Reply buttons.
 *
 */
function sendQuickReply(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "What's your favorite movie genre?",
            quick_replies: [
                {
                    "content_type": "text",
                    "title": "Action",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
                },
                {
                    "content_type": "text",
                    "title": "Comedy",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
                },
                {
                    "content_type": "text",
                    "title": "Drama",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
                }
            ]
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a read receipt to indicate the message has been read
 *
 */
function sendReadReceipt(recipientId) {
    console.log("Sending a read receipt to mark message as seen");

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "mark_seen"
    };

    callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {
    console.log("Turning typing indicator on");

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "typing_on"
    };

    callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId) {
    console.log("Turning typing indicator off");

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "typing_off"
    };

    callSendAPI(messageData);
}

/*
 * Send a message with the account linking call-to-action
 *
 */
function sendAccountLinking(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: "Welcome. Link your account.",
                    buttons: [{
                        type: "account_link",
                        url: SERVER_URL + "/authorize"
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll 
 * get the message id in a response 
 *
 */
function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            if (messageId) {
                console.log("Successfully sent message with id %s to recipient %s",
                    messageId, recipientId);
            } else {
                console.log("Successfully called Send API for recipient %s",
                    recipientId);
            }

        } else {
            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        }
    });
}

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid 
// certificate authority.
app.listen(app.get('port'), function () {
    console.log('Node app is running on port', app.get('port'));
});

module.exports = app;

