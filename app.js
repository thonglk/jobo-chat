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
    firebase = require('firebase-admin'),
    _ = require('underscore');
var encodeUrl = require('encodeurl')
var urlencode = require('urlencode');
var cors = require('cors')
var flat = require('flat')

const {Wit, log} = require('node-wit');

const client = new Wit({
    accessToken: 'CR6XEPRE2F3FLVWYJA6XFYJSVUO4SCN7',
    logger: new log.Logger(log.DEBUG) // optional
});
var Broadcast = require("./broadcast");

var app = express();
app.use(cors());
app.set('view engine', 'ejs');
app.use(bodyParser.json({verify: verifyRequestSignature}));
app.use(express.static('public'));

var port = process.env.PORT || 5001;

var uri = 'mongodb://joboapp:joboApp.1234@ec2-54-157-20-214.compute-1.amazonaws.com:27017/joboapp';

const MongoClient = require('mongodb');

var md, dumpling_messageFactoryCol, ladiBotCol, ladiResCol, messageFactoryCol

MongoClient.connect(uri, function (err, db) {
    console.log(err);

    md = db;
    dumpling_messageFactoryCol = md.collection('dumpling_messageFactory');
    messageFactoryCol = md.collection('messageFactory');
    ladiBotCol = md.collection('ladiBot_flow')
    ladiResCol = md.collection('ladiBot_response')

    console.log("Connected correctly to server.");

});


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

const WHITE_LIST = config.get('whiteListDomains')

var graph = require('fbgraph');
graph.setVersion("2.12");


// URL where the app is running (include protocol). Used to point to scripts and
// assets located at this address.
const SERVER_URL = (process.env.SERVER_URL) ?
    (process.env.SERVER_URL) :
    config.get('serverURL');
const API_URL = (process.env.API_URL) ?
    (process.env.API_URL) :
    config.get('apiURL');

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
    }
}
const vietnameseDecode = (str) => {
    if (str) {
        str = str.toLowerCase();
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
        str = str.replace(/đ/g, "d");
        str = str.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'| |\"|\&|\#|\[|\]|~|$|_/g, "-");
        /* tìm và thay thế các kí tự đặc biệt trong chuỗi sang kí tự - */
        str = str.replace(/-+-/g, "-"); //thay thế 2- thành 1-
        str = str.replace(/^\-+|\-+$/g, "");
        //cắt bỏ ký tự - ở đầu và cuối chuỗi
        return str;
    }

}

_.templateSettings = {
    interpolate: /\{\{(.+?)\}\}/g
};

function strToObj(str) {
    if (str.match('&')) {
        var keyvalue = str.split('&')
    } else keyvalue = [str]
    var obj = {}
    keyvalue.forEach(each => {
        if (each.match('=')) {
            var split = each.split('=')
            var key = split[0]
            var value = split[1]
            obj[key] = value
        }

    })
    console.log('strToObj', obj)
    return obj
}

function isObject(a) {
    return (!!a) && (a.constructor === Object);
}

function templatelize(text = 'loading...', data = {first_name: 'Thông'}) {
    var check = 0
    text = `${text}`
    console.log('text', text)
    if (isObject(text)) {
        var string = JSON.stringify(text)
        for (var i in data) {
            if (string.match(i)) {
                check++
            }
        }

        if (check > 0) {
            var template = _.template(string, data);
            return JSON.parse(template(data));
        } else return text
    } else {
        for (var i in data) {
            if (text.match(i)) {
                check++
            }
        }

        if (check > 0) {
            var template = _.template(text, data);
            return template(data);
        } else return text
    }
}


var CONFIG;
axios.get(API_URL + '/config')
    .then(result => {
        CONFIG = result.data
    })
    .catch(err => console.log(err))

var jobochat = firebase.initializeApp({
    credential: firebase.credential.cert(FIRE_BASE_ADMIN['jobochat'].cert),
    databaseURL: FIRE_BASE_ADMIN['jobochat'].databaseURL
}, "jobochat");

var jobo = firebase.initializeApp({
    credential: firebase.credential.cert(FIRE_BASE_ADMIN['production'].cert),
    databaseURL: FIRE_BASE_ADMIN['production'].databaseURL
}, "jobo");

var db = jobochat.database();
var db2 = jobo.database();


var userRef = db2.ref('user');


function initDataLoad(ref, store) {
    ref.on('child_added', snap => {
        store[snap.key] = snap.val()
    });
    ref.on('child_changed', snap => {
        store[snap.key] = snap.val()
    });
    ref.on('child_removed', snap => {
        delete store[snap.key]
    });
}

var dataUser = {}, useRef = db.ref('user')
initDataLoad(useRef, dataUser)
var dataAccount = {}, accountRef = db.ref('account')
initDataLoad(accountRef, dataAccount)
var facebookPage = {}, facebookPageRef = db.ref('facebookPage')
initDataLoad(facebookPageRef, facebookPage)
var dataLadiBot = {}, ladiBotRef = db.ref('ladiBot')
initDataLoad(ladiBotRef, dataLadiBot)

function saveData(ref, child, data) {
    return new Promise(function (resolve, reject) {
        if (!ref || !child || !data) reject({err: 'Insufficient'})
        console.log(`saveData`, ref, child, data)
        db.ref(ref).child(child).update(data)
            .then(result => resolve(data))
            .catch(err => reject(err))
    })
}

function saveSenderData(data, senderID, page = '493938347612411') {
    return new Promise(function (resolve, reject) {
        if (senderID != page) {
            data.pageID = page
            accountRef.child(senderID).update(data)
                .then(result => resolve(data))
                .catch(err => reject(err))


        } else reject({err: 'same'})


    })
}

function loadsenderData(senderID, pageID = '493938347612411') {
    return new Promise(function (resolve, reject) {


        if (dataAccount[senderID]) {
            var user = dataAccount[senderID]
            user.lastActive = Date.now();
            saveSenderData(user, senderID, pageID)
                .then(result => resolve(user))
                .catch(err => reject(err))
        }
        else graph.get(senderID + '?access_token=' + facebookPage[pageID].access_token, (err, result) => {

            console.log('account', err, result);

            var user = {id: senderID, createdAt: Date.now(), lastActive: Date.now()};

            if (result.id && result.first_name) user = Object.assign(user, result)

            user.full_name = result.first_name + ' ' + result.last_name;

            graph.get('me/conversations?fields=name,link,id,participants&access_token=' + facebookPage[pageID].access_token, (err, conversations) => {
                console.log('conversations', err, facebookPage[pageID].name);
                if (conversations && conversations.data && conversations.data[0] && conversations.data[0].link) {
                    user.link = conversations.data[0].link;
                    user.fbId = conversations.data[0].participants.data[0].id;
                    user.tId = conversations.data[0].id.slice(2);

                    if (facebookPage[pageID].roles && facebookPage[pageID].roles.data) {
                        var roles = facebookPage[pageID].roles.data
                        var admin = _.filter(roles, role => {
                            if (user.first_name && user.last_name && role.name && role.name.match(user.first_name)
                                && role.name.match(user.last_name)
                            ) return true
                        })
                        if (admin[0]) user.role = admin[0].role
                        var createdBy = facebookPage[pageID].createdBy

                        if (user.first_name && user.last_name && createdBy && createdBy.name && createdBy.name.match(user.first_name)
                            && createdBy.name.match(user.last_name)
                        ) {
                            createdBy.mID = senderID

                            saveData('facebookPage', pageID, {createdBy})
                                .then(result => sendAPI(senderID, {text: 'Admin linked'}, null, pageID))

                        }

                    }

                }

                saveSenderData(user, senderID, pageID)
                    .then(result => resolve(user))
                    .catch(err => reject(err))
            })

        })

    })
}

function matchingPayload(event) {
    return new Promise(function (resolve, reject) {

        console.log('matchingPayload-ing', JSON.stringify(event))

        var senderID = event.sender.id;
        var recipientID = event.recipient.id;
        var timeOfPostback = event.timestamp;
        var message = event.message;
        var postback = event.postback;


        var payloadStr = '';
        var payload = {}

        if (message && message.quick_reply && message.quick_reply.payload && message.quick_reply.payload.match('{')) payloadStr = message.quick_reply.payload
        else if (postback && postback.payload) payloadStr = postback.payload

        if (payloadStr.length > 0) payload = JSON.parse(payloadStr)


        var referral = event.referral
        if (postback && postback.referral) referral = postback.referral

        if (referral) {
            payload.source = 'referral'
            console.log('referral', payload)

        } else if (postback) {

            payload.source = 'postback'
            payload.text = postback.title

        } else if (message) {

            var lastMessage = dataAccount[senderID].lastSent
            console.log('lastMessage', lastMessage);
            if (lastMessage && lastMessage.message && lastMessage.message.metadata) payloadStr = lastMessage.message.metadata;

            if (payloadStr.length > 0) payload = Object.assign({}, JSON.parse(payloadStr), payload)


            if (lastMessage && lastMessage.meta) payload = Object.assign({}, lastMessage.meta, payload)

            if (message.quick_reply) {
                payload.source = 'quick_reply'

            } else if (message.attachments) {
                payload.source = 'attachment'

                if (message.attachments[0].payload.coordinates) {
                    var attachments = message.attachments[0]
                    var locationData = attachments.payload.coordinates;
                    console.log('locationData', locationData);
                    var location = {
                        lat: locationData.lat,
                        lng: locationData.long,
                    }
                    payload.location = location

                } else if (message.attachments[0].payload.url) {
                    var url = message.attachments[0].payload.url;
                    console.log('url', url)
                    payload.text = url
                } else {
                    console.log('something donot know', event)
                }


            } else if (message.text) {
                console.log('message.text', message.text);


                payload.source = 'text'
                payload.text = message.text;

                if (message.nlp && message.nlp.entities) {
                    var entities = message.nlp.entities;
                    var nlp = getNLP(entities)
                    payload.nlp = nlp
                    Object.assign(payload, nlp)
                }

            }

        } else console.log('something donnt know', event)


        if (message && message.text && !message.nlp) client.message(message.text, {})
            .then(data => {
                console.log('Yay, got Wit.ai response: ', data);
                var entities = data.entities

                var nlp = getNLP(entities)
                payload.nlp = nlp
                Object.assign(payload, nlp)
                payload.keyword = vietnameseDecode(payload.text)
                console.log('matchingPayload', payload, senderID, message, postback, referral)
                resolve({payload, senderID, message, postback, referral})

            })
            .catch(console.error);
        else {
            if (payload.text) payload.keyword = vietnameseDecode(payload.text)
            console.log('matchingPayload', payload, senderID, message, postback, referral)
            resolve({payload, senderID, message, postback, referral})
        }


    })
}

function intention(payload, senderID, postback, message = {}) {
    console.log('payload', payload, senderID, postback, message);

    loadUser(senderID).then(user => {

            switch (payload.type) {
                case 'GET_STARTED': {
                    referInital(postback.referral, senderID, user)
                    break;
                }
                case 'affiliate': {
                    sendAPI(senderID, {
                        text: 'Giới thiệu việc làm cho bạn bè, nhận hoa hồng từ 50,000đ đến 1,000,000đ cho mỗi người bạn giới thiệu nhận việc thành công!🙌\n' +
                        'Nhấn "Chia sẻ" để bắt đầu giúp bạn bè tìm việc 👇'
                    }).then(result => sendAPI(senderID, {
                        "attachment": {
                            "type": "template",
                            "payload": {
                                "template_type": "generic",
                                "elements": [
                                    {
                                        "title": "Tìm việc cho bạn bè, người thân và nhận hoa hồng!",
                                        "subtitle": "Hơn 1000+ đối tác nhà hàng, cafe, shop đang tuyển dụng trên Jobo. Hãy giới thiệu nó tới bạn bè nhé!.",
                                        "image_url": "https://scontent.fhan1-1.fna.fbcdn.net/v/t31.0-8/20451785_560611627663205_769548871451838527_o.png?oh=9b46638692186f9b5c3c24dfe883f983&oe=5A992075",
                                        "buttons": [
                                            {
                                                "type": "element_share",
                                                "share_contents": {
                                                    "attachment": {
                                                        "type": "template",
                                                        "payload": {
                                                            "template_type": "generic",
                                                            "elements": [
                                                                {
                                                                    "title": "Tìm việc nhanh theo ca xung quanh bạn!",
                                                                    "subtitle": "Hơn 1000+ đối tác nhà hàng, cafe, shop đang tìm bạn trên Jobo nè. Hãy đặt lịch nhận việc và đi làm ngay!.",
                                                                    "image_url": "https://scontent.fhan1-1.fna.fbcdn.net/v/t31.0-8/15975027_432312730493096_8750211388245957528_o.jpg?oh=4e4f55391114b3b3c8c6e12755cd385b&oe=5AABE512",
                                                                    "default_action": {
                                                                        "type": "web_url",
                                                                        "url": "https://m.me/jobo.asia?ref=start_invitedby:" + senderID
                                                                    },
                                                                    "buttons": [
                                                                        {
                                                                            "type": "web_url",
                                                                            "url": "https://m.me/jobo.asia?ref=start_invitedby:" + senderID,
                                                                            "title": "Bắt đầu tìm việc"
                                                                        }
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    }
                                                }
                                            }
                                        ]
                                    }

                                ]
                            }
                        }

                    })).catch(err => console.log(err))
                    break;
                }

                case 'jobseeker': {

                    if (payload.state == 'updateProfile') sendUpdateProfile(senderID, user)
                    else if (payload.state == 'interview') sendInterviewInfo(senderID, user)

                    break;

                }

                case
                'confirmJob': {
                    if (payload.answer == 'yes') {
                        console.log('Response confirmJob:', payload)
                        var jobId = payload.jobId;
                        loadJob(jobId)
                            .then(result => {
                                var jobData = result;
                                jobData.storeName = result.storeData.storeName;
                                jobData.address = result.storeData.address;

                                var text = jobJD(jobData);

                                sendAPI(senderID, {
                                    text, metadata: JSON.stringify({
                                        case: 'confirmJob',
                                        type: 'jd'
                                    })
                                }, 2000)
                                    .then(() => sendAPI(senderID, {
                                        text: jobData.description || '(Y) (Y) (Y)',
                                        metadata: JSON.stringify({
                                            case: 'confirmJob',
                                            type: 'description'
                                        })
                                    }, 5000))
                                    .then(() => sendAPI(senderID, {
                                        text: 'Bạn có muốn ứng tuyển vào công việc này không?',
                                        quick_replies: [
                                            {
                                                "content_type": "text",
                                                "title": "Ứng tuyển",
                                                "payload": JSON.stringify({
                                                    type: 'applyJob',
                                                    answer: 'yes',
                                                    jobId: jobId
                                                })
                                            },
                                            {
                                                "content_type": "text",
                                                "title": "Từ chối ",
                                                "payload": JSON.stringify({
                                                    type: 'applyJob',
                                                    answer: 'no',
                                                    jobId: jobId
                                                })
                                            }
                                        ],
                                        metadata: JSON.stringify({
                                            case: 'confirmJob',
                                            type: 'applyJob'
                                        })
                                    }, 2000))

                            })

                    } else {

                    }
                    break;

                }
                case
                'applyJob': {
                    if (payload.answer == 'yes') {

                        var jobId = payload.jobId;

                        loadJob(jobId).then(jobData => {
                                var status = 1


                                var actId = jobId + ':' + user.userId
                                axios.post(CONFIG.APIURL + '/like', {
                                    actId,
                                    userId: senderID,
                                    jobId,
                                    likeAt: Date.now(),
                                    type: 2,
                                    status,
                                    platform: 'messenger'
                                });
                                checkRequiment(senderID, user, jobId, status)
                            }
                        )
                    } else sendAPI(senderID, {
                        attachment: {
                            type: "template",
                            payload: {
                                template_type: "button",
                                text: "Hãy cập nhật thêm thông tin để chúng tôi giới thiệu công việc phù hợp hơn với bạn!",
                                buttons: [{
                                    type: "web_url",
                                    url: `${CONFIG.WEBURL}/profile?admin=${user.userId}`,
                                    title: "Cập nhật hồ sơ"
                                }]
                            }
                        }
                    })
                    break;
                }
                case 'askName': {
                    if (message && message.text) profileRef.child(user.userId).update({name: message.text})
                        .then(result => userRef.child(user.userId).update({name: message.text, confirmName: true})
                            .then(result => {
                                checkRequiment(senderID, user, payload.jobId, payload.status)
                            }))
                }
                case 'confirmJobSeeker'
                : {
                    if (payload.answer == 'yes') {
                        userRef.child(senderID).update({type: 2})
                        sendAPI(senderID, {
                            text: "Okie, chào mừng bạn đến với Jobo <3",
                            metadata: JSON.stringify({
                                type: 'welcome',
                                case: 'confirmJobSeeker',
                            })
                        }).then(() => {

                            sendAPI(senderID, {
                                text: "Bạn vui lòng lưu ý 1 số thứ sau trước khi bắt đầu đi làm nhé!",
                                metadata: JSON.stringify({
                                    type: 'welcome_note',
                                    case: 'confirmJobSeeker',
                                })
                            }).then(() => {

                                sendAPI(senderID, {
                                    text: "* Bạn sẽ được:\n" +
                                    "- Chọn ca linh hoạt theo lịch của bạn\n" +
                                    "- Làm việc với các thương hiệu lớn\n" +
                                    "- Không cần CV\n" +
                                    "- Thu nhập từ 6-8tr",
                                    metadata: JSON.stringify({
                                        type: 'welcome_note_benefit',
                                        case: 'confirmJobSeeker',
                                    })
                                }, 4000).then(() => {
                                    sendAPI(senderID, {
                                        text: "Bạn đã nắm rõ chưa nhỉ???",
                                        quick_replies: [{
                                            "content_type": "text",
                                            "title": "Mình đồng ý (Y)",
                                            "payload": JSON.stringify({
                                                type: 'confirmPolicy',
                                                answer: 'yes',
                                            })
                                        }, {
                                            "content_type": "text",
                                            "title": "Không đồng ý đâu :(",
                                            "payload": JSON.stringify({
                                                type: 'confirmPolicy',
                                                answer: 'no',
                                            })
                                        }],
                                        metadata: JSON.stringify({
                                            type: 'confirmPolicy',
                                            case: 'confirmJobSeeker',
                                        })
                                    })

                                })

                            })

                        })


                    } else {

                    }
                    break;


                }
                case
                'confirmEmployer'
                : {
                    if (payload.answer == 'yes') {
                        userRef.child(senderID).update({type: 1});

                        sendAPI(senderID, {
                            text: "Dạ. Bạn vui lòng cho ad xin số điện thoại để bộ phận tư vấn liên hệ nhé ạ",
                            metadata: JSON.stringify({
                                type: 'askPhone',
                                case: 'confirmEmployer'
                            })
                        });

                    } else {

                    }
                    break;


                }
                case
                'confirmPolicy'
                : {
                    if (payload.answer == 'yes') {
                        sendAPI(senderID, {
                            text: "Hiện tại đang có một số công việc đang tuyển gấp, hãy gửi địa chỉ để xem nó có gần bạn không nhé",
                            quick_replies: [{
                                "content_type": "location",
                                "payload": JSON.stringify({
                                    type: 'inputLocation',
                                })
                            }],
                            metadata: JSON.stringify({
                                type: 'inputLocation',
                                case: 'confirmPolicy'
                            })

                        })
                    }
                    break;

                }
                case
                'inputLocation'
                : {

                    if (payload.location) {
                        if (payload.location.lng) {
                            sendListJobByAddress(payload.location, null, senderID, user)
                        } else {
                            var url = `https://maps.google.com/maps/api/geocode/json?address='${vietnameseDecode(payload.location)}'&components=country:VN&sensor=true&apiKey=''`
                            axios.get(url)
                                .then(result => {
                                    if (result.data && result.data.results && result.data.results[0]) {
                                        var list = result.data.results
                                        var message = {
                                            attachment: {
                                                type: "template",
                                                payload: {
                                                    template_type: "button",
                                                    text: "Ý bạn là?",
                                                    buttons: []
                                                }
                                            }
                                        }
                                        var a = 0
                                        var button = list.forEach(add => {
                                            a++
                                            if (a < 4) {
                                                message.attachment.payload.buttons.push({
                                                    type: "postback",
                                                    title: add.formatted_address,
                                                    payload: JSON.stringify({
                                                        type: 'selectLocation',
                                                        location: add.geometry.location,
                                                        address: add.formatted_address
                                                    })
                                                })
                                            }

                                        })
                                        sendAPI(senderID, message)
                                    }
                                }).catch(err => console.log(err))
                        }

                    } else sendAPI(senderID, {
                        text: "Xin lỗi mình không hiểu địa chỉ của bạn?, hãy nhập tên đường hoặc tên quận nhé!,\n hoặc bạn chọn [Send Location] để chọn vị trí cũng được",
                        quick_replies: [{
                            "content_type": "location",
                            "payload": JSON.stringify({
                                type: 'inputLocation',
                            })
                        }],
                        metadata: JSON.stringify({
                            type: 'inputLocation',
                            case: 'confirmPolicy'
                        })

                    })


                    break;

                }
                case
                'selectLocation'
                : {
                    sendListJobByAddress(payload.location, payload.address, senderID, user)
                    break;

                }
                case
                'askPhone'
                : {

                    var jobId = payload.jobId

                    if (payload.phone_number) {
                        var url = `${CONFIG.APIURL}/checkUser?q=${payload.phone_number}`;
                        axios.get(url)
                            .then(result => {

                                var peoples = result.data
                                if (peoples.length > 0) {

                                    var people = peoples[0]

                                    var text = ''
                                    if (people.name) {
                                        text = 'Có phải bạn tên là ' + people.name + ' ?'
                                    } else if (people.email) {
                                        text = 'Có phải bạn từng đăng ký sử dụng Jobo với email là ' + people.email + ' ?'
                                    } else (
                                        text = 'Có phải bạn từng đăng ký sử dụng Jobo cách đây ' + timeAgo(people.createdAt) + ' ?'
                                    )

                                    sendAPI(senderID, {
                                        text,
                                        quick_replies: [{
                                            "content_type": "text",
                                            "title": 'Đúng vậy',
                                            "payload": JSON.stringify({
                                                type: 'confirmCheckUser',
                                                answer: 'yes',
                                                phone_number: payload.phone_number,
                                                case: payload.case,
                                                userId: people.userId,
                                                jobId,
                                                status: payload.status
                                            })
                                        }, {
                                            "content_type": "text",
                                            "title": 'Không phải',
                                            "payload": JSON.stringify({
                                                type: 'confirmCheckUser',
                                                answer: 'no',
                                                phone_number: payload.phone_number,
                                                case: payload.case,
                                                userId: people.userId,
                                                jobId,
                                                status: payload.status

                                            })
                                        }],
                                    })
                                } else sendAPI(senderID, {
                                    text: `Có phải số điện thoại của bạn là: ${payload.phone_number} ?`,
                                    quick_replies: [{
                                        "content_type": "text",
                                        "title": 'Đúng vậy',
                                        "payload": JSON.stringify({
                                            type: 'confirmCheckUser',
                                            answer: 'yes',
                                            phone_number: payload.phone_number,
                                            case: payload.case,
                                            userId: user.userId,
                                            jobId,
                                            status: payload.status
                                        })
                                    }, {
                                        "content_type": "text",
                                        "title": 'Không phải',
                                        "payload": JSON.stringify({
                                            type: 'confirmCheckUser',
                                            answer: 'no',
                                            phone_number: payload.phone_number,
                                            case: payload.case,
                                            userId: user.userId,
                                            jobId,
                                            status: payload.status

                                        })
                                    }],
                                })
                            })
                    } else sendAPI(senderID, {
                        text: `Xin lỗi, số điện thoại của bạn là gì nhỉ?`,
                        metadata: JSON.stringify({
                            type: 'askPhone',
                            case: 'applyJob',
                            jobId,
                            again: true,
                        })
                    });
                    break;

                }
                case
                'confirmCheckUser'
                : {
                    var userId = payload.userId;
                    var jobId = payload.jobId;
                    var phone = payload.phone_number;

                    if (payload.answer == 'yes') {
                        console.log('phone', phone)
                        //update messageId
                        user.messengerId = senderID
                        user.phone = phone
                        userRef.child(userId).update(user)
                            .then(() => {
                                if (payload.case == 'confirmEmployer') sendAPI(senderID, {
                                    text: "Okie, bạn đang cần tuyển vị trí gì nhỉ?",
                                    metadata: JSON.stringify({
                                        type: 'employer_job',
                                        case: 'askPhone'
                                    })
                                });
                                else if (payload.case == 'updateProfile') sendAPI(senderID, {
                                    attachment: {
                                        type: "template",
                                        payload: {
                                            template_type: "button",
                                            text: "Hãy cập nhật thêm thông tin để nhà tuyển dụng chọn bạn!",
                                            buttons: [{
                                                type: "web_url",
                                                url: `${CONFIG.WEBURL}/profile?admin=${user.userId}`,
                                                title: "Cập nhật hồ sơ"
                                            }]
                                        }
                                    }
                                })

                                else if (jobId) checkRequiment(senderID, user, jobId, payload.status)
                                else sendDefautMessage(senderID)


                            })

                        if (userId != senderID) {
                            userRef.child(senderID)
                                .remove(result => profileRef.child(senderID)
                                    .remove(result =>
                                        console.log('merge profile', senderID)
                                    ))
                        }


                    }
                    break;
                }

                case
                'setInterview'
                : {
                    var time = payload.time
                    var jobId = payload.jobId
                    sendAPI(senderID, {
                        text: `Oke bạn, vậy bạn sẽ có buổi trao đổi vào ${strTime(time)}.`
                    }).then(() => sendAPI(senderID, {
                        text: 'Bạn vui lòng xác nhận việc có mặt tại buổi trao đổi này ',
                        metadata: JSON.stringify({
                            type: 'confirmInterview',
                            case: 'setInterview'
                        }),
                        quick_replies: [{
                            "content_type": "text",
                            "title": 'Mình xác nhận <3',
                            "payload": JSON.stringify({
                                type: 'confirmInterview',
                                answer: 'yes',
                                time: time,
                                jobId
                            })
                        }, {
                            "content_type": "text",
                            "title": 'Từ chối tham gia',
                            "payload": JSON.stringify({
                                type: 'confirmInterview',
                                answer: 'no',
                                time: time,
                                jobId
                            })
                        }],
                    }))
                    break;
                }
                case'confirmInterview': {
                    if (payload.answer == 'yes') {
                        var time = payload.time
                        var jobId = payload.jobId

                        var actId = jobId + ':' + senderID
                        console.log('actId', actId)
                        axios.post(CONFIG.APIURL + '/like', {
                            actId,
                            interviewTime: time
                        }).then(result => sendAPI(senderID, {text: `Tks bạn!, ${timeAgo(time)} nữa sẽ diễn ra buổi trao đổi.\n` + 'Chúc bạn phỏng vấn thành công nhé <3'}))
                            .then(result => sendAPI(senderID, {text: 'Ngoài ra nếu có vấn đề gì hoặc muốn hủy buổi phỏng vấn thì chat ngay lại cho mình nhé!,\n - Hãy chủ động gọi cho nhà tuyển dụng để xác nhận lịch trước khi đến, hãy nhớ báo rằng bạn đã ứng tuyển qua JOBO để được gặp nhà tuyển dụng'}))
                            .then(result => sendUpdateProfile(senderID, user, 'Tiếp theo, bạn hãy cập nhật hồ sơ để hoàn tất ứng tuyển nhé!'))
                            .then(result => sendInterviewInfo(senderID, user))
                            .catch(err => console.log(err))
                    }

                    break;
                }
                case 'viewMoreJob': {
                    var data = payload.data
                    getJob(data).then(result => sendAPI(senderID, result.message, 3000))
                    break;
                }
            }
        }
    )

}

function sendAPI(recipientId, message, typing, page = 'jobo', meta) {
    return new Promise(function (resolve, reject) {

        if (message.text) message.text = templatelize(message.text, dataAccount[recipientId])
        else if (message.attachment && message.attachment.payload && message.attachment.payload.text) message.attachment.payload.text = templatelize(message.attachment.payload.text, dataAccount[recipientId])

        if (!typing) typing = 100

        var messageData = {
            recipient: {
                id: recipientId
            },
            message
        };

        sendTypingOn(recipientId, page)
            .then(result => setTimeout(function () {
                callSendAPI(messageData, page).then(result => {
                    sendTypingOff(recipientId, page).then(result => {

                        messageData.sender = {id: page}
                        messageData.type = 'sent'
                        messageData.timestamp = Date.now()
                        if (meta) messageData.meta = meta
                        saveSenderData({lastSent: messageData}, recipientId, page)
                            .then(result => messageFactoryCol.insert(messageData).then(result => resolve(messageData)).catch(err => reject(err)))
                            .catch(err => reject(err))
                    })


                }).catch(err => reject(err))
            }, typing))
            .catch(err => reject(err))


    })
}

function sendReadReceipt(recipientId, page) {
    return new Promise(function (resolve, reject) {
        var messageData = {
            recipient: {
                id: recipientId
            },
            sender_action: "mark_seen"
        };
        console.log('sendReadReceipt', recipientId, page)
        callSendAPI(messageData, page)
            .then(result => resolve(result))
            .catch(err => console.log(err));
    })

}

function sendTypingOn(recipientId, page = 'jobo') {
    return new Promise(function (resolve, reject) {

        var messageData = {
            recipient: {
                id: recipientId
            },
            sender_action: "typing_on"
        };

        callSendAPI(messageData, page)
            .then(result => resolve(result))
            .catch(err => reject(err));
    })

}

function sendTypingOff(recipientId, page = 'jobo') {
    return new Promise(function (resolve, reject) {

        var messageData = {
            recipient: {
                id: recipientId
            },
            sender_action: "typing_off"
        };

        callSendAPI(messageData, page).then(result => resolve(result))
            .catch(err => reject(err));
    })
}

function sendMessageNoSave(senderID, messages, typing, pageID, metadata) {
    return new Promise(function (resolve, reject) {

        var i = -1

        function sendPer() {
            i++
            if (i < messages.length) {
                var messageData = messages[i]
                sendOne(messageData, pageID).then(result => setTimeout(() => {
                    sendPer()
                }, 100))
                    .catch(err => {
                        console.log('err', i, err)
                        reject(err)
                    })
            } else {
                console.log('done', i, messages.length)
                resolve(messages)
            }

        }

        sendPer()


    })

}

function sendOne(messageData, page) {
    return new Promise(function (resolve, reject) {
        messageData.tag = "NON_PROMOTIONAL_SUBSCRIPTION"
        if (facebookPage[page] && facebookPage[page].access_token) {
            request({
                uri: 'https://graph.facebook.com/v2.12/me/messages',
                qs: {access_token: facebookPage[page].access_token},
                method: 'POST',
                json: messageData

            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var recipientId = body.recipient_id;
                    var messageId = body.message_id;
                    if (messageId) {
                        console.log("callSendAPI_success", messageId, recipientId);
                    }
                    resolve(messageData)

                } else {
                    sendLog("callSendAPI_error:" + JSON.stringify(body.error.message) + '\n page: ' + facebookPage[page].name + '\n Message:' + JSON.stringify(messageData))
                    reject(body)
                }
            });
        } else {
            console.error("send_error_access-token", page, messageData);
            reject({err: 'no access token'})
        }

    })
}

function callSendAPI(messageData, page = 'jobo') {
    return new Promise(function (resolve, reject) {

        if (messageData.message && messageData.message.text && messageData.message.text.length > 640) {
            console.log('messageData.message.text.length', messageData.message.text.length)
            var longtext = messageData.message.text
            var split = longtext.split('.\n')
            console.log('split', split)
            var messages = split.map(text => {
                var mess = {
                    recipient: {
                        id: messageData.recipient.id
                    },
                    message: {
                        text: text
                    }
                };
                return mess
            });
            console.log('messages', messages)

            sendMessageNoSave(messageData.recipient.id, messages, null, page)
                .then(result => resolve(result))
                .catch(err => reject(err))

        } else sendOne(messageData, page)
            .then(result => resolve(result))
            .catch(err => reject(err))
    })

}

var waiting = {}
var timeOff = {}

function L(locale, data) {
    return data[locale.substring(0, 2)]
}

db.ref('webhook').on('child_added', function (snap) {
    var data = snap.val()
    if (data.object == 'page') {

        data.entry.forEach(pageEntry => {
            if (pageEntry.id) var pageID = `${pageEntry.id}`;
            var timeOfEvent = pageEntry.time;
            if (pageEntry.messaging) {
                pageEntry.messaging.forEach(function (messagingEvent) {
                    if (messagingEvent.sender && messagingEvent.sender.id) var senderID = `${messagingEvent.sender.id}`;

                    var recipientID = `${messagingEvent.recipient.id}`;
                    var timeOfMessage = messagingEvent.timestamp;

                    var isDeveloper = false
                    if (facebookPage[pageID]
                        && facebookPage[pageID].developer
                        && facebookPage[pageID].developer.match(senderID)) {
                        isDeveloper = true
                    }

                    if ((isDeveloper && port == '5001') || (!isDeveloper && port != '5001')) {
                        console.log('messagingEvent', messagingEvent)

                        if (messagingEvent.message || messagingEvent.postback || messagingEvent.referral || messagingEvent.optin) {

                            loadsenderData(senderID, pageID)
                                .then(senderData => matchingPayload(messagingEvent)
                                    .then(result => {
                                        var payload = result.payload;
                                        if (senderData.nlp) Object.assign(senderData.nlp, payload.nlp)
                                        else senderData.nlp = payload.nlp
                                        if (!_.isEmpty(senderData.nlp)) saveSenderData({nlp: senderData.nlp}, senderID, pageID)

                                        var message = result.message;
                                        var referral = result.referral;
                                        var postback = result.postback;


                                        if (pageID == facebookPage['jobo'].id) intention(payload, senderID, postback, message)

                                        else if (pageID == facebookPage['dumpling'].id) {

                                            if (message && message.text) var messageText = message.text;
                                            if (message && message.attachments) var messageAttachments = message.attachments;

                                            if (payload.type == 'GET_STARTED') {
                                                if (referral && referral.ref) {
                                                    senderData.ref = referral.ref
                                                    var refData = senderData.ref.split('_');
                                                    console.log('refData', refData);
                                                    senderData.topic = {}
                                                    if (refData[0] != 'start') senderData.topic = refData[0]
                                                }

                                                saveSenderData(senderData, senderID, pageID)
                                                    .then(result => sendMessages(senderID, [{
                                                        text: `Dumpling kết nối hai người lạ nói chuyện với nhau bằng một cuộc trò chuyện bí mật`,
                                                    }, {
                                                        text: `đảm bảo 100% bí mật thông tin và nội dung trò chuyện`,
                                                    }, {
                                                        text: `Hãy gửi vị trí của bạn`,
                                                        quick_replies: [{
                                                            "content_type": "location",
                                                            "payload": JSON.stringify({
                                                                type: 'getLocation',
                                                                case: 'quick'
                                                            })
                                                        }],
                                                        metadata: JSON.stringify({
                                                            type: 'getLocation',
                                                            case: 'search'
                                                        })
                                                    }], null, recipientID))
                                            }
                                            else if (payload.type == 'getLocation' || payload.location) {

                                                saveSenderData({location: payload.location}, senderID, pageID)
                                                    .then(result => sendingAPI(senderID, recipientID, {
                                                        text: `Bạn đang tham gia Dumpling #${payload.topic}, hãy ấn [💬 Bắt Đầu] để bắt đầu tìm người lạ trò chuyện`,
                                                        quick_replies: [
                                                            {
                                                                "content_type": "text",
                                                                "title": "💬 Bắt Đầu",
                                                                "payload": JSON.stringify({
                                                                    type: 'matching'
                                                                })
                                                            }
                                                        ]
                                                    }, null, 'dumpling'))

                                            }
                                            else if (payload.type == 'stop') {

                                                if (senderData && senderData.match) {

                                                    accountRef.child(senderID).child('match').remove()
                                                        .then(result => accountRef.child(senderData.match).child('match').remove())
                                                        .then(result => sendingAPI(senderID, recipientID, {
                                                            text: "[Hệ Thống] Bạn đã dừng cuộc trò chuyện",
                                                            quick_replies: [
                                                                {
                                                                    "content_type": "text",
                                                                    "title": "💬 Bắt đầu mới",
                                                                    "payload": JSON.stringify({
                                                                        type: 'matching'
                                                                    })
                                                                }
                                                            ]
                                                        }, null, 'dumpling'))
                                                        .then(result => sendingAPI(senderData.match, recipientID, {
                                                            text: "[Hệ Thống] Người lạ đã dừng cuộc trò chuyện",
                                                            quick_replies: [
                                                                {
                                                                    "content_type": "text",
                                                                    "title": "💬 Bắt đầu mới",
                                                                    "payload": JSON.stringify({
                                                                        type: 'matching'
                                                                    })
                                                                }
                                                            ]
                                                        }, null, 'dumpling'))

                                                } else if (senderData) sendingAPI(senderID, recipientID, {
                                                    text: "[Hệ Thống] Bạn chưa bắt đầu cuộc trò chuyện!",
                                                    quick_replies: [
                                                        {
                                                            "content_type": "text",
                                                            "title": "💬 Bắt Đầu",
                                                            "payload": JSON.stringify({
                                                                type: 'matching'
                                                            })
                                                        }
                                                    ]
                                                }, null, 'dumpling')
                                            }
                                            else if (payload.type == 'matching') {
                                                if (senderData && senderData.match) sendingAPI(senderID, recipientID, {
                                                    text: "[Hệ Thống] Hãy huỷ cuộc hội thoại hiện có !",
                                                }, null, 'dumpling');
                                                else sendAPI(senderID, {
                                                    text: `[Hệ Thống] Đang tìm kiếm....`,
                                                }, null, '493938347612411')
                                                    .then(result => matchingPeople(senderID))
                                            }
                                            else if (payload.type == 'share') {
                                                sendingAPI(senderID, recipientID, {
                                                    text: 'Chia sẻ Dumpling với bạn bè để giúp họ tìm thấy 1 nữa của đời mình nhé 👇'
                                                }, null, 'dumpling').then(result => sendingAPI(senderID, recipientID, {
                                                    "attachment": {
                                                        "type": "template",
                                                        "payload": {
                                                            "template_type": "generic",
                                                            "elements": [
                                                                {
                                                                    "title": "Dumpling Bot <3 <3 <3!",
                                                                    "subtitle": "Mình là Dumpling Xanh Dương cực dễ thương. Mình đến với trái đất với mục đích kết duyên mọi người.",
                                                                    "image_url": "https://scontent.fhan2-1.fna.fbcdn.net/v/t1.0-9/23659623_558217007851211_9187684244656643971_n.jpg?oh=7f6099d65ee108a021a2818c369777c5&oe=5AA8F1BD",
                                                                    "buttons": [
                                                                        {
                                                                            "type": "element_share",
                                                                            "share_contents": {
                                                                                "attachment": {
                                                                                    "type": "template",
                                                                                    "payload": {
                                                                                        "template_type": "generic",
                                                                                        "elements": [
                                                                                            {
                                                                                                "title": "Dumpling Bot <3 <3 <3!",
                                                                                                "subtitle": "Mình là Dumpling Xanh Dương cực dễ thương. Mình đến với trái đất với mục đích kết duyên mọi người.",
                                                                                                "image_url": "https://scontent.fhan2-1.fna.fbcdn.net/v/t1.0-9/23659623_558217007851211_9187684244656643971_n.jpg?oh=7f6099d65ee108a021a2818c369777c5&oe=5AA8F1BD",
                                                                                                "default_action": {
                                                                                                    "type": "web_url",
                                                                                                    "url": "https://m.me/dumpling.bot?ref=start_invitedby:" + senderID
                                                                                                },
                                                                                                "buttons": [
                                                                                                    {
                                                                                                        "type": "web_url",
                                                                                                        "url": "https://m.me/dumpling.bot?ref=start_invitedby:" + senderID,
                                                                                                        "title": "Bắt đầu tìm gấu"
                                                                                                    }
                                                                                                ]
                                                                                            }
                                                                                        ]
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    }

                                                }, null, 'dumpling')).catch(err => console.log(err))
                                            }
                                            else if (payload.type == 'status') {
                                                var status = senderData.status
                                                if (status == 0) sendingAPI(senderID, recipientID, {
                                                    text: "[Hệ Thống] Trạng thái: InActive \n Bạn sẽ không nhận được ghép cặp!",
                                                    quick_replies: [
                                                        {
                                                            "content_type": "text",
                                                            "title": "Bật",
                                                            "payload": JSON.stringify({
                                                                type: 'confirm_status',
                                                                answer: 'on'
                                                            })
                                                        }
                                                    ]
                                                }, null, 'dumpling')
                                                else sendingAPI(senderID, recipientID, {
                                                    text: "[Hệ Thống] Trạng thái: Active \n Bạn sẽ nhận được ghép cặp!",
                                                    quick_replies: [
                                                        {
                                                            "content_type": "text",
                                                            "title": "Tắt",
                                                            "payload": JSON.stringify({
                                                                type: 'confirm_status',
                                                                answer: 'off'
                                                            })
                                                        }
                                                    ]
                                                }, null, 'dumpling')
                                            }
                                            else if (payload.type == 'confirm_status') {
                                                if (payload.answer == 'off') accountRef.child(senderID).update({status: 0}).then(result => sendingAPI(senderID, recipientID, {
                                                    text: "[Hệ Thống] Trạng thái: InActive \n Bạn sẽ không nhận được ghép cặp!",
                                                    quick_replies: [
                                                        {
                                                            "content_type": "text",
                                                            "title": "Bật",
                                                            "payload": JSON.stringify({
                                                                type: 'confirm_status',
                                                                answer: 'on'
                                                            })
                                                        }
                                                    ]
                                                }, null, 'dumpling'))
                                                else if (payload.answer == 'on') accountRef.child(senderID).update({status: 1}).then(result => sendingAPI(senderID, recipientID, {
                                                    text: "[Hệ Thống] Trạng thái: Active \n Bạn sẽ nhận được ghép cặp!",
                                                    quick_replies: [
                                                        {
                                                            "content_type": "text",
                                                            "title": "Tắt",
                                                            "payload": JSON.stringify({
                                                                type: 'confirm_status',
                                                                answer: 'off'
                                                            })
                                                        }
                                                    ]
                                                }, null, 'dumpling'))

                                            }
                                            else if (messagingEvent.optin) {
                                                receivedAuthentication(messagingEvent);
                                            }
                                            else if (messagingEvent.read) {
                                                sendReadReceipt(senderData.match, 'dumpling')
                                            }
                                            else if (messageText) {
                                                if (senderData && senderData.match) {
                                                    sendingAPI(senderData.match, senderID, {
                                                        text: messageText,
                                                    }, null, pageID)
                                                } else sendAPI(senderID, {
                                                        text: "[Hệ thống] Bạn chưa ghép đôi với ai cả\n Bạn hãy ấn [💬 Bắt Đầu] để bắt đầu tìm người lạ trò chuyện",
                                                        quick_replies: [
                                                            {
                                                                "content_type": "text",
                                                                "title": "💬 Bắt Đầu",
                                                                "payload": JSON.stringify({
                                                                    type: 'matching'
                                                                })
                                                            }
                                                        ]
                                                    }, 10, pageID
                                                )
                                            }
                                            else if (messageAttachments) {
                                                if (senderData && senderData.match) {
                                                    sendingAPI(senderData.match, senderID, {
                                                        attachment: messageAttachments[0]
                                                    }, null, 'dumpling')
                                                } else sendingAPI(senderID, recipientID, {
                                                    text: "[Hệ thống] Bạn chưa ghép đôi với ai cả\n Bạn hãy ấn [💬 Bắt Đầu] để bắt đầu tìm người lạ trò chuyện",
                                                    quick_replies: [
                                                        {
                                                            "content_type": "text",
                                                            "title": "💬 Bắt Đầu",
                                                            "payload": JSON.stringify({
                                                                type: 'matching'
                                                            })
                                                        }
                                                    ]
                                                }, null, 'dumpling')
                                            }
                                            else {
                                                console.log('something missing here')
                                            }
                                        }
                                        else {
                                            if (facebookPage[pageID].currentBot) var result = _.findWhere(dataLadiBot, {id: facebookPage[pageID].currentBot});
                                            else result = _.findWhere(dataLadiBot, {page: pageID});

                                            var flow = result.data;
                                            var questions = flow[1];
                                            var response = {
                                                page: pageID,
                                                senderID
                                            }

                                            if (messagingEvent.optin) referral = {ref: messagingEvent.optin.ref}

                                            if (referral && referral.ref) {

                                                senderData.ref = referral.ref;
                                                saveSenderData(senderData, senderID, pageID)

                                                if (referral.ref.match('_')) {
                                                    var refData = referral.ref.split('_');

                                                } else refData = [referral.ref]

                                                console.log('refData', refData);

                                                if (refData[0] == 'create') {
                                                    var url = senderData.ref.slice(7);
                                                    console.log('url', url);

                                                    sendAPI(senderID, {
                                                        text: `Welcome {{full_name}}! \n Your form is being converted`
                                                    }, null, pageID)

                                                    getChat({url, pageID, type: 'url'})
                                                        .then(form => sendAPI(senderID, {
                                                            attachment: {
                                                                type: "template",
                                                                payload: {
                                                                    template_type: "button",
                                                                    text: `Done <3! \n We had just turn your "${form.name}" form into chatbot to help you convert more leads! \n Step 2: Connect this form to your Facebook Page`,
                                                                    buttons: [{
                                                                        type: "web_url",
                                                                        url: `https://app.botform.asia/create?url=${url}`,
                                                                        title: "Connect your Fanpage"
                                                                    }, {
                                                                        type: "web_url",
                                                                        url: `https://www.facebook.com/pages/create`,
                                                                        title: "Create new page"
                                                                    }]
                                                                }
                                                            }
                                                        }, null, pageID))
                                                        .catch(err => sendAPI(senderID, {
                                                            text: "Err: Can't read your form, make sure it was a google forms link and make it public, go https://app.botform.asia/create to try again" + JSON.stringify(err)
                                                        }, null, pageID))
                                                } else if (refData[1]) {

                                                    for (var i in questions) {
                                                        var quest = questions[i]
                                                        console.log(vietnameseDecode(refData[1]), vietnameseDecode(quest[1]))
                                                        if (vietnameseDecode(refData[1]) == vietnameseDecode(quest[1])) {
                                                            go(quest[0], null, flow, senderID, pageID)
                                                            break
                                                        }
                                                    }


                                                } else loop(0, flow, senderID, pageID)

                                            }
                                            else if (payload.keyword == 'page-on') {
                                                SetOnOffPage(pageID)
                                                    .then(result => sendAPI(senderID, {
                                                        text: `Page on ;)`,
                                                    }, null, pageID))
                                                    .catch(err => console.log(err))

                                            }
                                            else if (!facebookPage[pageID].page_off) {


                                                if (payload.keyword == 'start-over' || payload.type == 'GET_STARTED') {
                                                    saveSenderData({time_off: null}, senderID, pageID)
                                                    ladiResCol.remove({
                                                        page: pageID,
                                                        senderID
                                                    }).then(result => {
                                                        console.log('remove response', response)
                                                    });
                                                    payload = {}
                                                    response = {
                                                        page: pageID,
                                                        senderID,
                                                    };
                                                    loop(0, flow, senderID, pageID)
                                                }
                                                else if (payload.keyword == 'update-my-bot') {

                                                    if (!senderData.role) {
                                                        sendAPI(senderID, {
                                                            text: `You don't have permission to do it`,
                                                        }, null, pageID)

                                                        return
                                                    }

                                                    if (result.editId) var flowId = result.editId + '/edit'
                                                    else flowId = result.id + '/viewform'
                                                    var data = {url: `https://docs.google.com/forms/d/${flowId}`}

                                                    if (pageID && facebookPage[pageID] && facebookPage[pageID].access_token && facebookPage[pageID].name) data = Object.assign(data, facebookPage[pageID], {pageID})
                                                    console.log('data', data)
                                                    sendAPI(senderID, {
                                                        text: `Updating...`,
                                                    }, null, pageID)
                                                    getChat({pageID})
                                                        .then(pageData => sendAPI(senderID, {
                                                            text: `Updated successful for ${pageData.name} <3!`,
                                                        }, null, pageID))
                                                        .catch(err => sendAPI(senderID, {
                                                            text: `Update Error: ${JSON.stringify(err)}`,
                                                        }, null, pageID))
                                                }
                                                else if (payload.keyword == 'get-noti') {

                                                    saveSenderData({subscribe: 'all'}, senderID, pageID)
                                                        .then(result => sendAPI(senderID, {
                                                            text: `Subscribe noti successful <3!`,
                                                        }, null, pageID))

                                                }
                                                else if (payload.keyword == 'stop-noti') {
                                                    saveSenderData({subscribe: null}, senderID, pageID)
                                                        .then(result => sendAPI(senderID, {
                                                            text: `Unsubscribe noti successful (Y)!`,
                                                        }, null, pageID))

                                                }
                                                else if (payload.keyword == 'page-off') {
                                                    if (!senderData.role) {
                                                        sendAPI(senderID, {
                                                            text: `You don't have permission to do it`,
                                                        }, null, pageID)

                                                        return
                                                    }

                                                    SetOnOffPage(pageID, true)
                                                        .then(result => sendAPI(senderID, {
                                                            text: `Page off :(`,
                                                        }, null, pageID))
                                                        .catch(err => console.log(err))


                                                }
                                                else if (payload.keyword && payload.keyword.match('mute-bot')) {
                                                    var time_off = 24 * 60 * 60 * 1000
                                                    var date_until = new Date(Date.now() + time_off)

                                                    SetOnOffPagePerUser(pageID, payload.subID, time_off)
                                                        .then(result => sendAPI(senderID, {
                                                            text: `Bot was off for ${dataAccount[payload.subID].full_name} until  ${date_until}, click 'Mute bot' again to get more time!`,
                                                        }, null, pageID)
                                                            .then(result => sendAPI(payload.subID, {
                                                                text: `You are chatting with agent. Type 'stop agent' to switch to bot`,
                                                            }, null, pageID)))
                                                }
                                                else if (payload.keyword == 'stop-agent') {
                                                    saveSenderData({time_off: null}, senderID, pageID)
                                                        .then(result => sendAPI(senderID, {
                                                            text: `Switched to bot`,
                                                        }, null, pageID))
                                                        .then(result => loop(0, flow, senderID, pageID))

                                                }
                                                else if (payload.keyword == 'report') {
                                                    if (!senderData.role) {
                                                        sendAPI(senderID, {
                                                            text: `You don't have permission to do it`,
                                                        }, null, pageID)

                                                        return
                                                    }

                                                    sendAPI(senderID, {
                                                        text: `Hi, We are building today's report for you now...`,
                                                    }, null, pageID)
                                                    buildReport(pageID).then(result => sendAPI(senderID, {
                                                        attachment: {
                                                            type: "template",
                                                            payload: {
                                                                template_type: "button",
                                                                text: result.text,
                                                                buttons: [{
                                                                    type: "postback",
                                                                    title: "Last 7 days",
                                                                    "payload": JSON.stringify({
                                                                        type: 'command',
                                                                        command: 'report',
                                                                        data: {day: 7, ago: 0, pageID: pageID}
                                                                    })
                                                                }, {
                                                                    type: "postback",
                                                                    title: "Last 30 days",
                                                                    "payload": JSON.stringify({
                                                                        type: 'command',
                                                                        command: 'report',
                                                                        data: {day: 30, ago: 0, pageID: pageID}
                                                                    })
                                                                }, {
                                                                    type: "postback",
                                                                    title: "Last 1 day",
                                                                    "payload": JSON.stringify({
                                                                        type: 'command',
                                                                        command: 'report',
                                                                        data: {day: 1, ago: 0, pageID: pageID}
                                                                    })
                                                                }]
                                                            }
                                                        }
                                                    }, null, pageID))


                                                }
                                                else if (payload.type == 'command') {
                                                    if (payload.command == 'report') buildReport(payload.data.pageID, payload.data.day, payload.data.ago).then(result => sendAPI(senderID, {
                                                        text: result.text,
                                                    }, null, pageID))


                                                }
                                                else if (senderData.time_off) {
                                                    console.log('senderData.time_off')
                                                    if (!timeOff[senderID]) {
                                                        sendAPI(senderID, {
                                                            text: `You are chatting with agent. Type 'stop agent' to switch to bot (Gõ 'stop agent' để tiếp tục với bot) `,
                                                        }, null, pageID)
                                                        timeOff[senderID] = true
                                                    }

                                                }
                                                else if (payload.text && payload.type == 'ask' && senderData.currentQuestionId) {
                                                    response[senderData.currentQuestionId] = payload.text

                                                    if (payload.setCustom) {
                                                        var custom = senderData.custom || {}
                                                        custom[payload.setCustom] = payload.text
                                                        console.log('custom', custom)

                                                        saveSenderData({custom}, senderID, pageID)
                                                    }

                                                    ladiResCol.findOneAndUpdate({
                                                        page: pageID,
                                                        senderID
                                                    }, {$set: response}, {upsert: true}).then(result => {
                                                    }).catch(err => console.log('err', err))

                                                    var index = _.findLastIndex(questions, {
                                                        0: senderData.currentQuestionId
                                                    });

                                                    var goto = payload.goto
                                                    if (payload.askType == 3 || payload.askType == 2) {
                                                        if (payload.source == 'text' && payload.other) {
                                                            go(payload.other, index, flow, senderID, pageID)

                                                        } else go(goto, index, flow, senderID, pageID)

                                                    } else if (payload.askType == 1) {
                                                        if (!waiting[senderID]) {
                                                            waiting[senderID] = true
                                                            setTimeout(function () {
                                                                delete waiting[senderID]
                                                                console.log('delete waiting[senderID]')
                                                                go(goto, index, flow, senderID, pageID)
                                                            }, 10000)
                                                        }

                                                    } else if (payload.askType == 0) {
                                                        var curQues = _.findWhere(questions, {0: senderData.currentQuestionId});
                                                        if (curQues[4] && curQues[4][0] && curQues[4][0][4] && curQues[4][0][4][0]) {

                                                            var valid = curQues[4][0][4][0]

                                                            if (valid[0] == 1) {
                                                                //number
                                                                if (valid[1] == 7) {
                                                                    //between
                                                                    console.log('payload.text', payload.text, Number(payload.text) > valid[2][0])
                                                                    if (Number(payload.text) > valid[2][0] && Number(payload.text) < valid[2][1]) go(goto, index, flow, senderID, pageID)
                                                                    else sendAPI(senderID, {
                                                                        text: valid[3]
                                                                    }, null, pageID, payload)

                                                                }
                                                            }


                                                        }
                                                        else go(goto, index, flow, senderID, pageID)

                                                    }
                                                    else go(goto, index, flow, senderID, pageID)

                                                }
                                                else if (payload.keyword && flow[21]) {
                                                    for (var i in flow[21]) {
                                                        var goto = flow[21][i]
                                                        if (payload.keyword.match(i)) {
                                                            go(goto, null, flow, senderID, pageID)
                                                            break
                                                        }
                                                    }
                                                }
                                                else if (payload.json_plugin_url || payload.block_names) {
                                                    if (payload.json_plugin_url) sendTypingOn(senderID, pageID)
                                                        .then(result => axios.get(payload.json_plugin_url)
                                                            .then(result => sendjson_plugin_url(senderID, result.data.messages, null, pageID, result.data.go_to_block, result.data.set_attributes)
                                                            ))
                                                    else if (payload.block_names) {
                                                        for (var i in questions) {
                                                            var quest = questions[i]
                                                            console.log(vietnameseDecode(payload.block_names[0]), vietnameseDecode(quest[1]))
                                                            if (vietnameseDecode(payload.block_names[0]) == vietnameseDecode(quest[1])) {
                                                                go(quest[0], null, flow, senderID, pageID)
                                                                break
                                                            }
                                                        }
                                                    }
                                                    if (payload.set_attributes) {
                                                        var set_attributes = payload.set_attributes
                                                        var dataCustom = dataAccount[senderID].custom || {}
                                                        dataCustom = Object.assign(dataCustom, set_attributes)
                                                        saveData('account', senderID, {custom: dataCustom}).then(result => {
                                                            console.log('payload.set_attributes', result)
                                                        })
                                                    }
                                                }
                                            }

                                        }


                                    })
                                    .catch(err => console.error())
                                ).catch(err => console.error());

                            messagingEvent.type = 'received';
                            saveSenderData({lastReceive: messagingEvent}, senderID, pageID)


                        } else if (messagingEvent.read) {
                            receivedMessageRead(messagingEvent);
                        } else if (messagingEvent.delivery) {
                            receivedDeliveryConfirmation(messagingEvent);
                        } else if (messagingEvent.account_linking) {
                            receivedAccountLink(messagingEvent);
                        } else {
                            console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                        }

                        messageFactoryCol.insert(messagingEvent)
                            .then(result => db.ref('webhook').child(snap.key).remove())
                            .catch(console.error)


                    }


                })

            }
            else if (pageEntry.changes) {
                console.log('pageEntry.changes', pageEntry.changes)
                pageEntry.changes.forEach(changeEvent => {
                    if (changeEvent.value && changeEvent.value.comment_id && changeEvent.value.message && changeEvent.value.parent_id) {
                        var form = getBotfromPageID(pageID)
                        var message = 'Thanks for comment. How can I help you?'
                        if (form && form.data && form.data[0]) message = form.data[0]

                        sendPrivate(message, changeEvent.value.comment_id, pageID)

                    }

                })

                db.ref('webhook').child(snap.key).remove()

            }
        });
    }

});


function SetOnOffPage(pageID, page_off = null) {
    return new Promise(function (resolve, reject) {
        facebookPageRef.child(pageID).update({page_off}).then(result => resolve(facebookPage[pageID]))
            .catch(err => reject(err))
    })
}

app.get('/SetOnOffPage', (req, res) => {
    var {pageID, status} = req.query
    SetOnOffPage(pageID, status).then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

function SetOnOffPagePerUser(pageID, senderID, time_off) {
    return new Promise(function (resolve, reject) {
        if (time_off) saveSenderData({time_off}, senderID, pageID).then(result => {
            setTimeout(function () {
                saveSenderData({time_off: null}, senderID, pageID).then(result => {
                    console.log('remove')
                    sendAPI(senderID, {text: 'Chat with agent has closed. Type "start over" \n Gặp tư vấn viên đã kết thúc. Tiếp tục gõ "start over"'}, null, pageID)
                })
            }, time_off)
            resolve(facebookPage[pageID])
        })
            .catch(err => reject(err))
    })
}

app.get('/setoff', (req, res) => {
    var {pageID, senderID, time_off} = req.query
    SetOnOffPagePerUser(pageID, senderID, time_off)
        .then(result => res.send(result))
        .catch(err => res.status(500).json(err))

})


function saveFacebookPage(data) {
    return new Promise(function (resolve, reject) {
        data.updatedAt = Date.now()
        if (!facebookPage[data.id] || !facebookPage[data.id].createdAt) data.createdAt = Date.now()

        facebookPageRef.child(data.id).update(data)
            .then(result => resolve(result))
            .catch(err => reject(err))
    })
}

var profileRef = db2.ref('profile');

var a = 0


function saveLadiBot(save, id) {
    return new Promise(function (resolve, reject) {
        var find = _.where(dataLadiBot, {id})
        if (find.length > 0) {
            db.ref('ladiBot').child(find[0].key).update(save).then(result => resolve(save))
        } else {
            save.key = save.flow + Date.now()
            db.ref('ladiBot').child(save.key).update(save).then(result => resolve(save))
        }
    })
}


// CONFIG FUNCTION

app.post('/noti', function (req, res) {
    let {recipientId, message, pageID} = req.body;
    if (pageID) sendAPI(recipientId, message, null, pageID)
    else sendAPI(recipientId, message)
        .then(result => res.send(result))
        .catch(err => res.status(500).json(err))
});

app.get('/dumpling/account', function (req, res) {
    var query = req.query
    var filter = _.filter(dataAccount, account => {
        if (
            (!query.match || (query.match && account.match)) &&
            (!query.gender || account.gender == query.gender)
        ) return true
    });

    console.log('length', filter.length)
    res.send(filter)
});


function setGreeting(greeting = [
    {
        "locale": "default",
        "text": 'Hello {{user_first_name}}, Click "Get started" to engage with us'
    }
], page = 'jobo') {

    console.error("setGreeting-ing", page);

    return new Promise(function (resolve, reject) {
        request({
            uri: 'https://graph.facebook.com/v2.12/me/messenger_profile',
            qs: {access_token: facebookPage[page].access_token},
            method: 'POST',
            json: {
                greeting
            }

        }, function (error, response, body) {
            console.error("setGreeting", error, body);

            if (error) reject(error)

            resolve(body)

        });
    })

}

app.get('/setGreeting', function (req, res) {
    var {page, greeting} = req.query
    setGreeting(greeting, page).then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

function setDefautMenu(page = 'jobo', persistent_menu) {
    return new Promise(function (resolve, reject) {

        if (!persistent_menu) {
            var form = getBotfromPageID(page)
            if (form && form.persistent_menu) persistent_menu = form.persistent_menu
        }

        if (!persistent_menu) reject({err: 'No persistent_menu'})

        var menu = {persistent_menu}

        console.log("setDefautMenu-ing", page, menu);

        request({
            uri: 'https://graph.facebook.com/v2.12/me/messenger_profile',
            qs: {access_token: facebookPage[page].access_token},
            method: 'POST',
            json: menu

        }, function (error, response, body) {
            console.log("setDefautMenu", error, body);

            if (error) reject(error)

            resolve(body)

        });
    })

}

app.get('/setMenu', function (req, res) {
    var page = req.param('page')
    setDefautMenu(page).then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

function setGetstarted(page = 'jobo') {
    console.error("setGetstarted-ing", page);

    var message = {
        "setting_type": "call_to_actions",
        "thread_state": "new_thread",
        "call_to_actions": [
            {
                "payload": JSON.stringify({
                    type: 'GET_STARTED'
                })
            }
        ]
    }

    return new Promise(function (resolve, reject) {
        request({
            uri: 'https://graph.facebook.com/v2.12/me/thread_settings',
            qs: {access_token: facebookPage[page].access_token},
            method: 'POST',
            json: message

        }, function (error, response, body) {
            console.log("setGetstarted", error, body);
            if (error) reject(error)

            resolve(body)
        });
    })
}

app.get('/setGetstarted', function (req, res) {
    var page = req.param('page')
    setGetstarted(page).then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

function setWit(page = 'jobo') {
    console.log("setWit-ing", page);


    return new Promise(function (resolve, reject) {
        request({
            uri: "https://graph.facebook.com/v2.12/me/nlp_configs?nlp_enabled=TRUE&&model=VIETNAMESE",
            qs: {access_token: facebookPage[page].access_token},
            method: 'POST',
        }, function (error, response, body) {
            console.error("setWit", error, body);

            resolve(JSON.parse(body))

        });
    })

}

app.get('/setWit', function (req, res) {
    var {page} = req.query
    setWit(page).then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

function setWhiteListDomain(domain, pageID) {
    var mes = {
        "whitelisted_domains": [domain]
    }

    return new Promise(function (resolve, reject) {
        request({
            uri: 'https://graph.facebook.com/v2.12/me/messenger_profile',
            qs: {access_token: facebookPage[pageID].access_token},
            method: 'POST',
            json: mes

        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                resolve(response)

            } else {
                console.error("setWhiteListDomain_error", response.statusMessage);
                reject(error)

            }
        });
    })

}

app.get('/setWhiteListDomain', function (req, res) {
    setWhiteListDomain().then(result => res.send(result))
        .catch(err => res.status(500).json(err))
});

function sendPrivate(message, obj, pageID = 'jobo') {

    console.error("sendPrivate-ing", message, pageID);

    return new Promise(function (resolve, reject) {
        request({
            uri: `https://graph.facebook.com/v2.12/${obj}/private_replies`,
            qs: {access_token: facebookPage[pageID].access_token},
            method: 'POST',
            json: {
                message
            }

        }, function (error, response, body) {
            console.error("sendPrivate", error, body);

            if (error) reject(error)

            resolve(body)

        });
    })

}

function getLongLiveToken(shortLiveToken) {
    console.log('getLongLiveToken-ing', shortLiveToken)

    return new Promise((resolve, reject) => {
        const url = `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=295208480879128&client_secret=4450decf6ea88c391f4100b5740792ae&fb_exchange_token=${shortLiveToken}`;
        axios.get(url)
            .then(res => {
                console.log('getLongLiveToken', res.data)
                resolve(res.data)
            })
            .catch(err => reject(err));
    });
}

function subscribed_apps(pageID) {
    return new Promise(function (resolve, reject) {
        var access_token = facebookPage[pageID].access_token
        console.log(access_token, pageID)
        graph.post(pageID + '/subscribed_apps', {access_token}, function (err, result) {
            console.log('subscribed_apps', err, result)
            // if (err) reject(err)

            resolve(result)
        })

    })
}

app.get('/subscribed_apps', function (req, res) {
    var {pageID} = req.query
    subscribed_apps(pageID)
        .then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

function getFullPageInfo(access_token) {
    return new Promise((resolve, reject) => {
        graph.get('/me/?fields=name,id,fan_count,roles,location&access_token=' + access_token, (err, result) => {
            console.log('getFullPageInfo', err, result)
            if (err || result.message) reject(err)
            resolve(result)
        })
    })


}

function debugToken(longLiveToken) {
    return new Promise((resolve, reject) => {
        const appToken = '295208480879128|pavmPhKnN9VWZXLC6TdxLxoYFiY'
        const url = `https://graph.facebook.com/debug_token?input_token=${longLiveToken}&access_token=295208480879128|pavmPhKnN9VWZXLC6TdxLxoYFiY`;

        axios.get(url)
            .then(result => resolve(result.data))
            .catch(err => reject(err));
    });
}

function getPage({access_token, name, pageID}) {
    return new Promise(function (resolve, reject) {
        if (!access_token) {
            if (pageID && facebookPage[pageID] && facebookPage[pageID].access_token) access_token = facebookPage[pageID].access_token
            else reject({err: 'insuf'})
        }

        getLongLiveToken(access_token)
            .then(token => getFullPageInfo(token.access_token)
                .then(pageData => {

                    pageData.access_token = token.access_token


                    debugToken(token.access_token).then((result, err) => {
                        console.log('debugToken', result, err)
                        if (result.data) {
                            var user_id = result.data.user_id
                            pageData.createdBy = {userID: user_id}

                            if (dataUser[user_id]) {
                                var userCre = dataUser[user_id]
                                if (userCre.name) pageData.createdBy.name = userCre.name
                                if (userCre.email) pageData.createdBy.email = userCre.email
                            }
                        }

                        saveFacebookPage(pageData)
                            .then(() => resolve(pageData))
                            .catch(err => reject({err}))

                    })

                })
            )
    })
}


function getDataFromUrl(url, branding = true) {
    return new Promise(function (resolve, reject) {
        console.log('getChat-ing')
        if (!url) reject({err: 'Set your url first'})

        axios.get(url)
            .then(result => {


                    if (
                        result.data.match('FB_PUBLIC_LOAD_DATA_ = ')
                        || result.data.match('FB_LOAD_DATA_ = ')
                    ) {
                        var str = '';

                        if (result.data.match('FB_PUBLIC_LOAD_DATA_ = ')) str = 'FB_PUBLIC_LOAD_DATA_ = ';
                        else str = 'FB_LOAD_DATA_ = ';

                        var splitFirst = result.data.split(str);

                        var two = splitFirst[1]
                        //certain

                        if (two.match(`;</script>`)) {
                            var right = two.split(`;</script>`);
                            var it = right[0]//certain
                            if (JSON.parse(it)) {
                                var array = JSON.parse(it)
                                if (str == 'FB_LOAD_DATA_ = ') var allData = array[0]
                                else allData = array
                                var data = allData[1]
                                console.log('data', data)
                                var id = allData[14]
                                var save = {
                                    id, data, flow: vietnameseDecode(data[8] || 'untitled')

                                }
                                if (!url.match('/d/e/')) {
                                    var urla = url.split('/d/')
                                    var editId = urla[1].split('/')[0]
                                    save.editId = editId
                                }

                                var flows = data[1]
                                // add description
                                if (data[0]) {
                                    var des = [0, data[0], null, 6]
                                    flows.unshift(des)
                                }


                                //
                                var greeting = [];
                                var greetingPart = {}

                                var menuPart = {}

                                var persistent_menu = {
                                    "call_to_actions": [],
                                    "locale": "default",
                                };


                                var autoreply = []

                                var renderOps = {}
                                var r = 0

                                console.log('Get greeting & menu')

                                for (var i in flows) {
                                    var flow = flows[i]
                                    var title = flow[1] || 'undefined'
                                    var description = flow[2]
                                    var type = flow[3]

                                    if (!greetingPart.start && title.toLowerCase() == 'greeting' && type == '8') greetingPart.start = i
                                    else if (!greetingPart.end && greetingPart.start && type == '8') greetingPart.end = i
                                    else if (!greetingPart.end && greetingPart.start) {
                                        if (description && isObject(strToObj(description)) && strToObj(description).locale) {
                                            var obj = strToObj(description)
                                            var first = obj.locale
                                            var supportLang = config.get('supportLang')
                                            var checkLg = supportLang.indexOf(first);

                                            if (checkLg != -1) {
                                                var locale = supportLang.substring(checkLg, checkLg + 5)
                                            }


                                        } else var locale = 'default'

                                        if (locale) greeting.push({
                                            text: title,
                                            locale
                                        })
                                    }

                                    if (!menuPart.start && title.toLowerCase() == 'menu' && type == '8') menuPart.start = i
                                    else if (!menuPart.end && menuPart.start && type == '8') menuPart.end = i
                                    else if (!menuPart.end && menuPart.start) {
                                        var menuTitle = flow[1]

                                        if (type == '2' && flow[4] && flow[4][0]) {

                                            var optionsList = flow[4][0][1]

                                            if (optionsList.length > 1) {
                                                console.log('optionsList', optionsList)
                                                var call_to_actions = _.map(optionsList, option => {
                                                    var text = option[0]
                                                    if (option[2]) return {
                                                        title: text,
                                                        "type": "postback",
                                                        "payload": JSON.stringify({
                                                            type: 'ask',
                                                            text: text,
                                                            goto: option[2]
                                                        })
                                                    }
                                                })
                                                console.log('call_to_actions', call_to_actions)

                                                persistent_menu.call_to_actions.push({
                                                    title: menuTitle,
                                                    type: "nested",
                                                    call_to_actions
                                                })
                                            }
                                            else if (optionsList[0]) {
                                                var option = optionsList[0]

                                                var meta = {
                                                    type: 'ask',
                                                    text: menuTitle
                                                }
                                                if (option[2]) {
                                                    meta.goto = option[2]
                                                }
                                                persistent_menu.call_to_actions.push({
                                                    title: menuTitle,
                                                    "type": "postback",
                                                    "payload": JSON.stringify(meta)
                                                })

                                            }


                                        }

                                    }
                                    if (save.editId) {
                                        if (type == '11') {
                                            console.log(flow[6][0])
                                            renderOps['r' + r] = ["image", {
                                                "cosmoId": flow[6][0],
                                                "container": save.editId
                                            }]
                                            r++
                                        } else if (type == 2 && flow[4] && flow[4][0] && flow[4][0][1]) {
                                            var options = flow[4][0][1]
                                            options.forEach(option => {
                                                if (option[5] && option[5][0]) {
                                                    renderOps['r' + r] = ["image", {
                                                        "cosmoId": option[5][0],
                                                        "container": save.editId
                                                    }]
                                                    r++
                                                }
                                            })
                                        }
                                    }
                                    if (title == 'freetext' && type == 2) {
                                        var freetext = {}

                                        var optionsLists = flow[4][0][1]

                                        if (optionsLists) {
                                            console.log('optionsList', optionsLists)
                                            var call = _.each(optionsLists, option => {
                                                var text = option[0]
                                                if (text.match('|')) {
                                                    var array = text.split('|')
                                                    array.forEach(ar => {
                                                        freetext[vietnameseDecode(ar)] = option[2]
                                                    })
                                                } else freetext[vietnameseDecode(text)] = option[2]
                                            })
                                        }
                                        save.data[21] = freetext

                                    }


                                    if (title == 'autoreply' && type == 2) {
                                        var freetext = {}

                                        var optionsLists = flow[4][0][1]

                                        if (optionsLists) {
                                            console.log('optionsList', optionsLists)
                                            var call = _.each(optionsLists, option => {
                                                var text = option[0]
                                                if (text.match('|')) {
                                                    var array = text.split('|')
                                                    array.forEach(ar => {
                                                        freetext[vietnameseDecode(ar)] = option[2]
                                                    })
                                                } else freetext[vietnameseDecode(text)] = option[2]
                                            })
                                        }
                                        var data = {freetext}
                                        data.postId = description || 'any'
                                        autoreply.push(data)

                                    }


                                }

                                if (r > 0) axios.post(`https://docs.google.com/forms/d/${save.editId}/renderdata?id=${save.editId}&renderOps=` + urlencode(JSON.stringify(renderOps)))
                                    .then(result => {
                                        var sub = result.data.substr(5)

                                        var res = JSON.parse(sub)
                                        console.log(res)
                                        save.data[20] = {}
                                        for (var i in renderOps) {
                                            console.log(i, res[i])
                                            save.data[20][renderOps[i][1].cosmoId] = res[i]
                                        }
                                        saveLadiBot(save, save.id)

                                    })
                                    .catch(err => console.log(err))


                                console.log('Done greeting & menu')


                                if (greeting.length > 0) save.greeting = greeting

                                if (persistent_menu.call_to_actions.length == 0) persistent_menu.call_to_actions.push({
                                    "title": save.data[8] || 'Start over',
                                    "type": "postback",
                                    "payload": JSON.stringify({
                                        type: 'GET_STARTED'
                                    })
                                })
                                if (branding) persistent_menu.call_to_actions.push({
                                    "title": "Create a bot in Botform",
                                    "type": "web_url",
                                    "url": "https://app.botform.asia?ref=branding"
                                })
                                save.persistent_menu = [persistent_menu]

                                if (autoreply.length > 0) save.autoreply = autoreply

                                console.log('Get form', save)

                                saveLadiBot(save, save.id)
                                    .then(result => resolve(save))
                                    .catch(err => reject({err: JSON.stringify(err), url}))

                            } else reject({err: 'This parse was not public', url})
                        } else reject({err: 'This script was not public', url})


                    } else reject({err: 'This data was not public', url})

                }
            )
            .catch(err => {
                console.log('get chat err', err)
                reject(err)
            })

    })
}

function exeTypeBot({type, url, pageID}) {
    return new Promise(function (resolve, reject) {
        console.log('exeTypeBot', type, url)
        if (type == 'url' && url) resolve(url)
        else copyForms(null, pageID, facebookPage[pageID])
            .then(form => resolve(`https://docs.google.com/forms/d/${form.id}/edit`))
    })
}

function initBot({save = {}, pageID}) {
    return new Promise(function (resolve, reject) {

        if (!save) save = {}
        var init = {}

        subscribed_apps(pageID)
            .then(result => {
                if (result.error) save.subscribed_apps = result.error.message || result.error
                else init.subscribed_apps = Date.now()

                setGreeting(save.greeting, pageID)
                    .then(result => {
                        if (result.error) save.setGreeting = result.error.message || result.error
                        else init.setGreeting = Date.now()

                        setDefautMenu(pageID, save.persistent_menu)
                            .then(result => {

                                if (result.error) save.setDefautMenu = result.error.message || result.error
                                else init.setDefautMenu = Date.now()

                                setWit(pageID)
                                    .then(result => {
                                        if (result.error) save.setWit = result.error.message || result.error
                                        else init.setWit = Date.now()
                                        resolve(init)

                                        // setGetstarted(pageID)
                                        //     .then(result => {
                                        //         if (result.error) save.setGetstarted = result.error.message || result.error
                                        //         else init.setGetstarted = Date.now()
                                        //
                                        //
                                        //
                                        //     })
                                    })
                            })


                    })


            })
    })
}

function getChat({url, access_token, name, pageID, type}) {
    return new Promise(function (resolve, reject) {
        getPage({access_token, name, pageID})
            .then(pageData => copySheets(null, pageID, facebookPage[pageID])
                .then(sheet => exeTypeBot({type, url, pageID})
                    .then(url => getDataFromUrl(url, true)
                        .then(save => initBot({save, pageID})
                            .then(init => {
                                pageData.init = init
                                pageData.editId = save.editId
                                pageData.sheetId = sheet.id
                                pageData.currentBot = save.id
                                saveFacebookPage(pageData)
                                    .then(() => resolve(pageData))
                                    .catch(err => reject({err}))

                            }))
                        .catch(err => reject({err})))))
    })
}

app.get('/getchat', function ({query}, res) {
    getChat(query)
        .then(result => res.send(result))
        .catch(err => res.status(500).json(err))
});
app.get('/getChatAll', (req, res) => {
    var list = _.toArray(facebookPage)
    console.log('list', list)
    var promises = list.map(function (obj) {
        return getChat({pageID: obj.id})
            .then(results => {
                    return results
                }
            )
            .catch(err => {
                    return err
                }
            )
    });

    Promise.all(promises)
        .then(results => {
            sendLog('getChatAll')
            res.send(results)
        })


})


function getNLP(entities) {
    var nlp = {}
    for (var i in entities) {
        var entity = entities[i]
        var most = _.max(entity, function (card) {
            return card.confidence;
        });
        var value = most.value
        console.log('value', value)
        if (i == 'yes_no') nlp.answer = value;
        nlp[i] = value;

    }
    return nlp
}


if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
    console.error("Missing config values");
    process.exit(1);
}

function shortAddress(fullAddress) {
    if (fullAddress) {
        var mixAddress = fullAddress.split(",")
        if (mixAddress.length < 3) {
            return fullAddress
        } else {
            var address = mixAddress[0] + ', ' + mixAddress[1] + ', ' + mixAddress[2]
            return address
        }

    }
}

function strTime(time) {
    var vietnamDay = {
        0: 'Chủ nhật',
        1: 'Thứ 2',
        2: 'Thứ 3',
        3: 'Thứ 4',
        4: 'Thứ 5',
        5: 'Thứ 6',
        6: 'Thứ 7',
        7: 'Chủ nhật'
    };

    var newtime = new Date(time);
    var month = Number(newtime.getMonth()) + 1
    return newtime.getHours() + 'h ' + vietnamDay[newtime.getDay()] + ' ' + newtime.getDate() + '/' + month
}

function timeAgo(timestamp) {
    var time;
    timestamp = new Date(timestamp).getTime()
    var now = new Date().getTime()
    var a = now - timestamp
    if (a > 0) {
        var minute = Math.round(a / 60000);
        if (minute < 60) {
            time = minute + " phút trước"
        } else {
            var hour = Math.round(minute / 60);
            if (hour < 24) {
                time = hour + " giờ trước"
            } else {
                var day = Math.round(hour / 24);
                if (day < 30) {
                    time = day + " ngày trước"
                } else {
                    var month = Math.round(day / 30);
                    if (month < 12) {
                        time = month + " tháng trước"
                    } else {
                        var year = Math.round(month / 12);
                        time = year + " năm trước"
                    }
                }
            }
        }

        return time;
    }
    if (a < 0) {
        a = Math.abs(a);

        var minute = Math.round(a / 60000);
        if (minute < 60) {
            time = "còn " + minute + " phút"
        } else {
            var hour = Math.round(minute / 60);
            if (hour < 24) {
                time = "còn " + hour + " giờ"
            } else {
                var day = Math.round(hour / 24);
                if (day < 30) {
                    time = "còn " + day + " ngày"
                } else {
                    var month = Math.round(day / 30);
                    if (month < 12) {
                        time = "còn " + month + " tháng"
                    } else {
                        var year = Math.round(month / 12);
                        time = "còn " + year + " năm "
                    }
                }
            }
        }

        return time;

    }

}

function getPaginatedItems(items, page = 1, per_page = 15) {
    var offset = (page - 1) * per_page,
        paginatedItems = _.rest(items, offset).slice(0, per_page);


    return {
        page: page,
        per_page: per_page,
        total: items.length,
        total_pages: Math.ceil(items.length / per_page),
        data: paginatedItems
    };
}


var listen = 'on'

function go(goto, q = 0, flow, senderID, pageID) {

    var questions = flow[1]

    if (goto == '-3') {
        if (flow[2] && flow[2][0]) {
            sendAPI(senderID, {
                text: flow[2][0]
            }, null, pageID)
        }

        submitResponse(pageID, senderID)
            .then(result => console.log('done', result))
            .catch(err => console.log('err', err))
    }
    else if (goto == '-2') {
        q++
        loop(q, flow, senderID, pageID)

    }
    else if (!goto) {
        q++
        loop(q, flow, senderID, pageID)

    } else {

        var index = _.findLastIndex(questions, {
            0: goto
        });
        index++
        loop(index, flow, senderID, pageID)
    }
}

function loop(q, flow, senderID, pageID) {
    var questions = flow[1]
    var senderData = dataAccount[senderID]
    console.log('current', q)
    if (q < questions.length) {
        var currentQuestion = questions[q];


        if (!currentQuestion[1]) currentQuestion[1] = 'Untitled Title'
        if (currentQuestion[4] && currentQuestion[1] && currentQuestion[1].match('locale')) {
            var askOption = currentQuestion[4][0][1];
            var lang = senderData.locale.substring(0, 2)
            var choose = askOption[0]
            for (var i in askOption) {
                var option = askOption[i]
                if (option[0].match(lang)) {
                    choose = option
                    break
                }
            }

            go(choose[2], q, flow, senderID, pageID)


        } else if (currentQuestion[3] == 8) {
            var goto = currentQuestion[5]

            go(goto, q, flow, senderID, pageID)

        } else {

            var currentQuestionId = currentQuestion[0];

            saveSenderData({currentQuestionId}, senderID, pageID)

            var messageSend = {
                text: currentQuestion[1],
            }
            var metadata = {}


            var askStringStr = `0,1,7,9,10,13`;
            var askOptionStr = `2,3,4,5`;
            var askType = currentQuestion[3];
            console.log('askType', askType);
            if (currentQuestion[4]) {
                if (currentQuestion[2] && currentQuestion[2].match(/=>\w+\S/g)) {
                    metadata.setCustom = currentQuestion[2].match(/=>\w+\S/g)[0].substring(2)
                }
                metadata.askType = askType;
                metadata.type = 'ask';
                if (askOptionStr.match(askType)) {
                    var askOption = currentQuestion[4][0][1];
                    var check = askOption[0][0]
                    if (check.match('&&')) {
                        var messageSend = {
                            "attachment": {
                                "type": "template",
                                "payload": {
                                    "template_type": "generic",
                                    "elements": []
                                }
                            }
                        }
                        var generic = []

                        var map = _.map(askOption, option => {

                            var eleArray = option[0].split('&&')
                            var image_url = ''
                            if (option[5] && option[5][0]) image_url = flow[20][option[5][0]]

                            if (option[2]) metadata.goto = option[2]
                            if (generic.length < 10) generic.push({
                                "title": eleArray[0] || option[0] || '🤖',
                                "image_url": image_url,
                                "subtitle": eleArray[1],
                                "buttons": [
                                    {
                                        "type": "postback",
                                        "title": eleArray[2] || 'Choose',
                                        "payload": JSON.stringify(metadata)
                                    }
                                ]
                            });
                            else console.log('generic.length', generic.length)
                        });
                        messageSend.attachment.payload.elements = generic;


                        sendAPI(senderID, {text: currentQuestion[1]}, null, pageID, metadata)
                            .then(result => sendAPI(senderID, messageSend, null, pageID, metadata)
                                .then(result => console.log('messageSend', messageSend))
                                .catch(err => console.log('sendAPI_err', err)))
                            .catch(err => console.log('sendAPI_err', err))

                    }
                    else if (askType == 3) {
                        console.log('askOption[0][2]', askOption[0][2])
                        var array_mes = []
                        var buttons = []
                        var each = _.each(askOption, option => {
                            metadata.text = option[0]
                            if (option[2]) metadata.goto = option[2]
                            if (option[4] == 1) metadata.other = option[2]

                            var str = option[0]
                            str = templatelize(str, senderData)

                            if (str.indexOf("[") != -1 && str.indexOf("]") != -1) {
                                var n = str.indexOf("[") + 1;
                                var b = str.indexOf("]");
                                var sub = str.substr(n, b - n)
                                var tit = str.substr(0, n - 2)
                                var expression = "/((([A-Za-z]{3,9}:(?:\\/\\/)?)(?:[\\-;:&=\\+\\$,\\w]+@)?[A-Za-z0-9\\.\\-]+|(?:www\\.|[\\-;:&=\\+\\$,\\w]+@)[A-Za-z0-9\\.\\-]+)((?:\\/[\\+~%\\/\\.\\w\\-_]*)?\\??(?:[\\-\\+=&;%@\\.\\w_]*)#?(?:[\\.\\!\\/\\\\\\w]*))?)/\n";
                                var regex = 'http';
                                if (sub.match(regex)) var button = {
                                    type: "web_url",
                                    url: sub,
                                    title: tit,
                                    messenger_extensions: false
                                }
                                else button = {
                                    type: "phone_number",
                                    title: tit,
                                    payload: sub
                                }

                            } else if (option[0]) button = {
                                type: "postback",
                                title: option[0],
                                payload: JSON.stringify(metadata)
                            }
                            if (button) buttons.push(button)

                        });
                        console.log('buttons', buttons)
                        var length = buttons.length
                        console.log('length', length)

                        if (length > 3) {

                            var messageSend = {
                                attachment: {
                                    type: "template",
                                    payload: {
                                        template_type: "button",
                                        text: currentQuestion[1],
                                        buttons: [buttons[0], buttons[1], buttons[2]]
                                    }
                                }
                            }


                            var rest = _.rest(buttons, 3)
                            var mapQuick = rest.map(but => {
                                but.content_type = "text"
                                delete but.type
                                return but
                            })
                            messageSend.quick_replies = mapQuick


                        } else {
                            messageSend = {
                                attachment: {
                                    type: "template",
                                    payload: {
                                        template_type: "button",
                                        text: currentQuestion[1],
                                        buttons: buttons
                                    }
                                }
                            }

                        }

                        array_mes.push(messageSend)
                        sendMessages(senderID, array_mes, null, pageID, metadata)

                    } else {
                        var quick_replies = []
                        var map = _.map(askOption, option => {
                            metadata.text = option[0]
                            if (option[2]) metadata.goto = option[2]
                            if (option[4] == 1) {
                                metadata.other = option[2]
                                console.log('metadata', metadata)
                            }
                            var quick = {
                                "content_type": "text",
                                "title": option[0] || "🤖",
                                "payload": JSON.stringify(metadata)

                            }

                            if (option[0] == 'location') quick = {
                                "content_type": "location"
                            }
                            else if (option[0] == 'phone_number') quick = {
                                "content_type": "user_phone_number"
                            }
                            else if (option[0] == 'email') quick = {
                                "content_type": "user_email"
                            }

                            if (option[5] && option[5][0]) quick.image_url = flow[20][option[5][0]]

                            if (quick_replies.length < 11) quick_replies.push(quick)
                            else console.log('quick_replies.length', quick_replies.length)
                        });

                        messageSend.quick_replies = quick_replies

                        sendAPI(senderID, messageSend, null, pageID, metadata)
                            .then(resutl => console.log('messageSend', messageSend))
                            .catch(err => console.log('sendAPI_err', err))
                    }


                } else if (askStringStr.match(askType)) {

                    sendAPI(senderID, messageSend, null, pageID, metadata)
                        .then(resutl => console.log('messageSend', messageSend))
                        .catch(err => console.log('sendAPI_err', err))
                }


            }
            else {
                metadata.type = 'info'

                var response = {}
                response[currentQuestionId] = true
                ladiResCol.findOneAndUpdate({
                    flow: senderData.flow,
                    page: pageID,
                    senderID,
                }, {$set: response}, {upsert: true}).then(result => {
                        q++

                        if (askType == 11 && flow[20]) sendAPI(senderID, {
                            attachment: {
                                type: "image",
                                payload: {
                                    url: flow[20][currentQuestion[6][0]]
                                }
                            }
                        }, null, pageID, metadata)
                            .then(result => loop(q, flow, senderID, pageID))
                        else if (askType == 12 && currentQuestion[6][3]) sendAPI(senderID, {
                            text: `https://www.youtube.com/watch?v=${currentQuestion[6][3]}`
                        }, null, pageID, metadata)
                            .then(result => loop(q, flow, senderID, pageID))
                        else if (askType == 6) {
                            if (currentQuestion[1] && currentQuestion[1].match('pdf')) sendAPI(senderID, {
                                attachment: {
                                    type: "file",
                                    payload: {
                                        url: currentQuestion[1]
                                    }
                                }
                            }, null, pageID, metadata)
                                .then(result => {
                                    console.log('result', result)
                                    loop(q, flow, senderID, pageID)
                                })
                                .catch(err => console.log('err', err))
                            else if (currentQuestion[1].match('JSON')) {
                                var url = templatelize(currentQuestion[2], senderData)
                                console.log('url ', url)
                                var newurl = url
                                var url_para = url.split("?")
                                var para = url_para[1]
                                if (para) {
                                    newurl = url_para[0] + '?'
                                    if (para.match("&")) {
                                        var per = para.split("&")


                                    } else per = [para]

                                    per.forEach(kv => {
                                        var k_v = kv.split("=")
                                        newurl = newurl + k_v[0] + "=" + urlencode(k_v[1]) + '&'
                                    })
                                }

                                console.log('newurl ', newurl)


                                axios.get(newurl).then(result => sendjson_plugin_url(senderID, result.data.messages, null, pageID))

                            }
                            else if (currentQuestion[2] && currentQuestion[2].toLowerCase() == 'notification') sendNotiUser(templatelize(currentQuestion[1], senderData), senderData, pageID)
                                .then(result => loop(q, flow, senderID, pageID))

                            else if (currentQuestion[2] && currentQuestion[2].match('<>')) {
                                console.log('random', currentQuestion[2])
                                var array = currentQuestion[2].split('<>');
                                array.push(currentQuestion[1]);
                                var pick = _.sample(array)
                                messageSend.text = templatelize(pick, senderData)
                                sendAPI(senderID, messageSend, null, pageID, metadata)
                                    .then(result => loop(q, flow, senderID, pageID))
                                    .catch(err => console.log('err', err))

                            } else {
                                var messages = [{text: currentQuestion[1]}]
                                if (currentQuestion[2]) {
                                    messages.push({text: currentQuestion[2]})
                                    console.log('messages', messages)
                                }
                                sendMessages(senderID, messages, null, pageID, metadata).then(result => {
                                    loop(q, flow, senderID, pageID)
                                })
                            }

                        }

                    }
                )


            }


        }


    } else go(-3, null, flow, senderID, pageID)

}

function sendMessages(senderID, messages, typing, pageID, metadata) {
    return new Promise(function (resolve, reject) {
        var i = -1

        function sendPer() {
            i++
            if (i < messages.length) {
                var messageData = messages[i]
                console.log('messagePer', messageData)

                sendAPI(senderID, messageData, typing, pageID, metadata).then(result => setTimeout(() => {
                    sendPer()
                }, 2000))
                    .catch(err => {
                        console.log('err', i, err)
                        reject(err)
                    })
            } else {
                console.log('done', i, messages.length)
                resolve(messages)
            }

        }

        sendPer()


    })

}

function flowAI({keyword, senderID, pageID}) {
    var keyword = vietnameseDecode(keyword)
    console.log("keyword", keyword)
    var flowList = _.filter(dataLadiBot, flow => {
        if (flow.flow.match(keyword)) return flow
    });
    console.log('flowList', flowList)
    if (flowList && flowList.length > 0) {

        var quick_replies = _.map(flowList, flow => {
            return {
                "content_type": "text",
                "title": flow.data[8] || '🤖',
                "payload": JSON.stringify({
                    state: 'setFlow',
                    flow: flow.flow
                })
            }
        });
        sendingAPI(senderID, pageID, {
            text: `Có phải bạn muốn ?`,
            quick_replies
        }, null, pageID)
    } else sendingAPI(senderID, pageID, {
        text: 'Chào bạn, Bạn cần giúp gì nhỉ?',
    }, null, pageID)
}


function submitResponse(pageID, senderID) {
    return new Promise(function (resolve, reject) {
        ladiResCol.findOne({
            senderID
        }).then(response => {
            if (response) {
                delete response._id
                delete response.flow
                delete response.page
                delete response.senderID
                delete response.start
                delete response.end
                var form = getBotfromPageID(pageID)
                console.log('submitResponse', form)
                if (form && form.id) {
                    var url = 'https://docs.google.com/forms/d/' + form.id + '/formResponse?'
                    var questions = form.data[1]
                    var each = _.each(questions, question => {
                        var questionId = question[0]
                        if (response[questionId] && response[questionId] != true) {
                            url = url + `entry.${question[4][0][0]}=${response[questionId]}&`
                        }
                    });

                    url = url + 'submit=Submit'
                    var url_encoded = encodeUrl(url)
                    console.log('url_encoded', url_encoded)
                    axios.get(url_encoded).then(result => resolve(result.data))
                        .catch(err => reject(err))

                } else reject({err: 'form.id not found'})


            } else reject({err: 'response not found'})
        })
    })

}

app.get('/submitResponse', function (req, res) {
    var {pageID, senderID} = req.query
    submitResponse(pageID, senderID)
        .then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})


function sendNotiUser(text = 'New User', user, pageID) {
    return new Promise(function (resolve, reject) {

        var message = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [
                        {
                            "title": text || '🤖',
                            "image_url": user.profile_pic,
                            "subtitle": `${user.full_name} \n Ref: ${user.ref} \n Gender: ${user.gender}`,
                            "buttons": [
                                {
                                    "type": "web_url",
                                    "url": `https://fb.com${user.link}`,
                                    "title": "Go to chat"
                                }, {
                                    "type": "web_url",
                                    "title": "View Dashboard",
                                    "url": `https://app.botform.asia/bot?page=${pageID}`,
                                }, {
                                    "type": "postback",
                                    "title": "Mute bot 1 day",
                                    "payload": JSON.stringify({
                                        subID: user.id
                                    }),
                                }

                            ]
                        }
                    ]
                }
            }
        }
        sendNotiSub(message, pageID)
            .then(result => resolve({message, pageID})
                .catch(err => reject(err)))
    })

}

function sendNotiSub(message = {text: 'New Subscribe'}, pageID, subscribe = 'all') {
    return new Promise(function (resolve, reject) {
        var list = _.where(dataAccount, {pageID, subscribe})
        console.log('sendDone', list.length)
        if (list.length > 0) list.forEach(account => {
            sendAPI(account.id, message, null, pageID)
        })
        resolve({list, message, pageID})
    })

}


function matchingPeople(senderID) {
    var pageID = '493938347612411';

    var senderData = dataAccount[senderID]

    var avaible = _.filter(dataAccount, function (card) {
        if (card.pageID == '493938347612411' && !card.match && !card.sent_error && card.status != 0 && card.gender != senderData.gender && card.id != facebookPage['493938347612411'].id) return true
        else return false
    })
    console.log('avaible.length', avaible.length)
    if (avaible.length > 0) {
        var random = _.sample(avaible)
        var matched = random.id
        console.log('matched', matched)

        sendAPI(matched, {
            text: `[Hệ Thống] Bạn đã được ghép với 1 người lạ ở Dumpling_${senderData.topic}, hãy nói gì đó đề bắt đầu`,
        }, null, '493938347612411')
            .then(result => saveSenderData({match: matched}, senderID, '493938347612411')
                .then(result => saveSenderData({match: senderID}, matched, '493938347612411')
                    .then(result => sendAPI(senderID, {
                        text: `[Hệ Thống] Đã ghép bạn với 1 người lạ ở 493938347612411_${random.topic} thành công`,
                    }, null, '493938347612411'))
                    .then(result => sendAPI(senderID, {
                        text: "Chúc 2 bạn có những giây phút trò chuyện vui vẻ trên Dumpling ^^",
                    }, null, '493938347612411'))
                    .then(result => checkAvaible(senderID))))
            .catch(err => {
                matchingPeople(senderID)
                console.log(err)
                saveSenderData({sent_error: true}, matched, '493938347612411')
            })

    } else sendingAPI(senderID, facebookPage['493938347612411'].id, {
        text: "[Hệ Thống] Chưa tìm đc người phù hợp",
    }, null, '493938347612411')


}

function checkAvaible(senderID) {


    var senderData = dataAccount[senderID]
    var current_matched = senderData.match
    var s60 = Date.now() - 5 * 60000
    var s30 = Date.now() - 30000
    setTimeout(function () {
        dumpling_messageFactoryCol.find({
            recipientId: current_matched,
            senderId: senderID,
            timestamp: {$gt: s30}
        }).toArray((err, conver) => {
            console.log('push people hihi', err, conver)
            if (conver.length == 0) {
                console.log('push people')

                sendingAPI(senderID, facebookPage['dumpling'].id, {
                    text: "[Hệ Thống] Bạn đã chủ động tìm người lạ, hãy mở lời chào với họ trước^^",
                }, null, 'dumpling')

            }
        })

    }, 30000)

    setTimeout(function () {

        dumpling_messageFactoryCol.find({
            recipientId: senderID,
            senderId: current_matched,
            timestamp: {$gt: s60}
        }).toArray((err, conver) => {
            if (err) return
            if (conver.length == 0) {
                console.log('change people')
                accountRef.child(senderID).child('match').remove()
                    .then(result => accountRef.child(senderData.match).child('match').remove())
                    .then(result => sendingAPI(senderData.match, facebookPage['dumpling'].id, {
                        text: "[Hệ Thống] Người lạ đã dừng cuộc trò chuyện",
                        quick_replies: [
                            {
                                "content_type": "text",
                                "title": "💬 Bắt đầu mới",
                                "payload": JSON.stringify({
                                    type: 'matching'
                                })
                            }
                        ]
                    }, null, 'dumpling'))
                    .then(result => sendingAPI(senderID, facebookPage['dumpling'].id, {
                        text: "[Hệ Thống] Không có phản hồi từ người lạ, hệ thống đã dừng cuộc trò chuyện",
                        quick_replies: [
                            {
                                "content_type": "text",
                                "title": "💬 Bắt đầu mới",
                                "payload": JSON.stringify({
                                    type: 'matching'
                                })
                            }
                        ]
                    }, null, 'dumpling'))


            }
        })
    }, 5 * 60000)

}


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

function receivedMessageRead(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    // All messages before watermark (a timestamp) or sequence have been seen.
    console.log("receivedMessageRead.", senderID, recipientID);
}

function receivedAccountLink(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var status = event.account_linking.status;
    var authCode = event.account_linking.authorization_code;

    console.log("Received account link event with for user %d with status %s " +
        "and auth code %s ", senderID, status, authCode);
}

function sendTextMessage(recipientId, messageText, metadata) {
    return new Promise(function (resolve, reject) {
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                text: messageText
            }
        };
        if (metadata) {
            messageData.message.metadata = metadata
        }

        callSendAPI(messageData).then(result => resolve(result))
            .catch(err => reject(err))
    })

}

function sendingAPI(recipientId, senderId = facebookPage['jobo'].id, message, typing, page = 'jobo') {
    return new Promise(function (resolve, reject) {

        sendAPI(recipientId, message, typing, page).then(messageData => {
            messageData.recipientId = recipientId
            messageData.senderId = senderId
            messageData.type = 'sent'
            messageData.timestamp = Date.now()

            dumpling_messageFactoryCol
                .insert(messageData)
                .then(result => {
                    saveSenderData({lastSent: messageData}, recipientId, page)
                    resolve(result)
                })
                .catch(err => reject(err))
        })
    })
}


function sendjson_plugin_url(senderID, messages, typing, pageID, go_to_block, set_attributes) {
    if (set_attributes) {
        var dataCustom = dataAccount[senderID].custom || {}
        dataCustom = Object.assign(dataCustom, set_attributes)
        saveData('account', senderID, {custom: dataCustom}).then(result => console.log('set_attributes', result))
    }

    if (messages) {
        messages = messages.map(chatfuelMes => chatFuelToBoform(chatfuelMes, senderID))
        console.log('sendjson_plugin_url', JSON.stringify(messages))
        sendMessages(senderID, messages, typing, pageID)
    } else if (go_to_block) {
        var flow = getBotfromPageID(pageID).data
        var questions = flow[1];
        for (var i in questions) {
            var quest = questions[i]
            console.log(vietnameseDecode(go_to_block), vietnameseDecode(quest[1]))
            if (vietnameseDecode(go_to_block) == vietnameseDecode(quest[1])) {
                go(quest[0], null, flow, senderID, pageID)
                break
            }
        }
    }
}

function chatFuelToBoform(chatfuelMes, senderID) {
    if (chatfuelMes.attachment && chatfuelMes.attachment.payload) {
        if (chatfuelMes.attachment.payload.elements) chatfuelMes.attachment.payload.elements = chatfuelMes.attachment.payload.elements.map(ele => chatfuelEle(ele, senderID))
        if (chatfuelMes.attachment.payload.buttons) chatfuelMes.attachment.payload.buttons = chatfuelMes.attachment.payload.buttons.map(button => chatfuelBut(button, senderID))
    }

    if (chatfuelMes.quick_replies) chatfuelMes.quick_replies = chatfuelMes.quick_replies.map(button => chatfuelQuick(button, senderID))


    console.log('chatFuelToBoform,', JSON.stringify(chatfuelMes))

    return chatfuelMes
}

function chatfuelEle(ele, senderID) {
    if (ele.buttons) {
        ele.buttons = ele.buttons.map(but => chatfuelBut(but, senderID))
    }
    console.log('chatfuelEle,', JSON.stringify(ele))

    return ele
}

function chatfuelBut(buttons = {
    "title": "Not really...",
    "url": "https://rockets.chatfuel.com/api/sad-match",
    "type": "json_plugin_url"
}) {

    var payloadObj = {}
    if (buttons && buttons.type == 'json_plugin_url') payloadObj = {json_plugin_url: buttons.url}
    else if (buttons && buttons.block_names) payloadObj = {block_names: buttons.block_names}

    if (buttons.set_attributes) payloadObj.set_attributes = buttons.set_attributes

    if (Object.keys(payloadObj).length > 0) var newbuttons = {
        type: 'postback',
        payload: JSON.stringify(payloadObj),
        title: buttons.title
    }
    else newbuttons = buttons


    console.log('chatfuelBut_newbuttons', newbuttons)

    return newbuttons
}

function chatfuelQuick(buttons = {
    "title": "Not really...",
    "url": "https://rockets.chatfuel.com/api/sad-match",
    "type": "json_plugin_url"
}) {

    var payloadObj = {}
    if (buttons && buttons.type == 'json_plugin_url') payloadObj = {json_plugin_url: buttons.url}
    else if (buttons && buttons.block_names) payloadObj = {block_names: buttons.block_names}

    if (buttons.set_attributes) payloadObj.set_attributes = buttons.set_attributes

    if (Object.keys(payloadObj).length > 0) var newbuttons = {
        content_type: 'text',
        payload: JSON.stringify(payloadObj),
        title: buttons.title
    }
    else newbuttons = buttons

    console.log('chatfuelQuick_newbuttons', newbuttons)

    return newbuttons
}


process.on('exit', function (err) {
    sendLog('exit ' + err)
});

process.on('uncaughtException', function (err) {
    sendLog('uncaughtException ' + err)
});

function sendLog(text) {
    console.log(text)
    var page = '233214007218284'
    var messageData = {message: {text}, recipient: {id: '1980317535315791'}}
    if (facebookPage[page] && facebookPage[page].access_token) request({
        uri: 'https://graph.facebook.com/v2.12/me/messages',
        qs: {access_token: facebookPage[page].access_token},
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;
            if (messageId) {
                console.log("callSendAPI_success", messageId, recipientId);
            }
        } else {
            console.log("sendLog_err", body);

        }
    });

}

function viewResponse(query) {
    return new Promise(function (resolve, reject) {
        console.log('query', query)
        var dataFilter = _.filter(dataAccount, account => {

            if (
                (account.pageID == query.page || !query.page)
                && ((account.full_name && account.full_name.toLocaleLowerCase().match(query.full_name)) || !query.full_name)
                && ((account.ref && account.ref.match(query.ref)) || !query.ref)
                && ((account.gender && account.gender.match(query.gender)) || !query.gender)
                && ((account.locale && account.locale.match(query.locale)) || !query.locale)
                && ((account.createdAt && account.createdAt > new Date(query.createdAt_from).getTime()) || !query.createdAt_from)
                && ((account.createdAt && account.createdAt < new Date(query.createdAt_to).getTime()) || !query.createdAt_to)
                && ((account.lastActive && account.lastActive > new Date(query.lastActive_from).getTime()) || !query.lastActive_from)
                && ((account.lastActive && account.lastActive < new Date(query.lastActive_to).getTime()) || !query.lastActive_to)
            ) return true
            else return false

        });
        var data = _.sortBy(dataFilter, function (data) {
            if (data.lastActive) {
                return -data.lastActive
            } else return 0
        })
        var count = _.countBy(data, function (num) {
            if (num.sent_error) return 'sent_error'
        });
        count.total = data.length

        resolve({count, data})
    })
}

app.get('/viewResponse', ({query}, res) => viewResponse(query).then(result => res.send(result)).catch(err => res.status(500).json(err)))


function sendBroadCast(query, blockName) {
    return new Promise(function (resolve, reject) {

        var pageID = query.page;
        var broadCast = {query, blockName, createdAt: Date.now(), id: Date.now()}
        saveData('broadcast', broadCast.id, broadCast)
        buildMessage(blockName, pageID)
            .then(messages => viewResponse(query)
                .then(result => {
                    var users = result.data
                    var i = -1
                    var success = 0
                    var log = []

                    function sendPer() {
                        i++
                        if (i < users.length) {
                            var obj = users[i]
                            sendMessages(obj.id, messages, null, pageID).then(result => setTimeout(() => {
                                success++
                                log.push({success: obj.id})
                                sendPer()
                            }, 1000))
                                .catch(err => {
                                    log.push({err})
                                    sendPer()
                                })
                        } else {
                            console.log('sendBroadCast_done', i, users.length)
                            broadCast.total = users.length
                            broadCast.sent = success
                            saveData('broadcast', broadCast.id, broadCast)
                                .then(result => resolve(broadCast))
                                .catch(err => reject(err))
                        }

                    }

                    sendPer()
                }))
    })

}

app.get('/sendBroadCast', ({query}, res) => sendBroadCast(query, query.blockName).then(result => res.send(result)).catch(err => res.status(500).json(err)))

function getBotfromPageID(pageID) {
    if (!pageID) return null
    if (facebookPage[pageID].currentBot) var result = _.findWhere(dataLadiBot, {id: facebookPage[pageID].currentBot});
    else result = _.findWhere(dataLadiBot, {page: pageID});
    if (result) return result;
}

function buildMessage(blockName, pageID) {
    return new Promise(function (resolve, reject) {
        var flow = getBotfromPageID(pageID).data
        var allMessages = []
        var questions = flow[1]

        for (var i in questions) {
            var quest = questions[i]
            if (vietnameseDecode(blockName) == vietnameseDecode(quest[1])) {
                loopMes(i, flow, pageID)
                break
            }
        }

        function loopMes(q, flow, pageID) {
            if (q < questions.length) {

                var currentQuestion = questions[q];
                console.log('current', currentQuestion);

                if (currentQuestion[4] && currentQuestion[1] && currentQuestion[1].match('locale')) {
                    var askOption = currentQuestion[4][0][1];
                    var lang = senderData.locale.substring(0, 2)
                    var choose = askOption[0]
                    for (var i in askOption) {
                        var option = askOption[i]
                        if (option[0].match(lang)) {
                            choose = option
                            break
                        }
                    }

                    var index = _.findLastIndex(questions, {
                        0: choose[2]
                    });
                    index++
                    loopMes(index, flow, pageID)

                } else if (currentQuestion[3] == 8) {
                    var goto = currentQuestion[5];

                    if (goto == '-3') {
                        resolve(allMessages)
                    }
                    else if (goto == '-2') {

                        q++
                        loopMes(q, flow, pageID)

                    }
                    else if (!goto) {

                        q++
                        loopMes(q, flow, pageID)

                    } else {
                        var index = _.findLastIndex(questions, {
                            0: goto
                        });
                        index++
                        loopMes(index, flow, pageID)
                    }

                } else {
                    var currentQuestionId = currentQuestion[0];
                    var messageSend = {
                        text: currentQuestion[1],
                    }
                    var metadata = {}
                    var askStringStr = `0,1,7,9,10,13`;
                    var askOptionStr = `2,3,4,5`;
                    var askType = currentQuestion[3];
                    console.log('askType', askType);
                    if (currentQuestion[4]) {
                        metadata.askType = askType;
                        metadata.type = 'ask';

                        if (askOptionStr.match(askType)) {
                            var askOption = currentQuestion[4][0][1];
                            var check = askOption[0][0]
                            if (check.match('&&')) {
                                var messageSend = {
                                    "attachment": {
                                        "type": "template",
                                        "payload": {
                                            "template_type": "generic",
                                            "elements": []
                                        }
                                    }
                                }
                                var generic = []

                                var map = _.map(askOption, option => {

                                    var eleArray = option[0].split('&&')
                                    var image_url = ''
                                    if (option[5] && option[5][0]) image_url = flow[20][option[5][0]]

                                    if (option[2]) metadata.goto = option[2]
                                    if (generic.length < 10) generic.push({
                                        "title": eleArray[0] || option[0] || '🤖',
                                        "image_url": image_url,
                                        "subtitle": eleArray[1],
                                        "buttons": [
                                            {
                                                "type": "postback",
                                                "title": eleArray[2] || 'Choose',
                                                "payload": JSON.stringify(metadata)
                                            }
                                        ]
                                    });
                                    else console.log('generic.length', generic.length)
                                });
                                messageSend.attachment.payload.elements = generic;

                                allMessages.push({text: currentQuestion[1]})
                                allMessages.push(messageSend)
                            }
                            else if (askType == 3) {
                                console.log('askOption[0][2]', askOption[0][2])
                                var array_mes = []
                                var buttons = []
                                var each = _.each(askOption, option => {
                                    metadata.text = option[0]
                                    if (option[2]) metadata.goto = option[2]
                                    if (option[4] == 1) metadata.other = option[2]

                                    var str = option[0]

                                    if (str.indexOf("[") != -1 && str.indexOf("]") != -1) {
                                        var n = str.indexOf("[") + 1;
                                        var b = str.indexOf("]");
                                        var sub = str.substr(n, b - n)
                                        var tit = str.substr(0, n - 2)
                                        var expression = "/((([A-Za-z]{3,9}:(?:\\/\\/)?)(?:[\\-;:&=\\+\\$,\\w]+@)?[A-Za-z0-9\\.\\-]+|(?:www\\.|[\\-;:&=\\+\\$,\\w]+@)[A-Za-z0-9\\.\\-]+)((?:\\/[\\+~%\\/\\.\\w\\-_]*)?\\??(?:[\\-\\+=&;%@\\.\\w_]*)#?(?:[\\.\\!\\/\\\\\\w]*))?)/\n";
                                        var regex = 'http';
                                        if (sub.match(regex)) var button = {
                                            type: "web_url",
                                            url: sub,
                                            title: tit,
                                            messenger_extensions: true
                                        }
                                        else button = {
                                            type: "phone_number",
                                            title: tit,
                                            payload: sub
                                        }

                                    } else if (option[0]) button = {
                                        type: "postback",
                                        title: option[0],
                                        payload: JSON.stringify(metadata)
                                    }
                                    if (button) buttons.push(button)

                                });
                                console.log('buttons', buttons)
                                var length = buttons.length
                                console.log('length', length)

                                // var max = 0
                                // for (var i = 1; i <= length / 3; i++) {
                                //     console.log('i', i, length / 3)
                                //     var max = i
                                //     var messageSend = {
                                //         attachment: {
                                //             type: "template",
                                //             payload: {
                                //                 template_type: "button",
                                //                 text: '---',
                                //                 buttons: [buttons[3 * i - 3], buttons[3 * i - 2], buttons[3 * i - 1]]
                                //             }
                                //         }
                                //     }
                                //     if (i == 1) messageSend.attachment.payload.text = currentQuestion[1]
                                //
                                //     array_mes.push(messageSend)
                                // }
                                // if (length % 3 != 0) {
                                //     var rest = _.rest(buttons, 3 * max)
                                //
                                //     console.log('rest', rest)
                                //
                                //     messageSend = {
                                //         attachment: {
                                //             type: "template",
                                //             payload: {
                                //                 template_type: "button",
                                //                 text: '---',
                                //                 buttons: rest
                                //             }
                                //         }
                                //     }
                                //
                                //     if (length < 3) messageSend.attachment.payload.text = currentQuestion[1]
                                //     array_mes.push(messageSend)
                                //
                                // }

                                if (length > 3) {

                                    var messageSend = {
                                        attachment: {
                                            type: "template",
                                            payload: {
                                                template_type: "button",
                                                text: currentQuestion[1],
                                                buttons: [buttons[0], buttons[1], buttons[2]]
                                            }
                                        }
                                    }


                                    var rest = _.rest(buttons, 3)
                                    var mapQuick = rest.map(but => {
                                        but.content_type = "text"
                                        delete but.type
                                        return but
                                    })
                                    messageSend.quick_replies = mapQuick


                                } else {
                                    messageSend = {
                                        attachment: {
                                            type: "template",
                                            payload: {
                                                template_type: "button",
                                                text: currentQuestion[1],
                                                buttons: buttons
                                            }
                                        }
                                    }

                                }

                                array_mes.push(messageSend)

                                allMessages = allMessages.concat(array_mes)


                            } else {
                                var quick_replies = []
                                var map = _.map(askOption, option => {
                                    metadata.text = option[0]
                                    if (option[2]) metadata.goto = option[2]
                                    if (option[4] == 1) {
                                        metadata.other = option[2]
                                        console.log('metadata', metadata)
                                    }

                                    var quick = {
                                        "content_type": "text",
                                        "title": option[0] || '🤖',
                                        "payload": JSON.stringify(metadata)

                                    }
                                    if (option[5] && option[5][0]) quick.image_url = flow[20][option[5][0]]

                                    if (quick_replies.length < 11) quick_replies.push(quick)
                                    else console.log('quick_replies.length', quick_replies.length)
                                });

                                messageSend.quick_replies = quick_replies
                                allMessages.push(messageSend)

                            }


                        } else if (askStringStr.match(askType)) {

                            allMessages.push(messageSend)

                        }

                        resolve(allMessages)

                    }
                    else {
                        metadata.type = 'info'

                        q++

                        if (askType == 11 && flow[20]) {
                            allMessages.push(senderID, {
                                attachment: {
                                    type: "image",
                                    payload: {
                                        url: flow[20][currentQuestion[6][0]]
                                    }
                                }
                            })
                            loopMes(q, flow, senderID, pageID)

                        }
                        else if (askType == 12 && currentQuestion[6][3]) {
                            allMessages.push({
                                text: `https://www.youtube.com/watch?v=${currentQuestion[6][3]}`
                            })
                            loopMes(q, flow, pageID)
                        }
                        else if (askType == 6) {
                            if (currentQuestion[1].match('pdf')) {
                                allMessages.push({
                                    attachment: {
                                        type: "file",
                                        payload: {
                                            url: currentQuestion[1]
                                        }
                                    }
                                });
                                loopMes(q, flow, senderID, pageID)
                            }
                            else if (currentQuestion[1].match('JSON')) {
                                var url = currentQuestion[2]
                                console.log('url ', url)
                                axios.get(url).then(result => {
                                    var messages = result.data
                                    allMessages = allMessages.concat(messages)
                                    resolve(allMessages)
                                })
                            }
                            else if (currentQuestion[2] && currentQuestion[2].toLowerCase() == 'notification') {
                                console.log('setNoti')
                                loopMes(q, flow, pageID)
                            }
                            else if (currentQuestion[2] && currentQuestion[2].match('<>')) {
                                console.log('random', currentQuestion[2])
                                var array = currentQuestion[2].split('<>');
                                array.push(currentQuestion[1]);
                                var pick = _.sample(array);
                                messageSend.text = pick
                                allMessages.push(messageSend)
                                loopMes(q, flow, pageID)

                            } else {
                                var messages = [{text: currentQuestion[1]}]
                                if (currentQuestion[2]) {
                                    messages.push({text: currentQuestion[2]})
                                }
                                allMessages = allMessages.concat(messages)
                                loopMes(q, flow, pageID)
                            }

                        }

                    }


                }


            } else resolve(allMessages)

        }


    })

}

app.get('/buildMessage', ({query: {pageID, blockName}}, res) => buildMessage(blockName, pageID).then(result => res.send(result)));


function sendBroadCasting(query, blockName) {
    var pageID = query.page


    var name_of_label = JSON.stringify(query)

    viewResponse(query)
        .then(results => Broadcast.Creating_a_Label(pageID, name_of_label)
            .then(({id}) => {
                var custom_label_id = id
                var promises = results.map(function (obj) {
                    return Broadcast.Associating_a_Label_to_a_PSID(custom_label_id, obj.id, pageID)
                        .then(results => {
                            return results
                        })
                        .catch(err => {
                            return err
                        })
                });

                Promise.all(promises)
                    .then(results => buildMessage(blockName, pageID)
                        .then(messages => Broadcast.Creating_a_Broadcast_Message(messages)
                            .then(({message_creative_id}) =>
                                Broadcast.Sending_a_Message_with_a_Label(message_creative_id, custom_label_id)
                            )
                        )
                    )

            }))
}


app.get('/Starting_a_Reach_Estimation', ({query: {pageID, custom_label_id}}, res) => Broadcast.Starting_a_Reach_Estimation(pageID, custom_label_id).then(result => res.send(result)))
app.get('/Messaging_Feature_Review', ({query: {pageID}}, res) => Broadcast.Messaging_Feature_Review(pageID).then(result => res.send(result)))


///// Jobo


function jobJD(job) {
    var storeName = '', address = '', jobName = '', salary = '', hourly_wages = '', working_type = '', work_time = '',
        figure = '', unit = '', experience = '', sex = '', description = '';

    if (job.storeName) storeName = job.storeName
    if (job.address) address = job.address
    if (job.jobName) jobName = job.jobName

    if (job.salary) salary = `🏆Lương: ${job.salary} triệu/tháng\n`;
    if (job.hourly_wages) hourly_wages = `🏆Lương theo giờ: ${job.hourly_wages} k/h + thưởng hấp dẫn\n`
    let timeStr = '';
    if (job.work_time) {
        if (job.work_time.length > 1) {
            timeStr = '🕐Ca làm:\n';
            job.work_time.forEach(t => timeStr += `- ${t.start} giờ đến ${t.end} giờ\n`);
        } else timeStr = `🕐Ca làm: ${job.work_time[0].start} giờ - ${job.work_time[0].end} giờ`;
    } else if (job.working_type) working_type = `🏆Hình thức làm việc: ${job.working_type}\n`;


    if (job.description) description = `🏆Mô tả công việc: ${job.description}\n`;
    if (job.unit) unit = `🏆Số lượng cần tuyển: ${job.unit} ứng viên\n`;
    if (job.experience) experience = `🏆Yêu cầu kinh nghiệm\n`;
    else experience = '🏆Không cần kinh nghiệm\n';
    if (job.sex === 'female') sex = `🏆Giới tính: Nữ\n`;
    else if (job.sex === 'male') sex = `🏆Giới tính: Nam\n`;
    if (job.figure) figure = '🏆Yêu cầu ngoại hình\n';

    const text = `🏠${storeName} - ${shortAddress(address)}👩‍💻👨‍💻\n 🛄Vị trí của bạn sẽ là: ${jobName}\n
${working_type}${salary}${hourly_wages}${timeStr}\n${experience}${sex}${unit}${figure}\n`
    return text;
}

function getUserDataAndSave(senderID) {
    return new Promise(function (resolve, reject) {
        console.log('get Profile');

        graph.get(senderID, (err, result) => {
            if (err) reject(err);

            console.log(result);
            var user = {
                name: result.first_name + ' ' + result.last_name,
                messengerId: senderID,
                createdAt: Date.now(),
                platform: 'messenger',

            };
            var profile = {
                name: user.name,
                avatar: user.profile_pic,
                sex: user.gender,
                updatedAt: Date.now(),
            };

            axios.post(CONFIG.APIURL + '/update/user?userId=' + senderID, {user, profile})
                .then(result => resolve(user))
                .catch(err => reject(err))
        })
    })

}

function referInital(referral, senderID, user) {

    console.log('user', user);

    if (referral && referral.ref) {
        axios.post(CONFIG.APIURL + '/update/user?userId=' + senderID, {user: {ref: referral.ref}})

        var refstr = referral.ref;
        var refData = refstr.split('_');
        console.log('refData', refData);
        if (refData[0] != 'start' && refData[0] != 'tuyendung') {
            var jobId = refData[0]
            loadJob(jobId).then(jobData => sendAPI(senderID, {
                text: `Có phải bạn đang muốn ứng tuyển vào vị trí ${jobData.jobName} của ${jobData.storeData.storeName} ?`,
                metadata: JSON.stringify({
                    type: 'confirmJob',
                }),
                quick_replies: [
                    {
                        "content_type": "text",
                        "title": "Đúng rồi (Y)",
                        "payload": JSON.stringify({
                            type: 'confirmJob',
                            answer: 'yes',
                            jobId: jobId
                        })
                    },
                    {
                        "content_type": "text",
                        "title": "Không phải",
                        "payload": JSON.stringify({
                            type: 'confirmJob',
                            answer: 'no',
                            jobId: jobId
                        })
                    },
                ]
            })).catch(err => sendTextMessage(senderID, JSON.stringify(err)))
        }
        else if (refData[0] == 'tuyendung') sendAPI(senderID, {
            text: `Chào bạn, có phải bạn đang cần tuyển nhân viên không ạ?`,
            quick_replies: [
                {
                    "content_type": "text",
                    "title": "Đúng vậy",
                    "payload": JSON.stringify({
                        type: 'confirmEmployer',
                        answer: 'yes',
                    })
                },
                {
                    "content_type": "text",
                    "title": "Không phải",
                    "payload": JSON.stringify({
                        type: 'confirmEmployer',
                        answer: 'no',
                    })
                },
            ],
            metadata: JSON.stringify({
                type: 'confirmEmployer',
            })
        })
        else {

            if (refData[1] == 'tailieunhansu') {
                sendAPI(senderID, {
                    text: `Jobo xin gửi link tài liệu " Toàn bộ quy trình liên quan đến lương,thưởng và quản lý nhân sự "`,
                }).then(() => {
                    sendAPI(senderID, {
                        text: `Mình đang tải tài liệu lên, bạn chờ một chút nhé... "`,
                    }).then(() => {
                        sendAPI(senderID, {
                            attachment: {
                                type: "file",
                                payload: {
                                    url: "https://jobo.asia/file/NhanSu.zip"
                                }
                            }
                        })
                    })
                })
            }

            else if (refData[1] == 'account')
                sendAPI(senderID, {
                    text: 'Hãy gửi số điện thoại của bạn',
                    metadata: JSON.stringify({
                        type: 'askPhone'
                    })
                })

            else sendAPI(senderID, {
                    text: `Có phải bạn đang muốn tham gia Jobo để tìm việc làm thêm?`,
                    quick_replies: [
                        {
                            "content_type": "text",
                            "title": "Đúng vậy",
                            "payload": JSON.stringify({
                                type: 'confirmJobSeeker',
                                answer: 'yes',
                            })
                        },
                        {
                            "content_type": "text",
                            "title": "Không phải",
                            "payload": JSON.stringify({
                                type: 'confirmJobSeeker',
                                answer: 'no',
                            })
                        },
                    ],
                    metadata: JSON.stringify({
                        type: 'confirmJobSeeker',
                    })
                })
        }


    } else sendAPI(senderID, {
        text: `Chào ${user.name}, Jobo có thể giúp gì cho bạn nhỉ?`,
        metadata: JSON.stringify({
            type: 'welcome',
            case: 'GET_STARTED'
        }),
        quick_replies: [
            {
                "content_type": "text",
                "title": "Tôi muốn tìm việc",
                "payload": JSON.stringify({
                    type: 'confirmJobSeeker',
                    answer: 'yes',
                })
            },
            {
                "content_type": "text",
                "title": "Tôi muốn tuyển dụng",
                "payload": JSON.stringify({
                    type: 'confirmEmployer',
                    answer: 'yes',
                })
            }
        ]
    })


}

function sendListJobByAddress(location, address, senderID, user) {
    var data = {
        lat: location.lat,
        lng: location.lng,
        page: 1,
        distance: 10,
        per_page: 4,
        type: 'premium'
    };

    var url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${data.lat},${data.lng}`
    axios.get(url).then(result => {
        if (!address) {
            if (result.data.results[0]) {
                var results = result.data.results
                var address = results[0].formatted_address

            } else {
                address = ' '
            }
        }

        profileRef.child(senderID)
            .update({
                location: {
                    lat: data.lat,
                    lng: data.lng
                },
                address
            })
            .then(result => getJob(data))
            .then(result => {
                if (result.total > 0) sendAPI(senderID, {
                    text: `Mình tìm thấy ${result.total} công việc đang tuyển xung quanh địa chỉ ${shortAddress(address)} nè!`
                }).then(() => sendAPI(senderID, result.message, 3000))
                else sendAPI(senderID, {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "button",
                            text: "Tiếp theo, bạn hãy cập nhật thêm thông tin để ứng tuyển vào các công việc phù hợp!",
                            buttons: [{
                                type: "web_url",
                                url: `${CONFIG.WEBURL}/profile?admin=${user.userId}`,
                                title: "Cập nhật hồ sơ"
                            }]
                        }
                    }
                })
            })


            .catch(err => console.log(err))

    })
}

function sendDefautMessage(senderID) {
    sendAPI(senderID, {
        text: "Okie"
    })
}

function checkRequiment(senderID, user, jobId, status) {
    loadUser(senderID)
        .then(user => loadJob(jobId)
            .then(jobData => loadProfile(user.userId)
                .then(profile => {
                    if (!user.phone) sendAPI(senderID, {
                            text: 'Hãy gửi số điện thoại của bạn để mình liên lạc nhé',
                            metadata: JSON.stringify({
                                type: 'askPhone',
                                case: 'applyJob',
                                jobId,
                                status
                            })
                        }
                    )
                    else if (!user.confirmName) sendAPI(senderID, {
                        text: 'Cho mình họ tên đầy đủ của bạn? (VD: Lê Khánh Thông)',
                        metadata: JSON.stringify({
                            type: 'askName',
                            case: 'applyJob',
                            jobId,
                            status
                        })
                    })
                    else sendInterviewOption(jobData.jobId, senderID, status)
                })))


}

function loadUser(senderID) {
    return new Promise(function (resolve, reject) {

        var url = `${CONFIG.APIURL}/checkUser?q=${senderID}&type=messengerId`
        axios.get(url)
            .then(result => {
                if (result.data[0]) resolve(result.data[0])
                else getUserDataAndSave(senderID).then(user => resolve(user))
                    .catch(err => reject(err))
            })
            .catch(err => reject(err))
    })

}

function sendUpdateProfile(senderID, user, text = "Bạn hãy cập nhật thêm thông tin để ứng tuyển vào các công việc phù hợp!") {

    sendAPI(senderID, {
        attachment: {
            type: "template",
            payload: {
                template_type: "button",
                text,
                buttons: [{
                    type: "web_url",
                    url: `${CONFIG.WEBURL}/profile?admin=${user.userId}`,
                    title: "Cập nhật hồ sơ"
                }]
            }
        }
    })
}

function loadProfile(userId) {
    return new Promise(function (resolve, reject) {
        var url = `${CONFIG.APIURL}/on/profile?userId=${userId}`
        axios.get(url)
            .then(result => resolve(result.data))
            .catch(err => reject(err))
    })

}

function sendInterviewInfo(senderID, user) {
    return new Promise(function (resolve, reject) {
        sendAPI(senderID, {
            text: 'Lịch phỏng vấn của bạn'
        }).then(result => axios.get(CONFIG.APIURL + '/initData?userId=' + user.userId))
            .then(result => {
                var data = result.data
                var applys = data.reactList.match
                var profileData = data.userData
                if (applys.length > 0) {
                    applys.forEach(like => loadJob(like.jobId)
                        .then(jobData => sendAPI(senderID, {
                            attachment: {
                                type: "template",
                                payload: {
                                    template_type: "button",
                                    text: `* ${jobData.jobName} - ${jobData.storeData.storeName} \n ${strTime(like.interviewTime)}`,
                                    buttons: [{
                                        type: "web_url",
                                        url: `https://www.google.com/maps/dir/${(profileData.address) ? (profileData.address) : ''}/${(jobData.storeData.address) ? (jobData.storeData.address) : ('')}`,
                                        title: "Chỉ đường"
                                    }, {
                                        type: "phone_number",
                                        title: "Gọi cho nhà tuyển dụng",
                                        payload: jobData.userInfo.phone || '0968269860'
                                    }, {
                                        type: "postback",
                                        title: "Huỷ phỏng vấn",
                                        payload: JSON.stringify({
                                            type: 'cancelInterview',
                                            actId: like.actId,
                                        })
                                    }]
                                }
                            }
                        }))
                    )
                    resolve(data)
                } else sendAPI(senderID, {
                    text: 'Bạn chưa có lịch phỏng vấn!'
                })

            })
    })


}

function sendInterviewOption(jobId, senderID, status) {
    loadJob(jobId).then(result => {
        var jobData = result;
        var storeData = result.storeData
        jobData.storeName = storeData.storeName
        jobData.address = storeData.address

        var quick_replies = []
        if (status == 1) {
            console.log('storeData.interviewOption', storeData.interviewOption)
            if (storeData.interviewOption) {
                for (var i in storeData.interviewOption) {
                    var time = storeData.interviewOption[i]

                    var rep = {
                        "content_type": "text",
                        "title": strTime(time) || '🤖',
                        "payload": JSON.stringify({
                            type: 'setInterview',
                            time: time,
                            jobId
                        })
                    };
                    quick_replies.push(rep)
                }

            }


            sendAPI(senderID, {
                text: 'Bạn có thể tham gia phỏng vấn lúc nào?',
                quick_replies: quick_replies,
                metadata: JSON.stringify({
                    type: 'setInterview',
                })
            });


        } else {
            console.log('cập nhật hồ sơ')

            loadUser(senderID).then(user => sendAPI(senderID, {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "button",
                            text: 'Tiếp theo bạn hãy cập nhật hồ sơ để ứng tuyển nhé',
                            buttons: [{
                                type: "web_url",
                                url: `${CONFIG.WEBURL}/profile?admin=${user.userId}`,
                                title: "Cập nhật hồ sơ"
                            }]
                        }
                    }
                })
            )


        }

    });
}

function getJob(data) {
    return new Promise(function (resolve, reject) {
        var url = `${API_URL}/api/job`;

        axios.get(url, {
            params: data
        })
            .then(result => {

                var resultData = result.data;
                var jobData = resultData.data;
                console.log('resultData', resultData.total, resultData.newfilter);
                data.page++
                var message = {
                    "attachment": {
                        "type": "template",
                        "payload": {
                            "template_type": "list",
                            "top_element_style": "compact",
                            "elements": [],
                            "buttons": [
                                {
                                    "title": "Xem thêm",
                                    "type": "postback",
                                    "payload": JSON.stringify({
                                        type: 'viewMoreJob',
                                        data
                                    })
                                }
                            ]
                        }
                    }
                }
                for (var i in jobData) {
                    var job = jobData[i];
                    message.attachment.payload.elements.push({
                        "title": job.jobName,
                        "subtitle": `${job.storeName} cách ${job.distance} km`,
                        "image_url": job.avatar,
                        "buttons": [
                            {
                                "title": "Xem chi tiết",
                                "type": "postback",
                                "payload": JSON.stringify({
                                    type: 'confirmJob',
                                    answer: 'yes',
                                    jobId: job.jobId
                                })
                            }
                        ]
                    })
                }
                resultData.message = message
                resolve(resultData)

            }).catch(err => reject(err))
    })


}

function loadJob(jobId) {
    return new Promise(function (resolve, reject) {
        const url = `https://jobo-server.herokuapp.com/on/job?jobId=${jobId}`;
        axios.get(url)
            .then(result => {
                if (result.data.err) reject(result.data.err)
                resolve(result.data)
            })
            .catch(err => reject(err));
    })
}


function buildReport(pageID, day = 1, ago = 0) {
    return new Promise(function (resolve, reject) {
        axios.get("https://botform-webserver.herokuapp.com/buildReport", {params: {pageID, day, ago}})
            .then(result => resolve(result.data))
            .catch(err => reject(err))
    })
}

function copyFile(id, name) {
    return new Promise((resolve, reject) => {
        var params = {id, name: urlencode(name)}
        console.log('copyFile', params)

        axios.get('https://jobo-ana.herokuapp.com/copyFile', {params})
            .then(result => {
                console.log('result', result.data)

                resolve(result.data)
            })
            .catch(err => {
                console.log('err', err)
                reject(err)
            })
    })
}

app.get('/copyFile', ({query}, res) => copyFile(query.id, query.name)
    .then(result => res.send(result))
    .catch(err => res.status(500).json(err)))


function copyForms(formId, pageID, pageData) {
    return new Promise((resolve, reject) => {
            if (!formId) formId = '1DLurQuYAyKiE1AsaizDEoV9SD8-V4F7FVmS2k4_wloI'

            if (pageData.editId) resolve({id: pageData.editId})
            else if (pageData.currentBot) {
                var formData = _.findWhere(dataLadiBot, {id: pageData.currentBot})
                console.log('formData', formData)
                if (formData && formData.editId) resolve({id: formData.editId})
                else copyFile(formId, `${pageData.name} Chatbot`)
                    .then(result => saveData('facebookPage', pageID, {editId: result.id})
                        .then(() => resolve({id: result.id}))
                    ).catch(err => reject(err))
            }
            else copyFile(formId, `${pageData.name} Chatbot`)
                    .then(result => saveData('facebookPage', pageID, {editId: result.id})
                        .then(() => resolve({id: result.id}))
                    ).catch(err => reject(err))
        }
    )
}

function copySheets(sheetId, pageID, pageData) {
    return new Promise((resolve, reject) => {
        if (!sheetId) sheetId = '1Siux69lJLWnHUcR90AaCz6QBu6n_mkUk2pweQfcadbg'

        console.log('copySheets-ing', sheetId, pageID);

        if (pageData.sheetId) resolve({id: pageData.sheetId})
        else copyFile(sheetId, `${pageData.name} Database`)
            .then(result => saveData('facebookPage', pageID, {sheetId: result.id})
                .then(() => resolve({id: result.id}))
            ).catch(err => reject(err))
    })
}


app.listen(port, function () {
    console.log('Node app is running on port', port);
});


module.exports = app;
