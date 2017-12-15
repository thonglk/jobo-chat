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

const {Wit, log} = require('node-wit');

const client = new Wit({
    accessToken: 'CR6XEPRE2F3FLVWYJA6XFYJSVUO4SCN7',
    logger: new log.Logger(log.DEBUG) // optional
});

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

const WHITE_LIST = config.get('whiteListDomains')

var graph = require('fbgraph');
graph.setAccessToken(PAGE_ACCESS_TOKEN);


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
    },
    joboTest: {
        databaseURL: "https://jobotest-15784.firebaseio.com",
        cert: {
            "type": "service_account",
            "project_id": "jobotest-15784",
            "private_key_id": "5d321825529bbd6733efa48613bd0bb160c9094f",
            "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCuxO6gVlWNONma\nQ0hIlt/Nruej3nRGztllcGCDWXksHl1l6Ds8oN6vMVmOcYlzvoxGqXGjLbd/RQVh\nrXOLRGHngfZIX4ot3jlLZDIK3uzd9KEEoa3pCC0i2v2zw5WZEoWr0ZPibdBa6KJG\nh374GkPRJ6w3uEBUg3uWHpRbIGmWVEQ5803Jz9Vq5nz05yfdR9GNjMLo+1P6ozzU\nVsTY3ca0y0syg7IADrnyRQX2WbHmk9nrMYgVu7h1GhnzGjMbl+lsq4gWik8iDh/N\nJELhY/iXcoOCqdUM1cNmIf3UcqqOg8k6wolI4+jD+fX4PVoS/Ce8oT7u++DCFtAD\nBnfZyzc9AgMBAAECggEABHiENDTRLnIoWuJivHyjkALr6Qy9Q7xx4j7sMR/+Ugsa\nz4sPzN6+o5OrG1I7NmtG8l3OSuLWAVr2JsgFnyfqKz5vWu2avs6i/5M6Fn4aaBkk\nb1ZleQMdCHm6qLkVoBtRsRIE6vNtM44k7JH1xQoC9xxBMxGzD5ZneHEi0Wv0V4SY\ngX1eufCJBPqY0WON0yrModg3ZhDffR5TQUUmDvXSSyzpt2jpRecfPyJVqETk67db\nvrSjPgqbAuWd7x7ODIuLRwoWWjUnCEviN6F5LKFA5cH0alPFdA1egO19umUkuldm\nsGcudwGdalS6oTmgf5DsB/a2bs0BTR+iZSsjuOqToQKBgQDWoClvSYNhXlGsroNf\njkSLOr57i+RrfRFkAo5ntt17lsBV09MAv3mSkG8OxZpS+4Cvo5WTqJo9HJ3B8BXN\n77IfFrIGnSZwaBTRcU4gUsefFj5HS+KqhYAsd/Z6bHXIot0nUAnnKDtjOH1Ksu9Z\nOMxLFG7l08c+Yb2iWBQTeJCsjQKBgQDQddjM+Ee51Jls8kWrCHJk118nLWfoHC0V\nu1nCbpkbPyWe+CIesIbuFLXasjp+W36/YW7qoE7m2G2Oy2XxrXLVxojUkuPfHbL8\nbviZMED0fhiliIUUuDmjGde77BeWCAiCCF1W5QRh0lE7bPeeLeDTSJHgjF13OB85\n6e4OjeyBcQKBgQCSukQZdOSAuH6V02i09wodNTfsNqMeaQ5ulODOPtIEH/e1tW7X\nYA+5B00liCoM+Svs56TmoalwhhPD9mKxu2DGqDllFCKnTkCNPyzuJCmctRQ2ocaA\nVWxe+lRjNasAU3dl3O4oPfT7zC671sCS+qWP3pRCQxo/p4qBZj2zYgVmMQKBgGYC\nJRM4M7El7eY4MAtf2Mqr8a40M/KLRyypP2U7xcRlhD1kYx3teDms/MiGCsWmdEGm\npiY+SB4Crqn/smUvYVBnFLIhJ00ZNWr9yrz7te1ufxUR1z2qYNoFXWJiR7BtQeyP\nt008SIat6n5P9mP7Q1dg3bGqPlqGphEq/gk1PhShAoGAYaJ2O1a1XW0RUgUh/IrK\noqUjL1uSAva8rgcmZtX4XlgPcVvM7GfViPIr1Tj2yCZwEU7tmX0V1hMbkSYzJrnZ\nbjZWq6tpO5uUVGOW700a9fLmM0PXNNIQ8QOXP2zWRUKdbtcC3dUl0JG8E16EhSpT\nBovY0DfWj2mzjxmmA1R27vk=\n-----END PRIVATE KEY-----\n",
            "client_email": "firebase-adminsdk-qdjob@jobotest-15784.iam.gserviceaccount.com",
            "client_id": "117909799483746763246",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://accounts.google.com/o/oauth2/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-qdjob%40jobotest-15784.iam.gserviceaccount.com"
        }

    }
}
const vietnameseDecode = (str) => {
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
var joboTest = firebase.initializeApp({
    credential: firebase.credential.cert(FIRE_BASE_ADMIN['joboTest'].cert),
    databaseURL: FIRE_BASE_ADMIN['joboTest'].databaseURL
}, "joboTest");

var db = jobochat.database();
var db2 = jobo.database();
var db3 = joboTest.database();

var userRef = db2.ref('user');
var dataAccount = {}
db.ref('dumpling_account').on('child_added', snap => {
    dataAccount[snap.key] = snap.val()
})
db.ref('dumpling_account').on('child_changed', snap => {
    dataAccount[snap.key] = snap.val()
})

var landBotAccount = {}


var profileRef = db2.ref('profile');
var likeActivityRef = db3.ref('activity/like');

var conversationData, conversationRef = db.ref('conversation')
var lastMessageData = {}, lastMessageRef = db.ref('last_message')

var conversationData_new, conversationRef_new = db3.ref('conversation_temp')

var messageFactory = {}, messageFactoryRef = db.ref('messageFactory')
var quick_topic = []
var topic = {}
var a = 0
var facebookPage = {}, facebookPageRef = db.ref('facebookPage')
facebookPageRef.on('child_added', function (snap) {
    facebookPage[snap.key] = snap.val()
});
facebookPageRef.on('child_changed', function (snap) {
    facebookPage[snap.key] = snap.val()
});

function saveFacebookPage(data) {
    return new Promise(function (resolve, reject) {
        facebookPageRef.child(data.id).update(data)
            .then(result => resolve(result))
            .catch(err => reject(err))

    })
}


lastMessageRef.on('child_added', function (snap) {
    lastMessageData[snap.key] = snap.val()
});
lastMessageRef.on('child_changed', function (snap) {
    lastMessageData[snap.key] = snap.val()
});
var dataLadiBot = {}
db.ref('ladiBot').on('child_added', function (snap) {
    dataLadiBot[snap.key] = snap.val()
});
db.ref('ladiBot').on('child_changed', function (snap) {
    dataLadiBot[snap.key] = snap.val()
});
var vocalArray = [
    "utter",
    "without qualification",
    "No one can blame an honest mechanic for holding a wealthy snob in uttercontempt.Ingersoll, Robert Green",
    "conduct",
    "direct the course of; manage or control",
    "Scientists have been conducting studies of individual genes for years.",
    "engage",
    "consume all of one's attention or time",
    "We had nearly two hundred passengers, who were seated about on the sofas, reading, or playing games, or engaged in conversation.Field, Henry M. (Henry Martyn)",
    "obtain",
    "come into possession of",
    "He delayed making the unclassified report public while awaiting an Army review, but Rolling Stone magazine obtained the report and posted it Friday night.New York Times (Feb 11, 2012)",
    "scarce",
    "deficient in quantity or number compared with the demand",
    "Meanwhile, heating oil could grow more scarce in the Northeast this winter, the Energy Department warned last month.New York Times (Jan 21, 2012)",
    "policy",
    "a plan of action adopted by an individual or social group",
    "Inflation has lagged behind the central bank’s 2 percent target, givingpolicy makers extra scope to cut rates.",
    "straight",
    "successive, without a break",
    "After three straight losing seasons, Hoosiers fans were just hoping for a winning record.Seattle Times (Feb 15, 2012)",
    "stock",
    "capital raised by a corporation through the issue of shares",
    "In other words, Apple’s stock is cheap, and you should buy it.Forbes (Feb 16, 2012)",
    "apparent",
    "clearly revealed to the mind or the senses or judgment",
    "But the elderly creak is beginning to become apparent in McCartney’s voice.",
    "property",
    "a basic or essential attribute shared by members of a class",
    "Owing to these magic properties, it was often planted near dwellings to keep away evil spirits.Parsons, Mary Elizabeth",
    "fancy",
    "imagine; conceive of; see in one's mind",
    "For a time, indeed, he had fancied that things were changed.Weyman, Stanley J.",
    "concept",
    "an abstract or general idea inferred from specific instances",
    "As a psychologist, I have always found the concept of speed dating fascinating.Scientific American (Feb 13, 2012)",
    "court",
    "an assembly to conduct judicial business",
    "When Brown pleaded not guilty to assaulting Rihanna, their violent past came out in court.Slate (Feb 16, 2012)",
    "appoint",
    "assign a duty, responsibility or obligation to",
    "In 1863 he was appointed by the general assembly professor of oriental languages at New College.Various",
    "passage",
    "a section of text, particularly a section of medium length",
    "His interpretation of many obscure scriptural passages by means of native manners and customs and traditions is particularly helpful and informing.Sheets, Emily Churchill Thompson",
    "vain",
    "unproductive of success",
    "An attempt was made to ignore this brilliant and irregular book, but invain; it was read all over Europe.Various",
    "instance",
    "an occurrence of something",
    "In many instances large districts or towns would have fewer representatives than smaller ones, or perhaps none at all.Clarke, Helen Archibald",
    "coast",
    "the shore of a sea or ocean",
    "Martello towers must be built within short distances all round the coast.Wingfield, Lewis",
    "project",
    "a planned undertaking",
    "The funds are aimed at helping build public projects including mass transit, electricity networks, water utility and ports, it said.",
    "commission",
    "a special group delegated to consider some matter",
    "The developers are now seeking approval from the landmarkscommission.New York Times (Feb 16, 2012)",
    "constant",
    "a quantity that does not vary",
    "In 1929, Hubble independently put forward and confirmed the same idea, and the parameter later became known as the Hubble constant.Nature (Nov 15, 2011)",
    "circumstances",
    "one's overall condition in life",
    "The circumstances leading up to the shootings was not immediately available.",
    "constitute",
    "to compose or represent",
    "Oil and natural gas constituted almost 50 percent of Russian government revenue last year.",
    "level",
    "a relative position or degree of value in a graded group",
    "Only last month did the men’s and women’s unemployment rates reach the same level.New York Times (Feb 19, 2012)",
    "affect",
    "have an influence upon",
    "The central bank will start distributing low-interest loans in early March to individuals and small- and medium-sized companies affected by the flooding.",
    "institute",
    "set up or lay the groundwork for",
    "Corporations have to be more and more focused on instituting higher labor standards.Washington Post (Feb 7, 2012)",
    "render",
    "give an interpretation of",
    "But authorities had rendered the weapon and the explosive device inoperable, officials said.Chicago Tribune (Feb 17, 2012)",
    "appeal",
    "be attractive to",
    "To get traditional women’s accessories to appeal to men, some designers are giving them manly names and styles.New York Times (Feb 19, 2012)",
    "generate",
    "bring into existence",
    "Qualities such as these are not generated under bad working practices of any sort."
]
var vocalobject = []

for (var i = 0; i < vocalArray.length; i += 3) {
    var wordi = i
    var meani = i + 1
    var exi = i + 2
    vocalobject.push({
        word: vocalArray[wordi],
        meaning: vocalArray[meani],
        ex: vocalArray[exi]
    })
}

app.get('/sendNewWord', (req, res) => {
    sendNewWord()
        .then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

function sendNewWord() {
    return new Promise(function (resolve, reject) {
        var vocal = _.sample(vocalobject)
        console.log('push ', vocal)
        var mean = vocal.word + ' : ' + vocal.meaning + '\n Ex: ' + vocal.ex
        console.log('mean', mean)
        sendVocal(mean)
        resolve(mean)

    })

}


setInterval(function () {
    sendNewWord()
}, 60 * 60 * 1000)

function sendVocalRes(senderID) {
    sendingAPI(senderID, facebookPage['dumpling'].id, {

        attachment: {
            type: "template",
            payload: {
                template_type: "button",
                text: `[Hệ thống] Tính năng học từ vựng cùng Dumpling,
Cách 1h, Dumpling sẽ gửi 1 từ vựng tiếng anh có liên quan đến bạn ^^
VD: Dumpling(n) Bánh bao`,
                buttons: [{
                    type: "postback",
                    title: "Đăng ký tham gia",
                    payload: JSON.stringify({
                        type: 'dumpling_english'
                    })
                }]
            }
        }
    }, null, 'dumpling')
}

function sendVocal(vocal) {
    var a = 0
    console.log('start')

    var map = _.each(dataAccount, account => {
        if (!account.match && !account.vocal_off) {
            a++
            console.log('account', account.id)
            setTimeout(function () {
                sendingAPI(account.id, facebookPage['dumpling'].id, {
                    text: `[English] ${vocal}`
                }, null, 'dumpling')
            }, a * 200)
        }

    })
    return map
}


app.get('/quick_topic', function (req, res) {
    res.send(quick_topic)
})
app.get('/topic', function (req, res) {
    res.send(topic)
})

function getLongLiveToken(shortLiveToken) {
    console.log('getLongLiveToken-ing', shortLiveToken)

    return new Promise((resolve, reject) => {
        const url = `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=295208480879128&client_secret=4450decf6ea88c391f4100b5740792ae&fb_exchange_token=${shortLiveToken}`;
        axios.get(url)
            .then(res => {
                console.log('getLongLiveToken', res.data)
                resolve(res.data)
            })
            .catch(err => {
                reject(err.response);
            });
    });
}


app.get('/subscribed_apps', function (req, res) {
    var {pageID} = req.query
    subscribed_apps(facebookPage[pageID].access_token, pageID)
        .then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

function subscribed_apps(access_token, pageID) {
    return new Promise(function (resolve, reject) {
        console.log(access_token, pageID)
        graph.post(pageID + '/subscribed_apps', {access_token}, function (err, result) {
            console.log('subscribed_apps', err, result)
            if (err) reject(err)
            resolve(result)
        })

    })
}

app.get('/getchat', function (req, res) {
    var {url = 'https://docs.google.com/forms/d/e/1FAIpQLSchC5kv_FlJh0e1bfwv0TP4nrhe4E_dqW2mNQBQ5ErPOUz_rw/viewform', page, access_token, name, pageID} = req.query
    getChat(req.query).then(result => res.send(result))
        .catch(err => res.status(500).json(err))

})

function getChat({url, page, access_token, name, pageID}) {
    return new Promise(function (resolve, reject) {
        console.log('getChat-ing', url, page, access_token, name, pageID)

        var urlArray = url.split('/')
        var each = _.filter(urlArray, per => {
            if (per.length > 40) return true
        })
        if (each.length == 1) {
            var query = each[0]
            console.log('query', query)
            if (url.match('forms/d/e/')) {
                var queryURL = 'https://docs.google.com/forms/d/e/' + query + '/viewform'
            } else {
                var queryURL = 'https://docs.google.com/forms/d/' + query + '/edit'
            }

            axios.get(queryURL)
                .then(result => {
                    if (result.data.match('FB_PUBLIC_LOAD_DATA_ = ') || result.data.match('FB_LOAD_DATA_ = ')) {
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
                                if (str == 'FB_LOAD_DATA_ = ') {
                                    var data = array[0][1]

                                } else {
                                    var data = array[1]
                                }
                                console.log('data', data)

                                var id = array[14]
                                var save = {
                                    id, data
                                }

                                if (dataLadiBot[id] && dataLadiBot[id].flow) {
                                    save.flow = dataLadiBot[id].flow
                                } else {
                                    save.flow = vietnameseDecode(data[8] || 'untitled')
                                }

                                console.log('Get form', save.id)

                                if (access_token && name && pageID) {
                                    page = pageID

                                    getLongLiveToken(access_token).then(data => {
                                        var new_access_token = data.access_token
                                        var pageData = {
                                            access_token: new_access_token, name, id: pageID
                                        };
                                        subscribed_apps(new_access_token, pageID)
                                            .then(result => saveFacebookPage(pageData)
                                                .then(result => {
                                                    facebookPage[page] = pageData
                                                    save.page = `${facebookPage[page].id}`;

                                                    var flowList = _.where(dataLadiBot, {page: facebookPage[page].id})
                                                    console.log(flowList);

                                                    flowList.push(save);

                                                    var call_to_actions = []

                                                    var each = _.each(flowList, fl => {
                                                        if (call_to_actions.length < 4) {
                                                            if (fl.data[8].length > 30) var title = fl.data[8].slice(0, 29)
                                                            else title = fl.data[8]
                                                            call_to_actions.push({
                                                                title,
                                                                "type": "postback",
                                                                "payload": JSON.stringify({
                                                                    state: 'setFlow',
                                                                    flow: fl.flow
                                                                })
                                                            })
                                                        }

                                                    })
                                                    var menu = {
                                                        "persistent_menu": [
                                                            {
                                                                "call_to_actions": [{
                                                                    "title": "👑 Get started",
                                                                    "type": "nested",
                                                                    call_to_actions
                                                                }, {
                                                                    type: "web_url",
                                                                    url: "m.me/206881183192113?ref=power-by",
                                                                    title: "📮 Power by BotForm"
                                                                }
                                                                ],
                                                                "locale": "default",

                                                            }
                                                        ]
                                                    }

                                                    setGetstarted(page)
                                                        .then(result => setDefautMenu(page, menu)
                                                            .then(result => db.ref('ladiBot').child(save.flow).update(save)
                                                                .then(result => resolve(save))))
                                                })
                                            )


                                    })


                                }
                                else if (page) {

                                    save.page = `${facebookPage[page].id}`;

                                    var flowList = _.where(dataLadiBot, {page: facebookPage[page].id})


                                    flowList.push(save)

                                    var call_to_actions = []
                                    var each = _.each(flowList, fl => {
                                        call_to_actions.push({
                                            "title": fl.data[8],
                                            "type": "postback",
                                            "payload": JSON.stringify({
                                                state: 'setFlow',
                                                flow: fl.flow
                                            })
                                        })
                                    })
                                    var menu = {
                                        "persistent_menu": [
                                            {
                                                "call_to_actions": [{
                                                    "title": "👑 Get started",
                                                    "type": "nested",
                                                    call_to_actions
                                                }, {
                                                    "title": "💸 Power by Ladi.bot",
                                                    "type": "postback",
                                                    "payload": JSON.stringify({
                                                        type: 'affiliate',
                                                    })
                                                }
                                                ],
                                                "locale": "default",

                                            }
                                        ]
                                    }

                                    setGetstarted(page)
                                        .then(result => setDefautMenu(page, menu)
                                            .then(result => db.ref('ladiBot').child(save.flow).update(save)
                                                .then(result => resolve(save))))

                                }
                                else db.ref('ladiBot').child(save.flow).update(save)
                                        .then(result => resolve(save))
                            }
                            else reject({err: 'This parse was not public'})

                        }
                        else reject({err: 'This script was not public'})


                    } else reject({err: 'This data was not public'})


                })
                .catch(err => reject(err))
        }
        else reject({err: 'there are more than one Id'})
    })

}

// CONFIG FUNCTION
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


function initUser() {
    conversationRef.once('value', function (snap) {
        conversationData = snap.val()
        for (var i in conversationData) {
            getUserDataAndSave(i)
        }
    })
}

app.post('/noti', function (req, res) {
    let {recipientId, message, page} = req.body;
    if (page) sendAPI(recipientId, message, null, page)
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

app.get('/message', function (req, res) {
    var {message} = req.query
    client.message(message, {})
        .then(data => res.send(data))
        .catch(err => res.status(500).json(err));
})

app.get('/initUser', function () {
    initUser()
});

app.get('/setMenu', function (req, res) {
    var page = req.param('page')
    setDefautMenu(page, menu[page]).then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

app.get('/setGetstarted', function (req, res) {
    var page = req.param('page')
    setGetstarted(page).then(result => res.send(result))
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
            uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
            qs: {access_token: facebookPage[page].access_token},
            method: 'POST',
            json: message

        }, function (error, response, body) {
            console.error("setGetstarted", error, body);
            if (!error && response.statusCode == 200) {

                resolve(response)

            } else {
                reject(error)

            }
        });
    })
}

var menu = {}
menu['jobo'] = {
    "persistent_menu": [
        {
            "call_to_actions": [{
                "title": "💸 Nhận phần thưởng",
                "type": "postback",
                "payload": JSON.stringify({
                    type: 'affiliate',
                })
            }, {
                "title": "👑 Tìm việc",
                "type": "nested",

                "call_to_actions": [
                    {
                        "title": "🍔 Tìm việc xung quanh",
                        "type": "postback",
                        "payload": JSON.stringify({
                            type: 'confirmPolicy',
                            answer: 'yes',
                        })
                    },
                    {
                        "title": "🍇 Lịch phỏng vấn",
                        "type": "postback",
                        "payload": JSON.stringify({
                            type: 'jobseeker',
                            state: 'interview',
                        })
                    },
                    {
                        "title": "🍋 Cập nhật hồ sơ",
                        "type": "postback",
                        "payload": JSON.stringify({
                            type: 'jobseeker',
                            state: 'updateProfile'

                        })
                    }
                ]
            },
                {
                    "title": "Xem thêm",
                    "type": "nested",

                    "call_to_actions": [
                        {
                            "title": "🍔 Tôi muốn tuyển dụng",
                            "type": "postback",
                            "payload": JSON.stringify({
                                type: 'confirmEmployer',
                                answer: 'yes',
                            })
                        },
                        {
                            "title": "🍇 Cộng đồng tìm việc",
                            type: "web_url",
                            url: "https://docs.google.com/forms/d/e/1FAIpQLSdfrjXEvdx72hpeDeM5KdT-z1DXqaoElfg5MRQM92xBCVzORA/viewform",
                        },
                        {
                            "title": "🍇 Kinh nghiệm quản trị",
                            type: "web_url",
                            url: "https://docs.google.com/forms/d/e/1FAIpQLSdfrjXEvdx72hpeDeM5KdT-z1DXqaoElfg5MRQM92xBCVzORA/viewform",
                        }
                    ]
                }
            ],
            "locale": "default",

        }
    ]
}
menu['dumpling'] = {
    "persistent_menu": [
        {
            "call_to_actions": [
                {
                    "title": "💑 Trò chuyện",
                    "type": "nested",

                    "call_to_actions": [
                        {
                            "title": "✨ Bắt đầu",
                            "type": "postback",
                            "payload": JSON.stringify({
                                type: 'matching',
                            })
                        },
                        {
                            "title": "❎ Dừng chat",
                            "type": "postback",
                            "payload": JSON.stringify({
                                type: 'stop',
                            })
                        },
                        {
                            "title": "Trạng thái",
                            "type": "postback",
                            "payload": JSON.stringify({
                                type: 'status',
                            })
                        }
                    ]
                },
                {
                    type: "web_url",
                    url: "https://docs.google.com/forms/d/e/1FAIpQLSdfrjXEvdx72hpeDeM5KdT-z1DXqaoElfg5MRQM92xBCVzORA/viewform",
                    title: "📮 Gửi confession"
                }, {
                    "title": "Xem thêm",
                    "type": "nested",

                    "call_to_actions": [
                        {
                            type: "postback",
                            title: "Từ vựng tiếng anh",
                            payload: JSON.stringify({type: 'learn_english'})
                        },
                        {
                            type: "web_url",
                            url: "https://www.facebook.com/dumpling.bot",
                            title: "Fanpage Dumpling"
                        }, {
                            type: "web_url",
                            url: "https://www.facebook.com/groups/1985734365037855",
                            title: "Tham gia nhóm"
                        }, {
                            type: "postback",
                            title: "Chia sẻ Dumpling",
                            payload: JSON.stringify({type: 'share'})
                        }
                    ]
                },

            ],
            "locale": "default",

        }
    ]
}
menu['152866285340107'] = {
    "persistent_menu": [
        {
            "call_to_actions": [
                {
                    "title": "💑 Trò chuyện",
                    "type": "nested",

                    "call_to_actions": [
                        {
                            "title": "✨ Bắt đầu",
                            "type": "postback",
                            "payload": JSON.stringify({
                                type: 'matching',
                            })
                        },
                        {
                            "title": "❎ Dừng chat",
                            "type": "postback",
                            "payload": JSON.stringify({
                                type: 'stop',
                            })
                        },
                        {
                            "title": "Trạng thái",
                            "type": "postback",
                            "payload": JSON.stringify({
                                type: 'status',
                            })
                        }
                    ]
                }, {
                    "title": "Xem thêm",
                    "type": "nested",

                    "call_to_actions": [

                        {
                            type: "web_url",
                            url: "https://www.facebook.com/dumpling.bot",
                            title: "Fanpage Dumpling"
                        }, {
                            type: "web_url",
                            url: "https://www.facebook.com/groups/1985734365037855",
                            title: "Tham gia nhóm"
                        }, {
                            type: "postback",
                            title: "Chia sẻ",
                            payload: JSON.stringify({type: 'share'})
                        }
                    ]
                },

            ],
            "locale": "default",

        }
    ]
}


function setDefautMenu(page = 'jobo', menu) {
    console.error("setDefautMenu-ing", page, menu);

    return new Promise(function (resolve, reject) {
        request({
            uri: 'https://graph.facebook.com/v2.6/me/messenger_profile',
            qs: {access_token: facebookPage[page].access_token},
            method: 'POST',
            json: menu

        }, function (error, response, body) {
            console.error("setDefautMenu", error, body);

            if (!error && response.statusCode == 200) {

                resolve(response)

            } else {
                reject(error)

            }
        });
    })

}

app.get('/setGreeting', function (req, res) {
    var {page, greeting} = req.query
    setGreeting(greeting, page).then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

function setGreeting(greeting = 'Hello {{user_first_name}}!', page = 'jobo') {
    console.error("setGreeting-ing", page, menu);

    var json = {
        "greeting": [
            {
                "locale": "default",
                "text": greeting
            }
        ]
    }

    return new Promise(function (resolve, reject) {
        request({
            uri: 'https://graph.facebook.com/v2.6/me/messenger_profile',
            qs: {access_token: facebookPage[page].access_token},
            method: 'POST',
            json

        }, function (error, response, body) {
            console.error("setGreeting", error, body);

            if (!error && response.statusCode == 200) {

                resolve(response)

            } else {
                reject(error)

            }
        });
    })

}

app.get('/setWhiteListDomain', function (req, res) {
    setWhiteListDomain().then(result => res.send(result))
        .catch(err => res.status(500).json(err))
});

function setWhiteListDomain() {
    var mes = {
        "whitelisted_domains": WHITE_LIST
    }


    return new Promise(function (resolve, reject) {
        request({
            uri: 'https://graph.facebook.com/v2.6/me/messenger_profile',
            qs: {access_token: PAGE_ACCESS_TOKEN},
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

function sendHalloWeenMessage(user) {
    console.log(user)
    sendAPI(user.messengerId, {
        attachment: {
            type: "video",
            payload: {
                url: 'https://jobo.asia/file/halloween.mp4'
            }
        }
    }).then(() => {
        sendAPI(user.messengerId, {
            text: `Happy Halloween nhé, ${user.name} <3 !!!`
        })
    })
}

app.get('/sendHalloWeenMessage', function (req, res) {
    userRef.once('value', function (snap) {
        var dataUser = snap.val()
        for (var i in dataUser) sendHalloWeenMessage(dataUser[i])

        res.send('done')

    })
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
// app.get('/webhook', function (req, res) {
//     if (req.query['hub.mode'] === 'subscribe' &&
//         req.query['hub.verify_token'] === VALIDATION_TOKEN) {
//         console.log("Validating webhook");
//         res.status(200).send(req.query['hub.challenge']);
//     } else {
//         console.error("Failed validation. Make sure the validation tokens match.");
//         res.sendStatus(403);
//     }
// });
// app.post('/webhook', function (req, res) {
//     var data = req.body;
//     console.log('webhook', JSON.stringify(data))
//     db.ref('webhook').push(data).then(result => res.sendStatus(200))
//         .catch(err => {
//             console.log('webhook_error', JSON.stringify(err))
//             res.sendStatus(200)
//         })
//     // Make sure this is a page subscription
// })


/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page.
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
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

app.get('/getUserDataAndSave', function (req, res) {
    var query = req.query
    var senderID = query.senderID
    getUserDataAndSave(senderID)
        .then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})


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

function matchingPayload(event) {
    return new Promise(function (resolve, reject) {

        console.log('matchingPayload-ing', JSON.stringify(event))

        var senderID = event.sender.id;
        var recipientID = event.recipient.id;
        var timeOfPostback = event.timestamp;
        var message = event.message;
        var postback = event.postback;
        var referral = event.referral


        var payloadStr = '';

        if (message && message.quick_reply && message.quick_reply.payload) payloadStr = message.quick_reply.payload
        else if (message && message.payload) payloadStr = message.payload
        else if (postback && postback.payload) payloadStr = postback.payload

        if (referral) {
            if (recipientID == facebookPage['jobo'].id) referInital(referral, senderID)
        } else if (postback && postback.referral) referral = postback.referral

        if (referral) {
            resolve({payload, senderID, postback, referral})
        } else if (payloadStr.length > 0) {
            var payload = JSON.parse(payloadStr);
            resolve({payload, senderID, postback, referral})
        } else if (message) {
            var lastMessage = lastMessageData[senderID]
            console.log('lastMessage', lastMessage);
            if (lastMessage && lastMessage.message && lastMessage.message.metadata) payloadStr = lastMessage.message.metadata;

            if (payloadStr.length > 0) var payload = JSON.parse(payloadStr)
            else payload = {type: 'default'};

            if (message.attachments) {
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
                    console.log('something donnt know', event)

                }

                resolve({payload, senderID, message})

            } else if (message.text) {
                console.log('message.text', message.text);

                payload.text = message.text;

                client.message(message.text, {})
                    .then(data => {
                        console.log('Yay, got Wit.ai response: ', data);
                        var entities = data.entities
                        for (var i in entities) {
                            var entity = entities[i]
                            var most = _.max(entity, function (card) {
                                return card.confidence;
                            });
                            var value = most.value
                            console.log('value', value)
                            if (i == 'yes_no') i = 'answer'
                            payload[i] = value
                        }

                        resolve({payload, senderID, message})

                    })
                    .catch(console.error);
            }

        } else {
            console.log('something donnt know', event)
        }

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

                        var jobId = payload.jobId

                        loadJob(jobId).then(jobData => {
                                if (jobData.deadline > Date.now()) {
                                    var status = 1
                                } else status = 0;


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
                                    // sendAPI(senderID, {
                                    //     text: "* Lưu ý khi nhận việc\n " +
                                    //     "- Xem kỹ yêu câu công việc trước khi ứng tuyển\n" +
                                    //     "- Vui lòng đi phỏng vấn đúng giờ, theo như lịch đã hẹn\n" +
                                    //     "- Nếu có việc đột xuất không tham gia được, bạn phải báo lại cho mình ngay\n",
                                    //     metadata: JSON.stringify({
                                    //         type: 'welcome_note_requirement',
                                    //         case: 'confirmJobSeeker',
                                    //     })
                                    // }, 3000)

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
                        "title": strTime(time),
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

app.get('/findOne', function (req, res) {
    ladiBotCol.findOne({flow: 0, page: 148767772152908})
        .then(result => {
            console.log('result', result)
            res.send(result)
        })
        .catch(err => res.status(500).json(err))
})

app.get('/initconversation', function (req, res) {

    for (var a in conversationData) {
        var conversation = conversationData[a]
        for (var i in conversation) {
            var messagingEvent = conversation[i]
            matchingPayload(messagingEvent)
                .then(result => intention(result.payload, result.senderID, result.postback, result.message))
                .catch(err => console.error())
            ;
        }
    }

})

var listen = 'on'

db.ref('webhook').on('child_added', function (snap) {
    var data = snap.val()
    if (data.object == 'page' && listen == 'on') {
        // Iterate over each entry
        // There may be multiple if batched
        data.entry.forEach(function (pageEntry) {
            var pageID = `${pageEntry.id}`;
            var timeOfEvent = pageEntry.time;

            // Iterate over each messaging event
            if (pageEntry.messaging) {
                pageEntry.messaging.forEach(function (messagingEvent) {

                    var senderID = `${messagingEvent.sender.id}`;
                    var recipientID = `${messagingEvent.recipient.id}`;
                    var timeOfMessage = messagingEvent.timestamp;


                    if (messagingEvent.message || messagingEvent.postback || messagingEvent.referral) {

                        loadsenderData(senderID, pageID)
                            .then(senderData => matchingPayload(messagingEvent)
                                .then(result => {
                                    var payload = result.payload;
                                    var message = result.message;
                                    var referral = result.referral;
                                    var postback = result.postback;

                                    if (pageID == facebookPage['jobo'].id) {
                                        intention(payload, senderID, postback, message)
                                    } else if (pageID == facebookPage['dumpling'].id) {

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

                                            saveSenderData(senderData, senderID, 'dumpling').then(result => sendingAPI(senderID, recipientID, {
                                                    text: `Dumpling kết nối hai người lạ nói chuyện với nhau bằng một cuộc trò chuyện bí mật`,
                                                }, null, 'dumpling')
                                                    .then(result => sendingAPI(senderID, recipientID, {
                                                        text: `đảm bảo 100% bí mật thông tin và nội dung trò chuyện`,
                                                    }, null, 'dumpling'))
                                                    .then(result => {
                                                        if (senderData.topic) sendingAPI(senderID, recipientID, {
                                                            text: `Bạn đang tham gia Dumpling #${refData[0]}, hãy ấn [💬 Bắt Đầu] để bắt đầu tìm người lạ trò chuyện`,
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
                                                        else sendingAPI(senderID, recipientID, {
                                                            text: `Hãy chọn chủ đề liên quan đến bạn nhất?`,
                                                            quick_replies: quick_topic
                                                        }, null, 'dumpling')

                                                    })
                                            )
                                        }
                                        else if (payload.type == 'selectTopic') {
                                            saveSenderData({topic: payload.topic}, senderID, 'dumpling')
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
                                            if (!topic[payload.topic]) {
                                                topic[payload.topic] = 1
                                                quick_topic.push({
                                                    "content_type": "text",
                                                    "title": `#${payload.topic}`,
                                                    "payload": JSON.stringify({
                                                        type: 'selectTopic',
                                                        topic: payload.topic
                                                    })
                                                })
                                            }
                                            else topic[payload.topic]++

                                        }
                                        else if (payload.type == 'stop') {

                                            if (senderData && senderData.match) {

                                                db.ref('dumpling_account').child(senderID).child('match').remove()
                                                    .then(result => db.ref('dumpling_account').child(senderData.match).child('match').remove())
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
                                            else matchingPeople(senderID)
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
                                            if (payload.answer == 'off') db.ref('dumpling_account').child(senderID).update({status: 0}).then(result => sendingAPI(senderID, recipientID, {
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
                                            else if (payload.answer == 'on') db.ref('dumpling_account').child(senderID).update({status: 1}).then(result => sendingAPI(senderID, recipientID, {
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
                                        else if (payload.type == 'learn_english') {
                                            if (senderData.vocal_off) sendVocalRes(senderID)
                                            else sendingAPI(senderID, recipientID, {
                                                text: '[Hệ thống] Bạn đang mở tính năng từ vựng tiếng anh của Dumpling',
                                                quick_replies: [
                                                    {
                                                        "content_type": "text",
                                                        "title": "Tắt",
                                                        "payload": JSON.stringify({
                                                            type: 'learn_english_off',
                                                        })
                                                    }
                                                ]
                                            }, null, 'dumpling')
                                        }
                                        else if (payload.type == 'learn_english_off') {
                                            db.ref('dumpling_account').child(senderID).update({vocal_off: true})
                                                .then(result => sendingAPI(senderID, recipientID, {
                                                    text: '[Hệ thống] Đã tắt tính năng từ vựng tiếng anh',

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
                                                },
                                                10, 'dumpling'
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
                                    } else if (pageID == '206881183192113') {


                                        if (referral && referral.ref) {

                                            senderData.ref = referral.ref


                                            if (referral.ref.match('_')) {
                                                var refData = referral.ref.split('_');
                                                console.log('refData', refData);

                                            } else refData = [referral.ref]

                                            if (refData[0] == 'create') {
                                                var url = senderData.ref.slice(7);
                                                console.log('url', url);

                                                sendAPI(senderID, {
                                                    text: `Welcome ${senderData.first_name}! \n Your form is being converted`
                                                }, null, pageID)

                                                getChat({url})
                                                    .then(form => sendAPI(senderID, {
                                                        attachment: {
                                                            type: "template",
                                                            payload: {
                                                                template_type: "button",
                                                                text: `Done <3! \n We had just turn your "${form.data[8]}" form into chatbot to help you convert more leads!`,
                                                                buttons: [{
                                                                    type: "web_url",
                                                                    url: `https://m.me/206881183192113?ref=${form.flow}`,
                                                                    title: "Test your chatbot"
                                                                }, {
                                                                    type: "web_url",
                                                                    url: url,
                                                                    title: "View response"
                                                                }]
                                                            }
                                                        }
                                                    }, null, pageID)
                                                        .then(result => sendAPI(senderID, {
                                                            attachment: {
                                                                type: "template",
                                                                payload: {
                                                                    template_type: "button",
                                                                    text: `Step 2: \n Connect this form to your Facebook Page`,
                                                                    buttons: [{
                                                                        type: "web_url",
                                                                        url: `https://jobo.asia/ladibot/create?url=${url}`,
                                                                        title: "Connect your Facebook Page"
                                                                    }, {
                                                                        type: "web_url",
                                                                        url: `https://www.facebook.com/pages/create`,
                                                                        title: "Create new page"
                                                                    }]
                                                                }
                                                            }
                                                        }, null, pageID))
                                                        .catch(err => sendAPI(senderID, {
                                                            text: JSON.stringify(err)
                                                        }, null, pageID)))

                                                    .catch(err => sendAPI(senderID, {
                                                        text: JSON.stringify(err)
                                                    }, null, pageID))

                                            }
                                            else {
                                                var flow = refData[0]
                                                senderData.flow = flow

                                            }

                                            db.ref(pageID + '_account').child(senderID).update(senderData)

                                            /// case create

                                        } else if (postback) {

                                        }

                                        if (!senderData.flow) {
                                            if (message) {

                                            }

                                        }

                                        if (senderData.flow) {
                                            console.log('flow', senderData.flow)

                                            var result = _.findWhere(dataLadiBot, {flow: senderData.flow});

                                            if (result) ladiResCol.findOne({
                                                flow: senderData.flow,
                                                page: pageID,
                                                senderID
                                            }).then(response => {
                                                console.log('response', response)

                                                if (!response) response = {
                                                    flow: senderData.flow,
                                                    page: pageID,
                                                    senderID
                                                }
                                                if (payload) {
                                                    if (payload.text && payload.type == 'ask' && payload.questionId) {
                                                        response[payload.questionId] = payload.text

                                                        ladiResCol.findOneAndUpdate({
                                                            flow: senderData.flow,
                                                            page: pageID,
                                                            senderID
                                                        }, {$set: response}).then(result => {
                                                            console.log('save response', response)
                                                        })
                                                    }
                                                    if (payload.state) {
                                                        if (payload.state == 'undo') {
                                                            response = {
                                                                flow: senderData.flow,
                                                                page: pageID,
                                                                senderID
                                                            }
                                                            ladiResCol.remove({
                                                                flow: senderData.flow,
                                                                page: pageID,
                                                                senderID
                                                            }).then(result => {
                                                                console.log('remove response', response)
                                                            })

                                                        }
                                                        if (payload.state == 'setFlow') {
                                                            senderData.flow = payload.flow;
                                                            db.ref(pageID + '_account').child(senderID).update(senderData)
                                                        }

                                                    }
                                                }


                                                var flow = result.data
                                                var questions = flow[1]
                                                var q = -1

                                                function loop() {
                                                    q++
                                                    console.log('current', q)

                                                    if (q < questions.length) {
                                                        var currentQuestion = questions[q];
                                                        console.log(currentQuestion)
                                                        var currentQuestionId = currentQuestion[0];
                                                        if (!response[currentQuestionId]) {
                                                            var messageSend = {
                                                                text: currentQuestion[1] || '(Không có câu hỏi, gõ bất kì để bỏ qua)',
                                                            }
                                                            var metadata = {
                                                                questionId: currentQuestionId
                                                            }
                                                            var askStringStr = `0,1,7,8,9,10,13`
                                                            var askOptionStr = `2,3,4,5`
                                                            var askType = currentQuestion[3]
                                                            console.log('askType', askType)
                                                            if (currentQuestion[4]) {
                                                                metadata.askType = askType
                                                                metadata.type = 'ask'

                                                                if (askOptionStr.match(askType)) {
                                                                    var askOption = currentQuestion[4][0][1]

                                                                    var quick_replies = []
                                                                    var map = _.map(askOption, option => {
                                                                        metadata.text = option[0]
                                                                        quick_replies.push({
                                                                            "content_type": "text",
                                                                            "title": option[0],
                                                                            "payload": JSON.stringify(metadata)

                                                                        })
                                                                    });
                                                                    messageSend.quick_replies = quick_replies

                                                                } else if (askStringStr.match(askType)) {

                                                                    messageSend.metadata = JSON.stringify(metadata)
                                                                }
                                                                console.log('messageSend', messageSend)
                                                                sendingAPI(senderID, pageID, messageSend, null, pageID)

                                                            } else {
                                                                metadata.type = 'info'
                                                                sendingAPI(senderID, pageID, messageSend, null, pageID).then(result => {
                                                                    response[currentQuestionId] = true

                                                                    ladiResCol.findOneAndUpdate({
                                                                        flow: senderData.flow,
                                                                        page: pageID,
                                                                        senderID
                                                                    }, {$set: response}).then(result => {
                                                                        console.log('save response', response)
                                                                        if (currentQuestion[3] == 11 && currentQuestion[2]) sendingAPI(senderID, pageID, {
                                                                            attachment: {
                                                                                type: "image",
                                                                                payload: {
                                                                                    url: currentQuestion[2]
                                                                                }
                                                                            }
                                                                        }, null, pageID).then(result => setTimeout(loop(), 1000))
                                                                        else if (currentQuestion[3] == 12 && currentQuestion[6][3]) sendingAPI(senderID, pageID, {
                                                                            text: `https://www.youtube.com/watch?v=${currentQuestion[6][3]}`
                                                                        }, null, pageID).then(result => setTimeout(loop(), 1000))
                                                                        else setTimeout(loop(), 1000)


                                                                    })

                                                                })

                                                            }
                                                        } else
                                                            loop()

                                                    } else {
                                                        if (!response.end) sendingAPI(senderID, pageID, {
                                                            text: `${(flow[2] && flow[2][0]) ? (flow[2][0]) : ('Thanks for your time!')}`
                                                        }, null, pageID).then(result => {
                                                            response.end = true
                                                            ladiResCol.findOneAndUpdate({
                                                                flow: senderData.flow,
                                                                page: pageID,
                                                                senderID
                                                            }, {$set: response})
                                                                .then(result => submitResponse(senderData.flow, senderID)
                                                                    .then(result => console.log('done', result))
                                                                    .catch(err => console.log('err', err))
                                                                )

                                                        })
                                                        else sendingAPI(senderID, pageID, {
                                                            text: 'Thank you again! See ya <3',
                                                            quick_replies: [{
                                                                "content_type": "text",
                                                                "title": 'Undo',
                                                                "payload": JSON.stringify({
                                                                    state: 'undo'
                                                                })
                                                            }]
                                                        }, null, pageID)
                                                    }
                                                }

                                                if (!response.start) sendAPI(senderID, {
                                                    text: flow[8] || '',
                                                }, null, pageID)
                                                    .then(result => {
                                                        if (flow[0]) sendAPI(senderID, {text: flow[0]}, null, pageID)
                                                            .then(result => loop())
                                                        else loop()

                                                        response.start = true
                                                        console.log(result)

                                                        ladiResCol.findOneAndUpdate({
                                                            flow: senderData.flow,
                                                            page: pageID,
                                                            senderID
                                                        }, {$set: response}, {upsert: true})
                                                            .then(result => {
                                                                console.log('save response', result, response)
                                                            })
                                                    })
                                                else loop()

                                            })
                                            else {
                                                console.log('non-result')
                                                var flowList = _.where(dataLadiBot, {page: pageID})
                                                if (flowList && flowList.length > 0) {
                                                    var quick_replies = []

                                                    var each = _.each(flowList, flow => {
                                                        quick_replies.push({
                                                            "content_type": "text",
                                                            "title": flow.data[8],
                                                            "payload": JSON.stringify({
                                                                state: 'setFlow',
                                                                flow: flow.flow
                                                            })
                                                        })
                                                    })
                                                    sendingAPI(senderID, pageID, {
                                                        text: 'Bạn cần giúp gì nhỉ?',
                                                        quick_replies
                                                    }, null, pageID)
                                                } else sendingAPI(senderID, pageID, {
                                                    text: 'Chào bạn, Bạn cần giúp gì nhỉ?',
                                                }, null, pageID)
                                            }
                                        }
                                    }
                                    else {


                                        if (referral && referral.ref) {
                                            senderData.ref = referral.ref
                                            var refData = senderData.ref.split('_');
                                            console.log('Number(refData[0])', refData[0]);
                                            senderData.flow = refData[0]
                                            db.ref(pageID + '_account').child(senderID).update(senderData)
                                        }

                                        if (!senderData.flow) {
                                            var flowList = _.where(dataLadiBot, {page: pageID})
                                            if (flowList && flowList.length > 0) {
                                                var quick_replies = []

                                                var each = _.each(flowList, flow => {
                                                    quick_replies.push({
                                                        "content_type": "text",
                                                        "title": flow.data[8],
                                                        "payload": JSON.stringify({
                                                            state: 'setFlow',
                                                            flow: flow.flow
                                                        })
                                                    })
                                                })
                                                sendingAPI(senderID, pageID, {
                                                    text: 'Bạn cần giúp gì nhỉ?',
                                                    quick_replies
                                                }, null, pageID)
                                            } else sendingAPI(senderID, pageID, {
                                                text: 'Chào bạn, Bạn cần giúp gì nhỉ?',
                                            }, null, pageID)
                                        }

                                        if (senderData.flow) {
                                            console.log('flow', senderData.flow)

                                            var result = _.findWhere(dataLadiBot, {flow: senderData.flow});

                                            if (result) ladiResCol.findOne({
                                                flow: senderData.flow,
                                                page: pageID,
                                                senderID
                                            }).then(response => {
                                                console.log('response', response)

                                                if (!response) response = {
                                                    flow: senderData.flow,
                                                    page: pageID,
                                                    senderID
                                                }
                                                if (payload) {
                                                    if (payload.text && payload.type == 'ask' && payload.questionId) {
                                                        response[payload.questionId] = payload.text

                                                        ladiResCol.findOneAndUpdate({
                                                            flow: senderData.flow,
                                                            page: pageID,
                                                            senderID
                                                        }, {$set: response}).then(result => {
                                                            console.log('save response', response)
                                                        })
                                                    }
                                                    if (payload.state) {
                                                        if (payload.state == 'undo') {
                                                            response = {
                                                                flow: senderData.flow,
                                                                page: pageID,
                                                                senderID
                                                            }
                                                            ladiResCol.remove({
                                                                flow: senderData.flow,
                                                                page: pageID,
                                                                senderID
                                                            }).then(result => {
                                                                console.log('remove response', response)
                                                            })

                                                        }
                                                        if (payload.state == 'setFlow') {
                                                            senderData.flow = payload.flow;
                                                            db.ref(pageID + '_account').child(senderID).update(senderData)
                                                        }

                                                    }
                                                }


                                                var flow = result.data
                                                var questions = flow[1]
                                                var q = -1

                                                function loop() {
                                                    q++
                                                    console.log('current', q)

                                                    if (q < questions.length) {
                                                        var currentQuestion = questions[q];
                                                        console.log(currentQuestion)
                                                        var currentQuestionId = currentQuestion[0];
                                                        if (!response[currentQuestionId]) {
                                                            var messageSend = {
                                                                text: currentQuestion[1] || '(Không có câu hỏi, gõ bất kì để bỏ qua)',
                                                            }
                                                            var metadata = {
                                                                questionId: currentQuestionId
                                                            }
                                                            var askStringStr = `0,1,7,8,9,10,13`
                                                            var askOptionStr = `2,3,4,5`
                                                            var askType = currentQuestion[3]
                                                            console.log('askType', askType)
                                                            if (currentQuestion[4]) {
                                                                metadata.askType = askType
                                                                metadata.type = 'ask'

                                                                if (askOptionStr.match(askType)) {
                                                                    var askOption = currentQuestion[4][0][1]

                                                                    var quick_replies = []
                                                                    var map = _.map(askOption, option => {
                                                                        metadata.text = option[0]
                                                                        quick_replies.push({
                                                                            "content_type": "text",
                                                                            "title": option[0],
                                                                            "payload": JSON.stringify(metadata)

                                                                        })
                                                                    });
                                                                    messageSend.quick_replies = quick_replies

                                                                } else if (askStringStr.match(askType)) {

                                                                    messageSend.metadata = JSON.stringify(metadata)
                                                                }
                                                                console.log('messageSend', messageSend)
                                                                sendingAPI(senderID, pageID, messageSend, null, pageID)

                                                            } else {
                                                                metadata.type = 'info'
                                                                sendingAPI(senderID, pageID, messageSend, null, pageID).then(result => {
                                                                    response[currentQuestionId] = true

                                                                    ladiResCol.findOneAndUpdate({
                                                                        flow: senderData.flow,
                                                                        page: pageID,
                                                                        senderID
                                                                    }, {$set: response}).then(result => {
                                                                        console.log('save response', response)
                                                                        if (currentQuestion[3] == 11 && currentQuestion[2]) sendingAPI(senderID, pageID, {
                                                                            attachment: {
                                                                                type: "image",
                                                                                payload: {
                                                                                    url: currentQuestion[2]
                                                                                }
                                                                            }
                                                                        }, null, pageID).then(result => setTimeout(loop(), 1000))
                                                                        else if (currentQuestion[3] == 12 && currentQuestion[6][3]) sendingAPI(senderID, pageID, {
                                                                            text: `https://www.youtube.com/watch?v=${currentQuestion[6][3]}`
                                                                        }, null, pageID).then(result => setTimeout(loop(), 1000))
                                                                        else setTimeout(loop(), 1000)


                                                                    })

                                                                })

                                                            }
                                                        } else
                                                            loop()

                                                    } else {
                                                        if (!response.end) sendingAPI(senderID, pageID, {
                                                            text: `${(flow[2] && flow[2][0]) ? (flow[2][0]) : ('Thanks for your time!')}`
                                                        }, null, pageID).then(result => {
                                                            response.end = true
                                                            ladiResCol.findOneAndUpdate({
                                                                flow: senderData.flow,
                                                                page: pageID,
                                                                senderID
                                                            }, {$set: response})
                                                                .then(result => submitResponse(senderData.flow, senderID)
                                                                    .then(result => console.log('done', result))
                                                                    .catch(err => console.log('err', err))
                                                                )

                                                        })
                                                        else sendingAPI(senderID, pageID, {
                                                            text: 'Thank you again! See ya <3',
                                                            quick_replies: [{
                                                                "content_type": "text",
                                                                "title": 'Undo',
                                                                "payload": JSON.stringify({
                                                                    state: 'undo'
                                                                })
                                                            }]
                                                        }, null, pageID)
                                                    }
                                                }

                                                if (!response.start) sendingAPI(senderID, pageID, {
                                                    text: flow[8] || '' + '\n' + flow[0] || '',
                                                }, null, pageID).then(result => {
                                                    response.start = true
                                                    console.log(result)

                                                    ladiResCol.findOneAndUpdate({
                                                        flow: senderData.flow,
                                                        page: pageID,
                                                        senderID
                                                    }, {$set: response}, {upsert: true}).then(result => {
                                                        console.log('save response', result, response)
                                                    })
                                                    loop()
                                                })
                                                else loop()

                                            })
                                            else {
                                                console.log('non-result')
                                                var flowList = _.where(dataLadiBot, {page: pageID})
                                                if (flowList && flowList.length > 0) {
                                                    var quick_replies = []

                                                    var each = _.each(flowList, flow => {
                                                        quick_replies.push({
                                                            "content_type": "text",
                                                            "title": flow.data[8],
                                                            "payload": JSON.stringify({
                                                                state: 'setFlow',
                                                                flow: flow.flow
                                                            })
                                                        })
                                                    })
                                                    sendingAPI(senderID, pageID, {
                                                        text: 'Bạn cần giúp gì nhỉ?',
                                                        quick_replies
                                                    }, null, pageID)
                                                } else sendingAPI(senderID, pageID, {
                                                    text: 'Chào bạn, Bạn cần giúp gì nhỉ?',
                                                }, null, pageID)
                                            }
                                        }
                                    }


                                })
                                .catch(err => console.error())
                            ).catch(err => console.error());


                    } else if (messagingEvent.read && pageID != facebookPage['dumpling'].id) {
                        receivedMessageRead(messagingEvent);
                    } else if (messagingEvent.optin) {
                        receivedAuthentication(messagingEvent);
                    } else if (messagingEvent.delivery) {
                        receivedDeliveryConfirmation(messagingEvent);
                    } else if (messagingEvent.account_linking) {
                        receivedAccountLink(messagingEvent);
                    } else {
                        console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                    }

                    messagingEvent.type = 'received';
                    messageFactoryCol.insert(messagingEvent)
                        .then(result => {
                        })
                        .catch(console.error)

                })

            }
        })
        ;

        db.ref('webhook').child(snap.key).remove()

    }

})

function flowAI({keyword, senderID, pageID}) {

    var guest_value = ''
    var flowList = _.filter(dataLadiBot, flow => {
        var keyflow = flow.keyflow
        var finding = 'ing'
        if (keyword.match('-')) {
            var matching = 0
            var splitpayload = keyword.split('-')
            for (var i = 0; i < splitpayload.length - 1; i++) {
                var two = i + 1
                var two_key = splitpayload[i] + '-' + splitpayload[two]
                if (keyflow.match(two_key)) {
                    guest_value = two_key
                    matching++
                    finding = 'done'
                }

            }
            if (finding == 'ing') {
                for (var i = 0; i < splitpayload.length; i++) {
                    var one_key = splitpayload[i]
                    if (keyflow.match(one_key)) {
                        guest_value = one_key
                        matching++
                    }
                }
            }

            if (matching > 0) {
                flow.matching = matching
                return flow
            }

        }
    })
    if (flowList && flowList.length > 0) {
        var quick_replies = []

        var each = _.each(flowList, flow => {
            quick_replies.push({
                "content_type": "text",
                "title": flow.data[8],
                "payload": JSON.stringify({
                    state: 'setFlow',
                    flow: flow.flow
                })
            })
        })
        sendingAPI(senderID, pageID, {
            text: `Có phải ý bạn là ${guest_value} ?`,
            quick_replies
        }, null, pageID)
    } else sendingAPI(senderID, pageID, {
        text: 'Chào bạn, Bạn cần giúp gì nhỉ?',
    }, null, pageID)
}


app.get('/submitResponse', function (req, res) {
    var {flow, senderID} = req.query
    submitResponse(flow, senderID)
        .then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

function submitResponse(flow, senderID) {
    return new Promise(function (resolve, reject) {
        ladiResCol.findOne({
            flow, senderID
        }).then(response => {
            if (response) {
                delete response._id
                delete response.flow
                delete response.page
                delete response.senderID
                delete response.start
                delete response.end
                var form = _.findWhere(dataLadiBot, {flow})
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

app.get('/listen', function (req, res) {
    var type = req.param('type')
    listen = type
    res.send(listen)
})

function loadsenderData(senderID, page = 'dumpling') {
    return new Promise(function (resolve, reject) {
        var ref = page + '_account'

        db.ref(ref).child(senderID).once('value', function (snap) {
            if (snap.val()) resolve(snap.val())
            else graph.get(senderID + '?access_token=' + facebookPage[page].access_token, (err, result) => {
                if (err) reject(err);
                console.log('account', result);
                var user = result;
                user.createdAt = Date.now()
                db.ref(ref).child(senderID).update(user)
                    .then(result => resolve(user))
                    .catch(err => reject(err))
            })
        })


    })
}

function saveSenderData(data, senderID, page = 'dumpling') {
    return new Promise(function (resolve, reject) {
        var ref = page + '_account'

        db.ref(ref).child(senderID).update(data)
            .then(result => resolve(data))
            .catch(err => reject(err))

    })
}


function matchingPeople(senderID) {

    var senderData = dataAccount[senderID]
    var avaible = _.filter(dataAccount, function (card) {
        if (!card.match && card.status != 0 && card.gender != senderData.gender && card.id != facebookPage['dumpling'].id) return true
        else return false
    })

    if (avaible.length > 0) {
        var random = _.sample(avaible)
        var matched = random.id
        console.log('matched', matched)
        var recipientID = facebookPage['dumpling'].id
        sendAPI(matched, {
            text: `[Hệ Thống] Bạn đã được ghép với 1 người lạ ở Dumpling_${senderData.topic}, hãy nói gì đó đề bắt đầu`,
        }, null, 'dumpling')
            .then(result => saveSenderData({match: matched}, senderID, 'dumpling')
                .then(result => saveSenderData({match: senderID}, matched, 'dumpling')
                    .then(result => sendAPI(senderID, {
                        text: `[Hệ Thống] Đã ghép bạn với 1 người lạ ở Dumpling_${random.topic} thành công`,
                    }, null, 'dumpling'))
                    .then(result => sendAPI(senderID, {
                        text: "Chúc 2 bạn có những giây phút trò chuyện vui vẻ trên Dumpling ^^",
                    }, null, 'dumpling'))
                    .then(result => checkAvaible(senderID))))
            .catch(err => {
                matchingPeople(senderID)
                console.log(err)
                saveSenderData({sent_error: true}, matched, 'dumpling')
            })


    } else sendingAPI(senderID, facebookPage['dumpling'].id, {
        text: "[Hệ Thống] Chưa tìm đc người phù hợp",
    }, null, 'dumpling')


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
                db.ref('dumpling_account').child(senderID).child('match').remove()
                    .then(result => db.ref('dumpling_account').child(senderData.match).child('match').remove())
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

function receivedMessage(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    console.log("Received message for user %d and page %d at %d with message:",
        senderID, recipientID, timeOfMessage);


    var isEcho = message.is_echo;
    var messageId = message.mid;
    var appId = message.app_id;

    // You may get a text or attachment but not both
    var metadata = message.metadata;
    var messageText = message.text;
    var messageAttachments = message.attachments;
    var quickReply = message.quick_reply;
    var payloadStr = ''


    if (isEcho) {
        // Just logging message echoes to console
        console.log("Received echo for message %s and app %d with metadata %s",
            messageId, appId, metadata);
        return;
    }
    else if (quickReply) {
        var quickReplyPayload = quickReply.payload;
        console.log("Quick reply for message %s with payload %s", messageId, quickReplyPayload);
        return;
    }
    else if (messageText) {

        // If we receive a text message, check to see if it matches any special
        // keywords and send back the corresponding example. Otherwise, just echo
        // the text we received.
        switch (messageText) {
            case 'image':
                sendImageMessage(senderID, recipientID);
                break;

            case 'gif':
                sendGifMessage(senderID, recipientID);
                break;

            case 'audio':
                sendAudioMessage(senderID, recipientID);
                break;

            case 'video':
                sendVideoMessage(senderID, recipientID);
                break;

            case 'file':
                sendFileMessage(senderID, recipientID);
                break;

            case 'button':
                sendButtonMessage(senderID, recipientID);
                break;

            case 'generic':
                sendGenericMessage(senderID, recipientID);
                break;

            case 'receipt':
                sendReceiptMessage(senderID, recipientID);
                break;

            case 'quick reply':
                sendQuickReply(senderID, recipientID);
                break;

            case 'read receipt':
                sendReadReceipt(senderID, recipientID);
                break;

            case 'typing on':
                sendTypingOn(senderID, recipientID)
                    .then(result => console.log(result))
                    .catch(err => console.log(err));
                break;

            case 'typing off':
                sendTypingOff(senderID, recipientID);
                break;

            case 'account linking':
                sendAccountLinking(senderID, recipientID);
                break;

            default: {
            }

        }
    }
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

// function receivedPostback(event) {
//     var senderID = event.sender.id;
//     var recipientID = event.recipient.id;
//     var timeOfPostback = event.timestamp;
//     var postback = event.postback
//     // The 'payload' param is a developer-defined field which is set in a postback
//     // button for Structured Messages.
//
//
//     var payload = JSON.parse(postback.payload);
//
//     console.log("Received postback for user %d and page %d with payload '%s' " +
//         "at %d", senderID, recipientID, payload, timeOfPostback);
//
//
//     //done
//
//     // When a postback is called, we'll send a message back to the sender to
//     // let them know it was successful
// }

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

    var lastMessage = lastMessageData[senderID]
    if (lastMessage && lastMessage.notiId) {
        axios.get(CONFIG.AnaURL + '/messengerRead?notiId=' + lastMessage.notiId)
            .then(result => console.log("messengerRead", lastMessage))
            .catch(err => console.log(err))
    }
    sendReadReceipt(senderID, recipientID)

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
                    lastMessageRef.child(recipientId).update(messageData)
                    resolve(result)
                })
                .catch(err => reject(err))
        })
    })
}

function sendAPI(recipientId, message, typing, page = 'jobo') {
    return new Promise(function (resolve, reject) {
        if (!typing) typing = 10
        var messageData = {
            recipient: {
                id: recipientId
            },
            message
        };
        sendTypingOn(recipientId, page)
            .then(result => setTimeout(function () {
                callSendAPI(messageData, page).then(result => {
                    sendTypingOff(recipientId, page)
                    messageData.messengerId = recipientId
                    messageData.type = 'sent'
                    messageData.timestamp = Date.now()
                    messageFactoryCol.insert(messageData)
                        .then(result => lastMessageRef.child(messageData.messengerId).update(messageData))
                        .then(result => resolve(messageData))


                }).catch(err => reject(err))


            }, typing))
            .catch(err => reject(err))
    })
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
function sendReadReceipt(recipientId, page) {

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "mark_seen"
    };

    callSendAPI(messageData, page).then(result => {
    })
        .catch(err => console.log(err));
}

/*
 * Turn typing indicator on
 *
 */
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

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId, page = 'jobo') {
    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "typing_off"
    };

    callSendAPI(messageData, page);
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
function callSendAPI(messageData, page = 'jobo') {
    return new Promise(function (resolve, reject) {

        if (messageData.message && messageData.message.text && messageData.message.text.length > 640) {
            console.log('messageData.message.text.length', messageData.message.text.length)
            var text = messageData.message.text
            var loop = text.length / 640
            var textsplit = []
            for (var i = 0; i < loop; i++) {
                var split = text.slice(640 * i, 640 * (i + 1))
                textsplit.push(split)
                messageData.message.text = split
                sendOne(messageData, page)
            }
            console.log('textsplit', textsplit)
            resolve(messageData)

        } else sendOne(messageData, page)
            .then(result => resolve(result))
            .catch(err => reject(err))
    })

}

function sendOne(messageData, page) {
    return new Promise(function (resolve, reject) {
        if (facebookPage[page] && facebookPage[page].access_token) {
            request({
                uri: 'https://graph.facebook.com/v2.6/me/messages',
                qs: {access_token: facebookPage[page].access_token},
                method: 'POST',
                json: messageData

            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var recipientId = body.recipient_id;
                    var messageId = body.message_id;
                    if (messageId) console.log("callSendAPI_success", messageId, recipientId);
                    resolve(messageData)

                } else {
                    console.error("callSendAPI_error", body, JSON.stringify(messageData.message));
                    reject(error)
                }
            });
        } else {
            console.error("send_error_access-token", page, messageData);
            reject({err: 'no access token'})
        }

    })
}


// Start server
// Webhooks must be available via SSL with a certificate signed by a valid
// certificate authority.
app.listen(app.get('port'), function () {
    console.log('Node app is running on port', app.get('port'));
});

module.exports = app;

