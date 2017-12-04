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
const {Wit, log} = require('node-wit');

const client = new Wit({
    accessToken: 'CR6XEPRE2F3FLVWYJA6XFYJSVUO4SCN7',
    logger: new log.Logger(log.DEBUG) // optional
});

var uri = 'mongodb://joboapp:joboApp.1234@ec2-54-157-20-214.compute-1.amazonaws.com:27017/joboapp';


const MongoClient = require('mongodb');


var md, dumpling_messageFactoryCol

MongoClient.connect(uri, function (err, db) {
    console.log(err);

    md = db;
    dumpling_messageFactoryCol = md.collection('dumpling_messageFactory');
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
    //str= str.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'| |\"|\&|\#|\[|\]|~|$|_/g,"-");
    /* tìm và thay thế các kí tự đặc biệt trong chuỗi sang kí tự - */
    //str= str.replace(/-+-/g,"-"); //thay thế 2- thành 1-
    str = str.replace(/^\-+|\-+$/g, "");
    //cắt bỏ ký tự - ở đầu và cuối chuỗi
    return str.toUpperCase();
}
var CONFIG;
axios.get(API_URL + '/config')
    .then(result => CONFIG = result.data)
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
var dataAccount = {}, accountRef = db.ref('account');

// accountRef.child('dumpling').on('value', function (snap) {
//     dataAccount = snap.val()
//
// })

var profileRef = db2.ref('profile');
var likeActivityRef = db3.ref('activity/like');

var conversationData, conversationRef = db.ref('conversation')
var lastMessageData = {}, lastMessageRef = db.ref('last_message')

var conversationData_new, conversationRef_new = db3.ref('conversation_temp')

var messageFactory = {}, messageFactoryRef = db.ref('messageFactory')
var quick_topic = []
var topic = {}
var a = 0
accountRef.child('dumpling').on('child_added', function (snap) {
    dataAccount[snap.key] = snap.val()
    var user = dataAccount[snap.key]
    // if (user.ref) setTimeout(function () {
    //     a++
    //     var refData = user.ref.split('_');
    //     console.log('refData', refData);
    //     user.topic = {}
    //     if (refData[0] == 'start') refData[0] = 'ftu'
    //
    //     user.topic = refData[0]
    //     accountRef.child('dumpling').child(snap.key).update(user)
    // }, a * 100)

    if (user.topic) {
        if (!topic[user.topic]) {
            topic[user.topic] = 1
            quick_topic.push({
                "content_type": "text",
                "title": `#${user.topic}`,
                "payload": JSON.stringify({
                    type: 'selectTopic',
                    topic: user.topic
                })
            })
        }
        else topic[user.topic]++
    }

})
accountRef.child('dumpling').on('child_changed', function (snap) {
    dataAccount[snap.key] = snap.val()
})
lastMessageRef.on('child_added', function (snap) {
    lastMessageData[snap.key] = snap.val()
});
lastMessageRef.on('child_changed', function (snap) {
    lastMessageData[snap.key] = snap.val()
});

var vocalArray = [
    "abandon",
    "ability",
    "able",
    "abortion",
    "about",
    "above",
    "abroad",
    "absence",
    "absolute",
    "absolutely",
    "absorb",
    "abuse",
    "academic",
    "accept",
    "access",
    "accident",
    "accompany",
    "accomplish",
    "according",
    "account",
    "accurate",
    "accuse",
    "achieve",
    "achievement",
    "acid",
    "acknowledge",
    "acquire",
    "across",
    "act",
    "action",
    "active",
    "activist",
    "activity",
    "actor",
    "actress",
    "actual",
    "actually",
    "ad",
    "adapt",
    "add",
    "addition",
    "additional",
    "address",
    "adequate",
    "adjust",
    "adjustment",
    "administration",
    "administrator",
    "admire",
    "admission",
    "admit",
    "adolescent",
    "adopt",
    "adult",
    "advance",
    "advanced",
    "advantage",
    "adventure",
    "advertising",
    "advice",
    "advise",
    "adviser",
    "advocate",
    "affair",
    "affect",
    "afford",
    "afraid",
    "African",
    "African-American",
    "after",
    "afternoon",
    "again",
    "against",
    "age",
    "agency",
    "agenda",
    "agent",
    "aggressive",
    "ago",
    "agree",
    "agreement",
    "agricultural",
    "ah",
    "ahead",
    "aid",
    "aide",
    "AIDS",
    "aim",
    "air",
    "aircraft",
    "airline",
    "airport",
    "album",
    "alcohol",
    "alive",
    "all",
    "alliance",
    "allow",
    "ally",
    "almost",
    "alone",
    "along",
    "already",
    "also",
    "alter",
    "alternative",
    "although",
    "always",
    "AM",
    "amazing",
    "American",
    "among",
    "amount",
    "analysis",
    "analyst",
    "analyze",
    "ancient",
    "and",
    "anger",
    "angle",
    "angry",
    "animal",
    "anniversary",
    "announce",
    "annual",
    "another",
    "answer",
    "anticipate",
    "anxiety",
    "any",
    "anybody",
    "anymore",
    "anyone",
    "anything",
    "anyway",
    "anywhere",
    "apart",
    "apartment",
    "apparent",
    "apparently",
    "appeal",
    "appear",
    "appearance",
    "apple",
    "application",
    "apply",
    "appoint",
    "appointment",
    "appreciate",
    "approach",
    "appropriate",
    "approval",
    "approve",
    "approximately",
    "Arab",
    "architect",
    "area",
    "argue",
    "argument",
    "arise",
    "arm",
    "armed",
    "army",
    "around",
    "arrange",
    "arrangement",
    "arrest",
    "arrival",
    "arrive",
    "art",
    "article",
    "artist",
    "artistic",
    "as",
    "Asian",
    "aside",
    "ask",
    "asleep",
    "aspect",
    "assault",
    "assert",
    "assess",
    "assessment",
    "asset",
    "assign",
    "assignment",
    "assist",
    "assistance",
    "assistant",
    "associate",
    "association",
    "assume",
    "assumption",
    "assure",
    "at",
    "athlete",
    "athletic",
    "atmosphere",
    "attach",
    "attack",
    "attempt",
    "attend",
    "attention",
    "attitude",
    "attorney",
    "attract",
    "attractive",
    "attribute",
    "audience",
    "author",
    "authority",
    "auto",
    "available",
    "average",
    "avoid",
    "award",
    "aware",
    "awareness",
    "away",
    "awful",
    "baby",
    "back",
    "background",
    "bad",
    "badly",
    "bag",
    "bake",
    "balance",
    "ball",
    "ban",
    "band",
    "bank",
    "bar",
    "barely",
    "barrel",
    "barrier",
    "base",
    "baseball",
    "basic",
    "basically",
    "basis",
    "basket",
    "basketball",
    "bathroom",
    "battery",
    "battle",
    "be",
    "beach",
    "bean",
    "bear",
    "beat",
    "beautiful",
    "beauty",
    "because",
    "become",
    "bed",
    "bedroom",
    "beer",
    "before",
    "begin",
    "beginning",
    "behavior",
    "behind",
    "being",
    "belief",
    "believe",
    "bell",
    "belong",
    "below",
    "belt",
    "bench",
    "bend",
    "beneath",
    "benefit",
    "beside",
    "besides",
    "best",
    "bet",
    "better",
    "between",
    "beyond",
    "Bible",
    "big",
    "bike",
    "bill",
    "billion",
    "bind",
    "biological",
    "bird",
    "birth",
    "birthday",
    "bit",
    "bite",
    "black",
    "blade",
    "blame",
    "blanket",
    "blind",
    "block",
    "blood",
    "blow",
    "blue",
    "board",
    "boat",
    "body",
    "bomb",
    "bombing",
    "bond",
    "bone",
    "book",
    "boom",
    "boot",
    "border",
    "born",
    "borrow",
    "boss",
    "both",
    "bother",
    "bottle",
    "bottom",
    "boundary",
    "bowl",
    "box",
    "boy",
    "boyfriend",
    "brain",
    "branch",
    "brand",
    "bread",
    "break",
    "breakfast",
    "breast",
    "breath",
    "breathe",
    "brick",
    "bridge",
    "brief",
    "briefly",
    "bright",
    "brilliant",
    "bring",
    "British",
    "broad",
    "broken",
    "brother",
    "brown",
    "brush",
    "buck",
    "budget",
    "build",
    "building",
    "bullet",
    "bunch",
    "burden",
    "burn",
    "bury",
    "bus",
    "business",
    "busy",
    "but",
    "butter",
    "button",
    "buy",
    "buyer",
    "by",
    "cabin",
    "cabinet",
    "cable",
    "cake",
    "calculate",
    "call",
    "camera",
    "camp",
    "campaign",
    "campus",
    "can",
    "Canadian",
    "cancer",
    "candidate",
    "cap",
    "capability",
    "capable",
    "capacity",
    "capital",
    "captain",
    "capture",
    "car",
    "carbon",
    "card",
    "care",
    "career",
    "careful",
    "carefully",
    "carrier",
    "carry",
    "case",
    "cash",
    "cast",
    "cat",
    "catch",
    "category",
    "Catholic",
    "cause",
    "ceiling",
    "celebrate",
    "celebration",
    "celebrity",
    "cell",
    "center",
    "central",
    "century",
    "CEO",
    "ceremony",
    "certain",
    "certainly",
    "chain",
    "chair",
    "chairman",
    "challenge",
    "chamber",
    "champion",
    "championship",
    "chance",
    "change",
    "changing",
    "channel",
    "chapter",
    "character",
    "characteristic",
    "characterize",
    "charge",
    "charity",
    "chart",
    "chase",
    "cheap",
    "check",
    "cheek",
    "cheese",
    "chef",
    "chemical",
    "chest",
    "chicken",
    "chief",
    "child",
    "childhood",
    "Chinese",
    "chip",
    "chocolate",
    "choice",
    "cholesterol",
    "choose",
    "Christian",
    "Christmas",
    "church",
    "cigarette",
    "circle",
    "circumstance",
    "cite",
    "citizen",
    "city",
    "civil",
    "civilian",
    "claim",
    "class",
    "classic",
    "classroom",
    "clean",
    "clear",
    "clearly",
    "client",
    "climate",
    "climb",
    "clinic",
    "clinical",
    "clock",
    "close",
    "closely",
    "closer",
    "clothes",
    "clothing",
    "cloud",
    "club",
    "clue",
    "cluster",
    "coach",
    "coal",
    "coalition",
    "coast",
    "coat",
    "code",
    "coffee",
    "cognitive",
    "cold",
    "collapse",
    "colleague",
    "collect",
    "collection",
    "collective",
    "college",
    "colonial",
    "color",
    "column",
    "combination",
    "combine",
    "come",
    "comedy",
    "comfort",
    "comfortable",
    "command",
    "commander",
    "comment",
    "commercial",
    "commission",
    "commit",
    "commitment",
    "committee",
    "common",
    "communicate",
    "communication",
    "community",
    "company",
    "compare",
    "comparison",
    "compete",
    "competition",
    "competitive",
    "competitor",
    "complain",
    "complaint",
    "complete",
    "completely",
    "complex",
    "complicated",
    "component",
    "compose",
    "composition",
    "comprehensive",
    "computer",
    "concentrate",
    "concentration",
    "concept",
    "concern",
    "concerned",
    "concert",
    "conclude",
    "conclusion",
    "concrete",
    "condition",
    "conduct",
    "conference",
    "confidence",
    "confident",
    "confirm",
    "conflict",
    "confront",
    "confusion",
    "Congress",
    "congressional",
    "connect",
    "connection",
    "consciousness",
    "consensus",
    "consequence",
    "conservative",
    "consider",
    "considerable",
    "consideration",
    "consist",
    "consistent",
    "constant",
    "constantly",
    "constitute",
    "constitutional",
    "construct",
    "construction",
    "consultant",
    "consume",
    "consumer",
    "consumption",
    "contact",
    "contain",
    "container",
    "contemporary",
    "content",
    "contest",
    "context",
    "continue",
    "continued",
    "contract",
    "contrast",
    "contribute",
    "contribution",
    "control",
    "controversial",
    "controversy",
    "convention",
    "conventional",
    "conversation",
    "convert",
    "conviction",
    "convince",
    "cook",
    "cookie",
    "cooking",
    "cool",
    "cooperation",
    "cop",
    "cope",
    "copy",
    "core",
    "corn",
    "corner",
    "corporate",
    "corporation",
    "correct",
    "correspondent",
    "cost",
    "cotton",
    "couch",
    "could",
    "council",
    "counselor",
    "count",
    "counter",
    "country",
    "county",
    "couple",
    "courage",
    "course",
    "court",
    "cousin",
    "cover",
    "coverage",
    "cow",
    "crack",
    "craft",
    "crash",
    "crazy",
    "cream",
    "create",
    "creation",
    "creative",
    "creature",
    "credit",
    "crew",
    "crime",
    "criminal",
    "crisis",
    "criteria",
    "critic",
    "critical",
    "criticism",
    "criticize",
    "crop",
    "cross",
    "crowd",
    "crucial",
    "cry",
    "cultural",
    "culture",
    "cup",
    "curious",
    "current",
    "currently",
    "curriculum",
    "custom",
    "customer",
    "cut",
    "cycle",
    "dad",
    "daily",
    "damage",
    "dance",
    "danger",
    "dangerous",
    "dare",
    "dark",
    "darkness",
    "data",
    "date",
    "daughter",
    "day",
    "dead",
    "deal",
    "dealer",
    "dear",
    "death",
    "debate",
    "debt",
    "decade",
    "decide",
    "decision",
    "deck",
    "declare",
    "decline",
    "decrease",
    "deep",
    "deeply",
    "deer",
    "defeat",
    "defend",
    "defendant",
    "defense",
    "defensive",
    "deficit",
    "define",
    "definitely",
    "definition",
    "degree",
    "delay",
    "deliver",
    "delivery",
    "demand",
    "democracy",
    "Democrat",
    "democratic",
    "demonstrate",
    "demonstration",
    "deny",
    "department",
    "depend",
    "dependent",
    "depending",
    "depict",
    "depression",
    "depth",
    "deputy",
    "derive",
    "describe",
    "description",
    "desert",
    "deserve",
    "design",
    "designer",
    "desire",
    "desk",
    "desperate",
    "despite",
    "destroy",
    "destruction",
    "detail",
    "detailed",
    "detect",
    "determine",
    "develop",
    "developing",
    "development",
    "device",
    "devote",
    "dialogue",
    "die",
    "diet",
    "differ",
    "difference",
    "different",
    "differently",
    "difficult",
    "difficulty",
    "dig",
    "digital",
    "dimension",
    "dining",
    "dinner",
    "direct",
    "direction",
    "directly",
    "director",
    "dirt",
    "dirty",
    "disability",
    "disagree",
    "disappear",
    "disaster",
    "discipline",
    "discourse",
    "discover",
    "discovery",
    "discrimination",
    "discuss",
    "discussion",
    "disease",
    "dish",
    "dismiss",
    "disorder",
    "display",
    "dispute",
    "distance",
    "distant",
    "distinct",
    "distinction",
    "distinguish",
    "distribute",
    "distribution",
    "district",
    "diverse",
    "diversity",
    "divide",
    "division",
    "divorce",
    "DNA",
    "do",
    "doctor",
    "document",
    "dog",
    "domestic",
    "dominant",
    "dominate",
    "door",
    "double",
    "doubt",
    "down",
    "downtown",
    "dozen",
    "draft",
    "drag",
    "drama",
    "dramatic",
    "dramatically",
    "draw",
    "drawing",
    "dream",
    "dress",
    "drink",
    "drive",
    "driver",
    "drop",
    "drug",
    "dry",
    "due",
    "during",
    "dust",
    "duty",
    "each",
    "eager",
    "ear",
    "early",
    "earn",
    "earnings",
    "earth",
    "ease",
    "easily",
    "east",
    "eastern",
    "easy",
    "eat",
    "economic",
    "economics",
    "economist",
    "economy",
    "edge",
    "edition",
    "editor",
    "educate",
    "education",
    "educational",
    "educator",
    "effect",
    "effective",
    "effectively",
    "efficiency",
    "efficient",
    "effort",
    "egg",
    "eight",
    "either",
    "elderly",
    "elect",
    "election",
    "electric",
    "electricity",
    "electronic",
    "element",
    "elementary",
    "eliminate",
    "elite",
    "else",
    "elsewhere",
    "e-mail",
    "embrace",
    "emerge",
    "emergency",
    "emission",
    "emotion",
    "emotional",
    "emphasis",
    "emphasize",
    "employ",
    "employee",
    "employer",
    "employment",
    "empty",
    "enable",
    "encounter",
    "encourage",
    "end",
    "enemy",
    "energy",
    "enforcement",
    "engage",
    "engine",
    "engineer",
    "engineering",
    "English",
    "enhance",
    "enjoy",
    "enormous",
    "enough",
    "ensure",
    "enter",
    "enterprise",
    "entertainment",
    "entire",
    "entirely",
    "entrance",
    "entry",
    "environment",
    "environmental",
    "episode",
    "equal",
    "equally",
    "equipment",
    "era",
    "error",
    "escape",
    "especially",
    "essay",
    "essential",
    "essentially",
    "establish",
    "establishment",
    "estate",
    "estimate",
    "etc",
    "ethics",
    "ethnic",
    "European",
    "evaluate",
    "evaluation",
    "even",
    "evening",
    "event",
    "eventually",
    "ever",
    "every",
    "everybody",
    "everyday",
    "everyone",
    "everything",
    "everywhere",
    "evidence",
    "evolution",
    "evolve",
    "exact",
    "exactly",
    "examination",
    "examine",
    "example",
    "exceed",
    "excellent",
    "except",
    "exception",
    "exchange",
    "exciting",
    "executive",
    "exercise",
    "exhibit",
    "exhibition",
    "exist",
    "existence",
    "existing",
    "expand",
    "expansion",
    "expect",
    "expectation",
    "expense",
    "expensive",
    "experience",
    "experiment",
    "expert",
    "explain",
    "explanation",
    "explode",
    "explore",
    "explosion",
    "expose",
    "exposure",
    "express",
    "expression",
    "extend",
    "extension",
    "extensive",
    "extent",
    "external",
    "extra",
    "extraordinary",
    "extreme",
    "extremely",
    "eye",
    "fabric",
    "face",
    "facility",
    "fact",
    "factor",
    "factory",
    "faculty",
    "fade",
    "fail",
    "failure",
    "fair",
    "fairly",
    "faith",
    "fall",
    "FALSE",
    "familiar",
    "family",
    "famous",
    "fan",
    "fantasy",
    "far",
    "farm",
    "farmer",
    "fashion",
    "fast",
    "fat",
    "fate",
    "father",
    "fault",
    "favor",
    "favorite",
    "fear",
    "feature",
    "federal",
    "fee",
    "feed",
    "feel",
    "feeling",
    "fellow",
    "female",
    "fence",
    "few",
    "fewer",
    "fiber",
    "fiction",
    "field",
    "fifteen",
    "fifth",
    "fifty",
    "fight",
    "fighter",
    "fighting",
    "figure",
    "file",
    "fill",
    "film",
    "final",
    "finally",
    "finance",
    "financial",
    "find",
    "finding",
    "fine",
    "finger",
    "finish",
    "fire",
    "firm",
    "first",
    "fish",
    "fishing",
    "fit",
    "fitness",
    "five",
    "fix",
    "flag",
    "flame",
    "flat",
    "flavor",
    "flee",
    "flesh",
    "flight",
    "float",
    "floor",
    "flow",
    "flower",
    "fly",
    "focus",
    "folk",
    "follow",
    "following",
    "food",
    "foot",
    "football",
    "for",
    "force",
    "foreign",
    "forest",
    "forever",
    "forget",
    "form",
    "formal",
    "formation",
    "former",
    "formula",
    "forth",
    "fortune",
    "forward",
    "found",
    "foundation",
    "founder",
    "four",
    "fourth",
    "frame",
    "framework",
    "free",
    "freedom",
    "freeze",
    "French",
    "frequency",
    "frequent",
    "frequently",
    "fresh",
    "friend",
    "friendly",
    "friendship",
    "from",
    "front",
    "fruit",
    "frustration",
    "fuel",
    "full",
    "fully",
    "fun",
    "function",
    "fund",
    "fundamental",
    "funding",
    "funeral",
    "funny",
    "furniture",
    "furthermore",
    "future",
    "gain",
    "galaxy",
    "gallery",
    "game",
    "gang",
    "gap",
    "garage",
    "garden",
    "garlic",
    "gas",
    "gate",
    "gather",
    "gay",
    "gaze",
    "gear",
    "gender",
    "gene",
    "general",
    "generally",
    "generate",
    "generation",
    "genetic",
    "gentleman",
    "gently",
    "German",
    "gesture",
    "get",
    "ghost",
    "giant",
    "gift",
    "gifted",
    "girl",
    "girlfriend",
    "give",
    "given",
    "glad",
    "glance",
    "glass",
    "global",
    "glove",
    "go",
    "goal",
    "God",
    "gold",
    "golden",
    "golf",
    "good",
    "government",
    "governor",
    "grab",
    "grade",
    "gradually",
    "graduate",
    "grain",
    "grand",
    "grandfather",
    "grandmother",
    "grant",
    "grass",
    "grave",
    "gray",
    "great",
    "greatest",
    "green",
    "grocery",
    "ground",
    "group",
    "grow",
    "growing",
    "growth",
    "guarantee",
    "guard",
    "guess",
    "guest",
    "guide",
    "guideline",
    "guilty",
    "gun",
    "guy",
    "habit",
    "habitat",
    "hair",
    "half",
    "hall",
    "hand",
    "handful",
    "handle",
    "hang",
    "happen",
    "happy",
    "hard",
    "hardly",
    "hat",
    "hate",
    "have",
    "he",
    "head",
    "headline",
    "headquarters",
    "health",
    "healthy",
    "hear",
    "hearing",
    "heart",
    "heat",
    "heaven",
    "heavily",
    "heavy",
    "heel",
    "height",
    "helicopter",
    "hell",
    "hello",
    "help",
    "helpful",
    "her",
    "here",
    "heritage",
    "hero",
    "herself",
    "hey",
    "hi",
    "hide",
    "high",
    "highlight",
    "highly",
    "highway",
    "hill",
    "him",
    "himself",
    "hip",
    "hire",
    "his",
    "historian",
    "historic",
    "historical",
    "history",
    "hit",
    "hold",
    "hole",
    "holiday",
    "holy",
    "home",
    "homeless",
    "honest",
    "honey",
    "honor",
    "hope",
    "horizon",
    "horror",
    "horse",
    "hospital",
    "host",
    "hot",
    "hotel",
    "hour",
    "house",
    "household",
    "housing",
    "how",
    "however",
    "huge",
    "human",
    "humor",
    "hundred",
    "hungry",
    "hunter",
    "hunting",
    "hurt",
    "husband",
    "hypothesis",
    "I",
    "ice",
    "idea",
    "ideal",
    "identification",
    "identify",
    "identity",
    "ie",
    "if",
    "ignore",
    "ill",
    "illegal",
    "illness",
    "illustrate",
    "image",
    "imagination",
    "imagine",
    "immediate",
    "immediately",
    "immigrant",
    "immigration",
    "impact",
    "implement",
    "implication",
    "imply",
    "importance",
    "important",
    "impose",
    "impossible",
    "impress",
    "impression",
    "impressive",
    "improve",
    "improvement",
    "in",
    "incentive",
    "incident",
    "include",
    "including",
    "income",
    "incorporate",
    "increase",
    "increased",
    "increasing",
    "increasingly",
    "incredible",
    "indeed",
    "independence",
    "independent",
    "index",
    "Indian",
    "indicate",
    "indication",
    "individual",
    "industrial",
    "industry",
    "infant",
    "infection",
    "inflation",
    "influence",
    "inform",
    "information",
    "ingredient",
    "initial",
    "initially",
    "initiative",
    "injury",
    "inner",
    "innocent",
    "inquiry",
    "inside",
    "insight",
    "insist",
    "inspire",
    "install",
    "instance",
    "instead",
    "institution",
    "institutional",
    "instruction",
    "instructor",
    "instrument",
    "insurance",
    "intellectual",
    "intelligence",
    "intend",
    "intense",
    "intensity",
    "intention",
    "interaction",
    "interest",
    "interested",
    "interesting",
    "internal",
    "international",
    "Internet",
    "interpret",
    "interpretation",
    "intervention",
    "interview",
    "into",
    "introduce",
    "introduction",
    "invasion",
    "invest",
    "investigate",
    "investigation",
    "investigator",
    "investment",
    "investor",
    "invite",
    "involve",
    "involved",
    "involvement",
    "Iraqi",
    "Irish",
    "iron",
    "Islamic",
    "island",
    "Israeli",
    "issue",
    "it",
    "Italian",
    "item",
    "its",
    "itself",
    "jacket",
    "jail",
    "Japanese",
    "jet",
    "Jew",
    "Jewish",
    "job",
    "join",
    "joint",
    "joke",
    "journal",
    "journalist",
    "journey",
    "joy",
    "judge",
    "judgment",
    "juice",
    "jump",
    "junior",
    "jury",
    "just",
    "justice",
    "justify",
    "keep",
    "key",
    "kick",
    "kid",
    "kill",
    "killer",
    "killing",
    "kind",
    "king",
    "kiss",
    "kitchen",
    "knee",
    "knife",
    "knock",
    "know",
    "knowledge",
    "lab",
    "label",
    "labor",
    "laboratory",
    "lack",
    "lady",
    "lake",
    "land",
    "landscape",
    "language",
    "lap",
    "large",
    "largely",
    "last",
    "late",
    "later",
    "Latin",
    "latter",
    "laugh",
    "launch",
    "law",
    "lawn",
    "lawsuit",
    "lawyer",
    "lay",
    "layer",
    "lead",
    "leader",
    "leadership",
    "leading",
    "leaf",
    "league",
    "lean",
    "learn",
    "learning",
    "least",
    "leather",
    "leave",
    "left",
    "leg",
    "legacy",
    "legal",
    "legend",
    "legislation",
    "legitimate",
    "lemon",
    "length",
    "less",
    "lesson",
    "let",
    "letter",
    "level",
    "liberal",
    "library",
    "license",
    "lie",
    "life",
    "lifestyle",
    "lifetime",
    "lift",
    "light",
    "like",
    "likely",
    "limit",
    "limitation",
    "limited",
    "line",
    "link",
    "lip",
    "list",
    "listen",
    "literally",
    "literary",
    "literature",
    "little",
    "live",
    "living",
    "load",
    "loan",
    "local",
    "locate",
    "location",
    "lock",
    "long",
    "long-term",
    "look",
    "loose",
    "lose",
    "loss",
    "lost",
    "lot",
    "lots",
    "loud",
    "love",
    "lovely",
    "lover",
    "low",
    "lower",
    "luck",
    "lucky",
    "lunch",
    "lung",
    "machine",
    "mad",
    "magazine",
    "mail",
    "main",
    "mainly",
    "maintain",
    "maintenance",
    "major",
    "majority",
    "make",
    "maker",
    "makeup",
    "male",
    "mall",
    "man",
    "manage",
    "management",
    "manager",
    "manner",
    "manufacturer",
    "manufacturing",
    "many",
    "map",
    "margin",
    "mark",
    "market",
    "marketing",
    "marriage",
    "married",
    "marry",
    "mask",
    "mass",
    "massive",
    "master",
    "match",
    "material",
    "math",
    "matter",
    "may",
    "maybe",
    "mayor",
    "me",
    "meal",
    "mean",
    "meaning",
    "meanwhile",
    "measure",
    "measurement",
    "meat",
    "mechanism",
    "media",
    "medical",
    "medication",
    "medicine",
    "medium",
    "meet",
    "meeting",
    "member",
    "membership",
    "memory",
    "mental",
    "mention",
    "menu",
    "mere",
    "merely",
    "mess",
    "message",
    "metal",
    "meter",
    "method",
    "Mexican",
    "middle",
    "might",
    "military",
    "milk",
    "million",
    "mind",
    "mine",
    "minister",
    "minor",
    "minority",
    "minute",
    "miracle",
    "mirror",
    "miss",
    "missile",
    "mission",
    "mistake",
    "mix",
    "mixture",
    "mm-hmm",
    "mode",
    "model",
    "moderate",
    "modern",
    "modest",
    "mom",
    "moment",
    "money",
    "monitor",
    "month",
    "mood",
    "moon",
    "moral",
    "more",
    "moreover",
    "morning",
    "mortgage",
    "most",
    "mostly",
    "mother",
    "motion",
    "motivation",
    "motor",
    "mount",
    "mountain",
    "mouse",
    "mouth",
    "move",
    "movement",
    "movie",
    "Mr",
    "Mrs",
    "Ms",
    "much",
    "multiple",
    "murder",
    "muscle",
    "museum",
    "music",
    "musical",
    "musician",
    "Muslim",
    "must",
    "mutual",
    "my",
    "myself",
    "mystery",
    "myth",
    "naked",
    "name",
    "narrative",
    "narrow",
    "nation",
    "national",
    "native",
    "natural",
    "naturally",
    "nature",
    "near",
    "nearby",
    "nearly",
    "necessarily",
    "necessary",
    "neck",
    "need",
    "negative",
    "negotiate",
    "negotiation",
    "neighbor",
    "neighborhood",
    "neither",
    "nerve",
    "nervous",
    "net",
    "network",
    "never",
    "nevertheless",
    "new",
    "newly",
    "news",
    "newspaper",
    "next",
    "nice",
    "night",
    "nine",
    "no",
    "nobody",
    "nod",
    "noise",
    "nomination",
    "none",
    "nonetheless",
    "nor",
    "normal",
    "normally",
    "north",
    "northern",
    "nose",
    "not",
    "note",
    "nothing",
    "notice",
    "notion",
    "novel",
    "now",
    "nowhere",
    "n't",
    "nuclear",
    "number",
    "numerous",
    "nurse",
    "nut",
    "object",
    "objective",
    "obligation",
    "observation",
    "observe",
    "observer",
    "obtain",
    "obvious",
    "obviously",
    "occasion",
    "occasionally",
    "occupation",
    "occupy",
    "occur",
    "ocean",
    "odd",
    "odds",
    "of",
    "off",
    "offense",
    "offensive",
    "offer",
    "office",
    "officer",
    "official",
    "often",
    "oh",
    "oil",
    "ok",
    "okay",
    "old",
    "Olympic",
    "on",
    "once",
    "one",
    "ongoing",
    "onion",
    "online",
    "only",
    "onto",
    "open",
    "opening",
    "operate",
    "operating",
    "operation",
    "operator",
    "opinion",
    "opponent",
    "opportunity",
    "oppose",
    "opposite",
    "opposition",
    "option",
    "or",
    "orange",
    "order",
    "ordinary",
    "organic",
    "organization",
    "organize",
    "orientation",
    "origin",
    "original",
    "originally",
    "other",
    "others",
    "otherwise",
    "ought",
    "our",
    "ourselves",
    "out",
    "outcome",
    "outside",
    "oven",
    "over",
    "overall",
    "overcome",
    "overlook",
    "owe",
    "own",
    "owner",
    "pace",
    "pack",
    "package",
    "page",
    "pain",
    "painful",
    "paint",
    "painter",
    "painting",
    "pair",
    "pale",
    "Palestinian",
    "palm",
    "pan",
    "panel",
    "pant",
    "paper",
    "parent",
    "park",
    "parking",
    "part",
    "participant",
    "participate",
    "participation",
    "particular",
    "particularly",
    "partly",
    "partner",
    "partnership",
    "party",
    "pass",
    "passage",
    "passenger",
    "passion",
    "past",
    "patch",
    "path",
    "patient",
    "pattern",
    "pause",
    "pay",
    "payment",
    "PC",
    "peace",
    "peak",
    "peer",
    "penalty",
    "people",
    "pepper",
    "per",
    "perceive",
    "percentage",
    "perception",
    "perfect",
    "perfectly",
    "perform",
    "performance",
    "perhaps",
    "period",
    "permanent",
    "permission",
    "permit",
    "person",
    "personal",
    "personality",
    "personally",
    "personnel",
    "perspective",
    "persuade",
    "pet",
    "phase",
    "phenomenon",
    "philosophy",
    "phone",
    "photo",
    "photograph",
    "photographer",
    "phrase",
    "physical",
    "physically",
    "physician",
    "piano",
    "pick",
    "picture",
    "pie",
    "piece",
    "pile",
    "pilot",
    "pine",
    "pink",
    "pipe",
    "pitch",
    "place",
    "plan",
    "plane",
    "planet",
    "planning",
    "plant",
    "plastic",
    "plate",
    "platform",
    "play",
    "player",
    "please",
    "pleasure",
    "plenty",
    "plot",
    "plus",
    "PM",
    "pocket",
    "poem",
    "poet",
    "poetry",
    "point",
    "pole",
    "police",
    "policy",
    "political",
    "politically",
    "politician",
    "politics",
    "poll",
    "pollution",
    "pool",
    "poor",
    "pop",
    "popular",
    "population",
    "porch",
    "port",
    "portion",
    "portrait",
    "portray",
    "pose",
    "position",
    "positive",
    "possess",
    "possibility",
    "possible",
    "possibly",
    "post",
    "pot",
    "potato",
    "potential",
    "potentially",
    "pound",
    "pour",
    "poverty",
    "powder",
    "power",
    "powerful",
    "practical",
    "practice",
    "pray",
    "prayer",
    "precisely",
    "predict",
    "prefer",
    "preference",
    "pregnancy",
    "pregnant",
    "preparation",
    "prepare",
    "prescription",
    "presence",
    "present",
    "presentation",
    "preserve",
    "president",
    "presidential",
    "press",
    "pressure",
    "pretend",
    "pretty",
    "prevent",
    "previous",
    "previously",
    "price",
    "pride",
    "priest",
    "primarily",
    "primary",
    "prime",
    "principal",
    "principle",
    "print",
    "prior",
    "priority",
    "prison",
    "prisoner",
    "privacy",
    "private",
    "probably",
    "problem",
    "procedure",
    "proceed",
    "process",
    "produce",
    "producer",
    "product",
    "production",
    "profession",
    "professional",
    "professor",
    "profile",
    "profit",
    "program",
    "progress",
    "project",
    "prominent",
    "promise",
    "promote",
    "prompt",
    "proof",
    "proper",
    "properly",
    "property",
    "proportion",
    "proposal",
    "propose",
    "proposed",
    "prosecutor",
    "prospect",
    "protect",
    "protection",
    "protein",
    "protest",
    "proud",
    "prove",
    "provide",
    "provider",
    "province",
    "provision",
    "psychological",
    "psychologist",
    "psychology",
    "public",
    "publication",
    "publicly",
    "publish",
    "publisher",
    "pull",
    "punishment",
    "purchase",
    "pure",
    "purpose",
    "pursue",
    "push",
    "put",
    "qualify",
    "quality",
    "quarter",
    "quarterback",
    "question",
    "quick",
    "quickly",
    "quiet",
    "quietly",
    "quit",
    "quite",
    "quote",
    "race",
    "racial",
    "radical",
    "radio",
    "rail",
    "rain",
    "raise",
    "range",
    "rank",
    "rapid",
    "rapidly",
    "rare",
    "rarely",
    "rate",
    "rather",
    "rating",
    "ratio",
    "raw",
    "reach",
    "react",
    "reaction",
    "read",
    "reader",
    "reading",
    "ready",
    "real",
    "reality",
    "realize",
    "really",
    "reason",
    "reasonable",
    "recall",
    "receive",
    "recent",
    "recently",
    "recipe",
    "recognition",
    "recognize",
    "recommend",
    "recommendation",
    "record",
    "recording",
    "recover",
    "recovery",
    "recruit",
    "red",
    "reduce",
    "reduction",
    "refer",
    "reference",
    "reflect",
    "reflection",
    "reform",
    "refugee",
    "refuse",
    "regard",
    "regarding",
    "regardless",
    "regime",
    "region",
    "regional",
    "register",
    "regular",
    "regularly",
    "regulate",
    "regulation",
    "reinforce",
    "reject",
    "relate",
    "relation",
    "relationship",
    "relative",
    "relatively",
    "relax",
    "release",
    "relevant",
    "relief",
    "religion",
    "religious",
    "rely",
    "remain",
    "remaining",
    "remarkable",
    "remember",
    "remind",
    "remote",
    "remove",
    "repeat",
    "repeatedly",
    "replace",
    "reply",
    "report",
    "reporter",
    "represent",
    "representation",
    "representative",
    "Republican",
    "reputation",
    "request",
    "require",
    "requirement",
    "research",
    "researcher",
    "resemble",
    "reservation",
    "resident",
    "resist",
    "resistance",
    "resolution",
    "resolve",
    "resort",
    "resource",
    "respect",
    "respond",
    "respondent",
    "response",
    "responsibility",
    "responsible",
    "rest",
    "restaurant",
    "restore",
    "restriction",
    "result",
    "retain",
    "retire",
    "retirement",
    "return",
    "reveal",
    "revenue",
    "review",
    "revolution",
    "rhythm",
    "rice",
    "rich",
    "rid",
    "ride",
    "rifle",
    "right",
    "ring",
    "rise",
    "risk",
    "river",
    "road",
    "rock",
    "role",
    "roll",
    "romantic",
    "roof",
    "room",
    "root",
    "rope",
    "rose",
    "rough",
    "roughly",
    "round",
    "route",
    "routine",
    "row",
    "rub",
    "rule",
    "run",
    "running",
    "rural",
    "rush",
    "Russian",
    "sacred",
    "sad",
    "safe",
    "safety",
    "sake",
    "salad",
    "salary",
    "sale",
    "sales",
    "salt",
    "same",
    "sample",
    "sanction",
    "sand",
    "satellite",
    "satisfaction",
    "satisfy",
    "sauce",
    "save",
    "saving",
    "say",
    "scale",
    "scandal",
    "scared",
    "scenario",
    "scene",
    "schedule",
    "scheme",
    "scholar",
    "scholarship",
    "school",
    "science",
    "scientific",
    "scientist",
    "scope",
    "score",
    "scream",
    "screen",
    "script",
    "sea",
    "search",
    "season",
    "seat",
    "second",
    "secret",
    "secretary",
    "section",
    "sector",
    "secure",
    "security",
    "see",
    "seed",
    "seek",
    "seem",
    "segment",
    "seize",
    "select",
    "selection",
    "self",
    "sell",
    "Senate",
    "senator",
    "send",
    "senior",
    "sense",
    "sensitive",
    "sentence",
    "separate",
    "sequence",
    "series",
    "serious",
    "seriously",
    "serve",
    "service",
    "session",
    "set",
    "setting",
    "settle",
    "settlement",
    "seven",
    "several",
    "severe",
    "sex",
    "sexual",
    "shade",
    "shadow",
    "shake",
    "shall",
    "shape",
    "share",
    "sharp",
    "she",
    "sheet",
    "shelf",
    "shell",
    "shelter",
    "shift",
    "shine",
    "ship",
    "shirt",
    "shit",
    "shock",
    "shoe",
    "shoot",
    "shooting",
    "shop",
    "shopping",
    "shore",
    "short",
    "shortly",
    "shot",
    "should",
    "shoulder",
    "shout",
    "show",
    "shower",
    "shrug",
    "shut",
    "sick",
    "side",
    "sigh",
    "sight",
    "sign",
    "signal",
    "significance",
    "significant",
    "significantly",
    "silence",
    "silent",
    "silver",
    "similar",
    "similarly",
    "simple",
    "simply",
    "sin",
    "since",
    "sing",
    "singer",
    "single",
    "sink",
    "sir",
    "sister",
    "sit",
    "site",
    "situation",
    "six",
    "size",
    "ski",
    "skill",
    "skin",
    "sky",
    "slave",
    "sleep",
    "slice",
    "slide",
    "slight",
    "slightly",
    "slip",
    "slow",
    "slowly",
    "small",
    "smart",
    "smell",
    "smile",
    "smoke",
    "smooth",
    "snap",
    "snow",
    "so",
    "so-called",
    "soccer",
    "social",
    "society",
    "soft",
    "software",
    "soil",
    "solar",
    "soldier",
    "solid",
    "solution",
    "solve",
    "some",
    "somebody",
    "somehow",
    "someone",
    "something",
    "sometimes",
    "somewhat",
    "somewhere",
    "son",
    "song",
    "soon",
    "sophisticated",
    "sorry",
    "sort",
    "soul",
    "sound",
    "soup",
    "source",
    "south",
    "southern",
    "Soviet",
    "space",
    "Spanish",
    "speak",
    "speaker",
    "special",
    "specialist",
    "species",
    "specific",
    "specifically",
    "speech",
    "speed",
    "spend",
    "spending",
    "spin",
    "spirit",
    "spiritual",
    "split",
    "spokesman",
    "sport",
    "spot",
    "spread",
    "spring",
    "square",
    "squeeze",
    "stability",
    "stable",
    "staff",
    "stage",
    "stair",
    "stake",
    "stand",
    "standard",
    "standing",
    "star",
    "stare",
    "start",
    "state",
    "statement",
    "station",
    "statistics",
    "status",
    "stay",
    "steady",
    "steal",
    "steel",
    "step",
    "stick",
    "still",
    "stir",
    "stock",
    "stomach",
    "stone",
    "stop",
    "storage",
    "store",
    "storm",
    "story",
    "straight",
    "strange",
    "stranger",
    "strategic",
    "strategy",
    "stream",
    "street",
    "strength",
    "strengthen",
    "stress",
    "stretch",
    "strike",
    "string",
    "strip",
    "stroke",
    "strong",
    "strongly",
    "structure",
    "struggle",
    "student",
    "studio",
    "study",
    "stuff",
    "stupid",
    "style",
    "subject",
    "submit",
    "subsequent",
    "substance",
    "substantial",
    "succeed",
    "success",
    "successful",
    "successfully",
    "such",
    "sudden",
    "suddenly",
    "sue",
    "suffer",
    "sufficient",
    "sugar",
    "suggest",
    "suggestion",
    "suicide",
    "suit",
    "summer",
    "summit",
    "sun",
    "super",
    "supply",
    "support",
    "supporter",
    "suppose",
    "supposed",
    "Supreme",
    "sure",
    "surely",
    "surface",
    "surgery",
    "surprise",
    "surprised",
    "surprising",
    "surprisingly",
    "surround",
    "survey",
    "survival",
    "survive",
    "survivor",
    "suspect",
    "sustain",
    "swear",
    "sweep",
    "sweet",
    "swim",
    "swing",
    "switch",
    "symbol",
    "symptom",
    "system",
    "table",
    "tablespoon",
    "tactic",
    "tail",
    "take",
    "tale",
    "talent",
    "talk",
    "tall",
    "tank",
    "tap",
    "tape",
    "target",
    "task",
    "taste",
    "tax",
    "taxpayer",
    "tea",
    "teach",
    "teacher",
    "teaching",
    "team",
    "tear",
    "teaspoon",
    "technical",
    "technique",
    "technology",
    "teen",
    "teenager",
    "telephone",
    "telescope",
    "television",
    "tell",
    "temperature",
    "temporary",
    "ten",
    "tend",
    "tendency",
    "tennis",
    "tension",
    "tent",
    "term",
    "terms",
    "terrible",
    "territory",
    "terror",
    "terrorism",
    "terrorist",
    "test",
    "testify",
    "testimony",
    "testing",
    "text",
    "than",
    "thank",
    "thanks",
    "that",
    "the",
    "theater",
    "their",
    "them",
    "theme",
    "themselves",
    "then",
    "theory",
    "therapy",
    "there",
    "therefore",
    "these",
    "they",
    "thick",
    "thin",
    "thing",
    "think",
    "thinking",
    "third",
    "thirty",
    "this",
    "those",
    "though",
    "thought",
    "thousand",
    "threat",
    "threaten",
    "three",
    "throat",
    "through",
    "throughout",
    "throw",
    "thus",
    "ticket",
    "tie",
    "tight",
    "time",
    "tiny",
    "tip",
    "tire",
    "tired",
    "tissue",
    "title",
    "to",
    "tobacco",
    "today",
    "toe",
    "together",
    "tomato",
    "tomorrow",
    "tone",
    "tongue",
    "tonight",
    "too",
    "tool",
    "tooth",
    "top",
    "topic",
    "toss",
    "total",
    "totally",
    "touch",
    "tough",
    "tour",
    "tourist",
    "tournament",
    "toward",
    "towards",
    "tower",
    "town",
    "toy",
    "trace",
    "track",
    "trade",
    "tradition",
    "traditional",
    "traffic",
    "tragedy",
    "trail",
    "train",
    "training",
    "transfer",
    "transform",
    "transformation",
    "transition",
    "translate",
    "transportation",
    "travel",
    "treat",
    "treatment",
    "treaty",
    "tree",
    "tremendous",
    "trend",
    "trial",
    "tribe",
    "trick",
    "trip",
    "troop",
    "trouble",
    "truck",
    "TRUE",
    "truly",
    "trust",
    "truth",
    "try",
    "tube",
    "tunnel",
    "turn",
    "TV",
    "twelve",
    "twenty",
    "twice",
    "twin",
    "two",
    "type",
    "typical",
    "typically",
    "ugly",
    "ultimate",
    "ultimately",
    "unable",
    "uncle",
    "under",
    "undergo",
    "understand",
    "understanding",
    "unfortunately",
    "uniform",
    "union",
    "unique",
    "unit",
    "United",
    "universal",
    "universe",
    "university",
    "unknown",
    "unless",
    "unlike",
    "unlikely",
    "until",
    "unusual",
    "up",
    "upon",
    "upper",
    "urban",
    "urge",
    "us",
    "use",
    "used",
    "useful",
    "user",
    "usual",
    "usually",
    "utility",
    "vacation",
    "valley",
    "valuable",
    "value",
    "variable",
    "variation",
    "variety",
    "various",
    "vary",
    "vast",
    "vegetable",
    "vehicle",
    "venture",
    "version",
    "versus",
    "very",
    "vessel",
    "veteran",
    "via",
    "victim",
    "victory",
    "video",
    "view",
    "viewer",
    "village",
    "violate",
    "violation",
    "violence",
    "violent",
    "virtually",
    "virtue",
    "virus",
    "visible",
    "vision",
    "visit",
    "visitor",
    "visual",
    "vital",
    "voice",
    "volume",
    "volunteer",
    "vote",
    "voter",
    "vs",
    "vulnerable",
    "wage",
    "wait",
    "wake",
    "walk",
    "wall",
    "wander",
    "want",
    "war",
    "warm",
    "warn",
    "warning",
    "wash",
    "waste",
    "watch",
    "water",
    "wave",
    "way",
    "we",
    "weak",
    "wealth",
    "wealthy",
    "weapon",
    "wear",
    "weather",
    "wedding",
    "week",
    "weekend",
    "weekly",
    "weigh",
    "weight",
    "welcome",
    "welfare",
    "well",
    "west",
    "western",
    "wet",
    "what",
    "whatever",
    "wheel",
    "when",
    "whenever",
    "where",
    "whereas",
    "whether",
    "which",
    "while",
    "whisper",
    "white",
    "who",
    "whole",
    "whom",
    "whose",
    "why",
    "wide",
    "widely",
    "widespread",
    "wife",
    "wild",
    "will",
    "willing",
    "win",
    "wind",
    "window",
    "wine",
    "wing",
    "winner",
    "winter",
    "wipe",
    "wire",
    "wisdom",
    "wise",
    "wish",
    "with",
    "withdraw",
    "within",
    "without",
    "witness",
    "woman",
    "wonder",
    "wonderful",
    "wood",
    "wooden",
    "word",
    "work",
    "worker",
    "working",
    "works",
    "workshop",
    "world",
    "worried",
    "worry",
    "worth",
    "would",
    "wound",
    "wrap",
    "write",
    "writer",
    "writing",
    "wrong",
    "yard",
    "yeah",
    "year",
    "yell",
    "yellow",
    "yesterday",
    "yet",
    "yield",
    "you",
    "young",
    "your",
    "yours",
    "yourself",
    "youth",
    "zone"
]
var vocalobject = {}

app.get('/sendNewWord', (req, res) => {
    sendNewWord()
        .then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

function sendNewWord() {
    return new Promise(function (resolve, reject) {
        var vocal = _.sample(vocalArray)
        console.log('push ', vocal)
        var url = `https://glosbe.com/gapi/translate?from=eng&dest=vi&format=json&phrase=${vocal}&pretty=true`
        axios.get(url)
            .then(data => {
                var result = data.data
                if (result.tuc && result.tuc[0] && result.tuc[0].phrase && result.tuc[0].phrase.text && result.tuc[2].phrase.text) {
                    var mean = vocal + ' : ' + result.tuc[0].phrase.text + ', ' + result.tuc[1].phrase.text + ', ' + result.tuc[2].phrase.text
                    console.log('mean', mean)
                    sendVocal(mean)
                    resolve(mean)
                }
            })
            .catch(err => reject(err))
    })

}

//
// setInterval(function () {
//     sendNewWord()
// }, 60 * 60 * 1000)

function sendVocalRes(senderID) {
    sendingAPI(senderID, CONFIG.facebookPage['dumpling'].id, {

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
                    payload: "dumpling_english"
                }]
            }
        }
    }, null, 'dumpling')
}

function sendVocal(vocal) {
    var a = 0
    console.log('start')

    var map = _.each(dataAccount, account => {
        a++
        console.log('account', account.id)
        setTimeout(function () {
            sendingAPI(account.id, CONFIG.facebookPage['dumpling'].id, {
                text: `[English] ${vocal}`
            }, null, 'dumpling')
        }, a * 200)
    })
    return map
}

function sendVocalC(vocal) {
    var a = 0
    console.log('start')

    var map = _.each(dataAccount, account => {
        a++
        console.log('account', account.id)
        setTimeout(function () {
            sendingAPI(account.id, CONFIG.facebookPage['dumpling'].id, {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "button",
                        text: `[ Dumpling_tâm_sự ]
5 lý do vì sao con gái bây giờ không thích có người yêu
Đừng ai hỏi vì sao con gái ế, đơn giản là họ tự thích thế mà thôi!...`,
                        buttons: [{
                            type: "web_url",
                            url: "https://www.facebook.com/dumpling.bot",
                            title: "Đọc tiếp"
                        }]
                    }
                }            }, null, 'dumpling')
        }, a * 200)
    })
    return map
}

// var a = 0
// messageFactoryRef.child('dumpling').once('value', function (snap) {
//     messageFactory = snap.val()
//     var messageFactoryArray = _.toArray(messageFactory)
//     var a = -1
//
//     function loop_a() {
//         a++
//         if (a < messageFactoryArray.length) {
//             var noti = messageFactoryArray[a]
//             dumpling_messageFactoryCol.insert(noti, function (err, data) {
//                 loop_a()
//                 if (err) {
//                     console.log(err)
//                 } else {
//                     console.log('done')
//
//                 }
//             })
//
//         } else console.log('done')
//
//     }
//
//     loop_a()
//
//
// });
// messageFactoryRef.child('dumpling').on('child_changed', function (snap) {
//     messageFactory[snap.key] = snap.val()
// });

// app.get('/staticUser', function (req, res) {
//     var userId = req.param('userId')
//
//     var send = _.where(messageFactory, {senderId: userId}).length
//     var receive = _.where(messageFactory, {recipientId: userId}).length
//     var startTime = 0
//     var most = {}
//     var each = _.each(messageFactory, message => {
//         if (message.recipientId == userId) {
//             if (message.message.text == 'Chúc 2 bạn có những giây phút trò chuyện vui vẻ trên Dumpling ^^') startTime++
//
//             if (!most[message.senderId]) most[message.senderId] = 1
//             else most[message.senderId]++
//         }
//     })
//
//     delete most['493938347612411']
//
//     var staticUser = {send, receive, startTime, most}
//     res.send(staticUser)
//
// })
// app.get('/staticAll', function (req, res) {
//     var {dis = 1, last = 0} = req.query
//     var endTime = Date.now() - last * 24 * 60 * 60 * 1000
//     var startTime = endTime - dis * 24 * 60 * 60 * 1000
//     var startNewConversation = 0
//     var newUser = 0
//     var newMessage = 0
//     var each = _.each(messageFactory, message => {
//         if (message.timestamp > startTime && message.timestamp < endTime) {
//             if (message.senderId != '493938347612411') newMessage++
//             if (message.message && message.message.text == 'Chúc 2 bạn có những giây phút trò chuyện vui vẻ trên Dumpling ^^') startNewConversation++
//             if (message.message && message.message.text == 'đảm bảo 100% bí mật thông tin và nội dung trò chuyện') newUser++
//         }
//
//
//     })
//     var staticAll = {startNewConversation, newUser, newMessage}
//     res.send(staticAll)
//
// })
// app.get('/checkAvai', function (req, res) {
//     var i = 0
//     var each = _.each(dataAccount, user => {
//         if (user.match) {
//             i++
//             setTimeout(function () {
//
//                 var userId = user.id
//                 var match = user.match
//                 var filter = _.where(messageFactory, {senderId: userId, recipientId: match})
//                 var filtered = _.where(messageFactory, {senderId: match, recipientId: userId})
//                 if (filter.length == 0 || filtered == 0)
//                     accountRef.child('dumpling').child(userId).child('match').remove()
//                         .then(result => accountRef.child('dumpling').child(match).child('match').remove())
//                         .then(result => sendingAPI(userId, CONFIG.facebookPage['dumpling'].id, {
//                             text: "[Hệ Thống] Người lạ đã dừng cuộc trò chuyện",
//                             quick_replies: [
//                                 {
//                                     "content_type": "text",
//                                     "title": "💬 Bắt đầu mới",
//                                     "payload": JSON.stringify({
//                                         type: 'matching'
//                                     })
//                                 }
//                             ]
//                         }, null, 'dumpling'))
//                         .then(result => sendingAPI(match, CONFIG.facebookPage['dumpling'].id, {
//                             text: "[Hệ Thống] Người lạ đã dừng cuộc trò chuyện",
//                             quick_replies: [
//                                 {
//                                     "content_type": "text",
//                                     "title": "💬 Bắt đầu mới",
//                                     "payload": JSON.stringify({
//                                         type: 'matching'
//                                     })
//                                 }
//                             ]
//                         }, null, 'dumpling'))
//                         .then(result => console.log(result))
//                         .catch(err => console.log(err))
//
//
//             }, 1000 * i)
//
//
//         }
//     })
//     res.send(each)
//
//
// })
app.get('/quick_topic', function (req, res) {
    res.send(quick_topic)
})
app.get('/topic', function (req, res) {
    res.send(topic)
})

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

// app.get('/messageFactory', function (req, res) {
//     var query = req.query
//     var page = query.page || 1
//     var Query = Object.assign({}, query)
//     delete Query.page
//     console.log(Query)
//     var toArray = _.toArray(messageFactory)
//     console.log('toArray.length', toArray.length)
//     var filter = _.where(toArray, Query)
//     var pages = getPaginatedItems(filter, page)
//     res.send(pages)
// })

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


function initUser() {
    conversationRef.once('value', function (snap) {
        conversationData = snap.val()
        for (var i in conversationData) {
            getUserDataAndSave(i)
        }
    })
}

app.post('/noti', function (req, res) {
    let {recipientId, message, page} = req.body
    if (page) sendingAPI(recipientId, CONFIG.facebookPage[page].id, message, null, page)
    else sendAPI(recipientId, message)
        .then(result => res.send(result))
        .catch(err => res.status(500).json(err))
});
app.get('/notiWelcome', function (req, res) {
    sendWelcome()
    res.send('done')
})

function sendWelcome() {
    var sent = 0

    var filter = _.map(dataAccount, account => {
        var page = 'dumpling';
        var message = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: `[DUMPLING]
Dear ${account.last_name} ${account.first_name}
Bạn là một trong những người đầu tiên đến với Dumpling!
Mong rằng các bạn sẽ tìm được những người bạn mới thật thú vị. 
Đừng quên chia sẻ trải nghiệm của bạn tại Dumpling bằng cách like fanpage và gia nhập group thảo luận nhé! 
Dumpling cảm ơn! Chúc các bạn ngủ ngon và mơ đẹp nhé! <3 <3 <3`,
                    buttons: [{
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
                    }]
                }
            }
        }
        var recipientId = account.id
        if (!a) {
            var a = 0
        }


        a++
        setTimeout(function () {
            sendingAPI(recipientId, CONFIG.facebookPage[page].id, message, null, page)
        }, a * 2000)

    });
}

app.get('/sendUpdate', function (req, res) {
    sendUpdate()
    res.send('done')
})

function sendUpdate() {
    var sent = 0
    var a = 0

    var filter = _.each(dataAccount, account => {
        var page = 'dumpling';
        var message = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: `[DUMPLING]
Dear ${account.last_name} ${account.first_name}
Dumpling update thêm 1 số tính năng:
- Cải thiện tốc độ gửi tin
- Thêm tín hiệu "Đã xem" huyền thoại :)
- Trạng thái "Bật/Tắt" cho mọi người đỡ bị làm phiền
Các bạn thấy có vấn đề gì thì feedback lại cho team nhé!
Happy chatting!
${(account.match) ? '(Xin lỗi vì đã làm phiền cuộc nói chuyện của 2 bạn nhé, cứ tiếp tục đi ạ ^^)' : ''}`
                    ,
                    buttons: [{
                        type: "web_url",
                        url: "https://www.facebook.com/groups/1985734365037855",
                        title: "Thảo luận tại nhóm"
                    }, {
                        type: "postback",
                        title: "Chia sẻ",
                        payload: JSON.stringify({type: 'share'})
                    }]
                }
            }
        }
        var recipientId = account.id


        a++
        console.log('a', a)
        setTimeout(function () {
            sendingAPI(recipientId, CONFIG.facebookPage[page].id, message, null, page)
                .then(result => console.log('done', recipientId))
                .catch(err => {
                        console.log(err);
                        accountRef.child('dumpling')
                            .child(recipientId)
                            .update({sent_error: true})
                    }
                )
        }, a * 2000)

    });
}

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
    setDefautMenu(page).then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

app.get('/setGetstarted', function (req, res) {
    var page = req.param('page')
    setGetstarted(page).then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

function setGetstarted(page = 'jobo') {
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
            qs: {access_token: CONFIG.facebookPage[page].access_token},
            method: 'POST',
            json: message

        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                resolve(response)

            } else {
                console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
                reject(error)

            }
        });
    })
}

function setDefautMenu(page = 'jobo') {
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


    return new Promise(function (resolve, reject) {
        request({
            uri: 'https://graph.facebook.com/v2.6/me/messenger_profile',
            qs: {access_token: CONFIG.facebookPage[page].access_token},
            method: 'POST',
            json: menu[page]

        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                resolve(response)

            } else {
                console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
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
                console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
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

            }
            var profile = {
                name: user.name,
                avatar: user.profile_pic,
                sex: user.gender,
                updatedAt: Date.now(),
            }

            loadUser(senderID)
                .then(userData => resolve(profile))
                .catch(err => axios.post(CONFIG.APIURL + '/update/user?userId=' + senderID, {user, profile})
                    .then(result => resolve(profile))
                    .catch(err => reject(err))
                )
        })
    })

}

function referInital(referral, senderID) {

    getUserDataAndSave(senderID).then(profile => {
        console.log('profile', profile)

        if (referral && referral.ref) {
            axios.post(CONFIG.APIURL + '/update/user?userId=' + senderID, {user: {ref: referral.ref}})

            var refstr = referral.ref;
            var refData = refstr.split('_');
            console.log('refData', refData);
            if (refData[0] != 'start' && refData[0] != 'tuyendung') {
                var jobId = refData[0]
                loadJob(jobId).then(jobData => {
                    var messageData = {
                        recipient: {
                            id: senderID
                        },
                        message: {
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
                        }
                    };

                    callSendAPI(messageData);
                }).catch(err => sendTextMessage(senderID, JSON.stringify(err)))
            }
            else if (refData[0] == 'tuyendung') sendAPI(senderID, {
                text: `Chào ${(profile.sex == 'male' ? 'anh' : 'chị')}, có phải ${(profile.sex == 'male' ? 'anh' : 'chị')} đang cần tuyển nhân viên không ạ?`,
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
            text: `Chào ${profile.name}, Jobo có thể giúp gì cho bạn nhỉ?`,
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
    })
        .catch(err => console.log(err))


}

function matchingPayload(event) {
    return new Promise(function (resolve, reject) {

        var senderID = event.sender.id;
        var recipientID = event.recipient.id;
        var timeOfPostback = event.timestamp;
        var message = event.message
        var postback = event.postback
        var referral = event.referral

        var payloadStr = '';

        if (message && message.quick_reply && message.quick_reply.payload) payloadStr = message.quick_reply.payload
        else if (message && message.payload) payloadStr = message.payload
        else if (postback && postback.payload) payloadStr = postback.payload
        else if (referral) {
            console.log('referral', referral)
            referInital(referral, senderID)
        }

        if (payloadStr.length > 0) {
            var payload = JSON.parse(payloadStr);
            resolve({payload, senderID, postback})
        } else if (message && message.text) {
            console.log('message.text', message.text);


            // var conversation = conversationData[senderID];
            // if (conversation) var listSentMessage = _.filter(conversation, function (card) {
            //     return card.type == 'sent';
            // });
            // var indexCurrent = _.sortedIndex(listSentMessage, {timestamp: timeOfPostback}, 'timestamp');
            //
            //
            // if (indexCurrent > 1) {
            //     var previousCurrent = indexCurrent - 1
            //     var lastMessage = listSentMessage[previousCurrent]
            // }

            var lastMessage = lastMessageData[senderID]
            console.log('lastMessage', lastMessage)
            if (lastMessage) {
                if (lastMessage.message && lastMessage.message.metadata) {
                    payloadStr = lastMessage.message.metadata
                }
            }

            if (payloadStr.length > 0) var payload = JSON.parse(payloadStr)
            else payload = {type: 'default'}


            client.message(message.text, {})
                .then(data => {
                    console.log('Yay, got Wit.ai response: ', data);
                    var entities = data.entities

                    if (entities.yes_no) {
                        var most = _.max(entities.yes_no, function (card) {
                            return card.confidence;
                        });
                        var value = most.value
                        console.log('value', value)
                        if (value == 'yes') {
                            payload.answer = 'yes'
                        }
                    }
                    if (entities.phone_number) {
                        var most = _.max(entities.phone_number, function (card) {
                            return card.confidence;
                        });
                        var value = most.value
                        console.log('value', value)
                        payload.phone_number = value
                    }
                    if (entities.location) {
                        var most = _.max(entities.location, function (card) {
                            return card.confidence;
                        });
                        var value = most.value
                        console.log('value', value)
                        payload.location = value
                    }
                    resolve({payload, senderID, postback, message})

                })
                .catch(console.error);


        } else if (message && message.attachments) {
            if (message.attachments[0].payload.coordinates) {
                var locationData = message.attachments[0].payload.coordinates;
                console.log('locationData', locationData);
                var location = {
                    lat: locationData.lat,
                    lng: locationData.long,
                }

                sendListJobByAddress(location, null, senderID)


            }
        }

    })
}

function sendListJobByAddress(location, address, senderID) {
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
                else loadUser(senderID).then(user => sendAPI(senderID, {
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
                }))
            })


            .catch(err => console.log(err))

    })
}


function intention(payload, senderID, postback, message = {}) {
    console.log('payload', payload, senderID, postback, message);

    switch (payload.type) {
        case 'GET_STARTED': {
            referInital(postback.referral, senderID)
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

            if (payload.state == 'updateProfile') sendUpdateProfile(senderID)
            else if (payload.state == 'interview') sendInterviewInfo(senderID)

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
                    } else {
                        status = 0
                    }

                    var actId = jobId + ':' + senderID
                    axios.post(CONFIG.APIURL + '/like', {
                        actId,
                        userId: senderID,
                        jobId,
                        likeAt: Date.now(),
                        type: 2,
                        status,
                        platform: 'messenger'
                    })

                    axios.get(CONFIG.APIURL + '/on/profile?userId=' + senderID)
                        .then(result => {
                            var profileData = result.data
                            if (profileData.userInfo && profileData.userInfo.phone) sendInterviewOption(jobId, senderID, status)
                            else sendAPI(senderID, {
                                text: 'Hãy gửi số điện thoại của bạn để mình liên lạc nhé',
                                metadata: JSON.stringify({
                                    type: 'askPhone',
                                    case: 'applyJob',
                                    jobId,
                                    status
                                })
                            });

                        }).catch(err => sendAPI(senderID, {
                        text: 'Hãy gửi số điện thoại của bạn để mình liên lạc nhé',
                        metadata: JSON.stringify({
                            type: 'askPhone',
                            case: 'applyJob',
                            jobId,
                            status
                        })
                    }))

                })


            } else {
                loadUser(senderID).then(user => sendAPI(senderID, {
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
                }))

            }
            break;

        }
        case
        'confirmJobSeeker'
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
        'inputLocation': {

            if (payload.location) {
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
            } else sendAPI(senderID, {
                text: "Xin lỗi mình không hiểu địa chỉ của bạn?, hãy nhập tên đường hoặc tên quận nhé!",
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
        case 'selectLocation': {
            sendListJobByAddress(payload.location, payload.address, senderID)
            break;

        }
        case
        'askPhone': {

            var jobId = payload.jobId

            if (payload.phone_number) {
                var url = `${CONFIG.APIURL}/checkUser?q=${payload.phone_number}`;
                axios.get(url)
                    .then(result => {

                        var peoples = result.data
                        if (peoples.length > 0) {

                            var user = peoples[0]

                            var text = ''
                            if (user.name) {
                                text = 'Có phải bạn tên là ' + user.name + ' ?'
                            } else if (user.email) {
                                text = 'Có phải bạn từng đăng ký sử dụng Jobo với email là ' + user.email + ' ?'
                            } else (
                                text = 'Có phải bạn từng đăng ký sử dụng Jobo cách đây ' + timeAgo(user.createdAt) + ' ?'
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
                        } else {
                            if (jobId) {
                                //appy job
                                sendInterviewOption(jobId, senderID, payload.status)
                            } else {
                                sendAPI(senderID, {
                                    text: "Ok, hiện tại mình đang bận một chút việc, lát nữa mình sẽ trao đổi tiếp với bạn nhé, pp"
                                })
                            }
                        }
                    })
            } else sendAPI(senderID, {
                text: `${message.text}? \n Xin lỗi, số điện thoại của bạn là gì nhỉ?`,
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
        'confirmCheckUser': {
            var userId = payload.userId;
            var jobId = payload.jobId;
            var phone = payload.phone_number;

            if (payload.answer = 'yes') {

                //update messageId
                userRef.child(userId).update({messengerId: senderID})
                    .then(result => {
                        if (payload.case == 'confirmEmployer') sendAPI(senderID, {
                            text: "Okie, bạn đang cần tuyển vị trí gì nhỉ?",
                            metadata: JSON.stringify({
                                type: 'employer_job',
                                case: 'askPhone'
                            })
                        });
                        else if (payload.case == 'updateProfile') {
                            sendAPI(senderID, {
                                attachment: {
                                    type: "template",
                                    payload: {
                                        template_type: "button",
                                        text: "Hãy cập nhật thêm thông tin để nhà tuyển dụng chọn bạn!",
                                        buttons: [{
                                            type: "web_url",
                                            url: `${CONFIG.WEBURL}/profile?admin=${userId}`,
                                            title: "Cập nhật hồ sơ"
                                        }]
                                    }
                                }
                            })


                        } else {
                            if (jobId) {
                                //appy job
                                sendInterviewOption(jobId, senderID, payload.status)

                            } else {
                                sendAPI(senderID, {
                                    text: "Ok, hiện tại mình đang bận một chút việc, lát nữa mình sẽ trao đổi tiếp với bạn nhé, pp"
                                })
                            }
                        }
                    })

                if (userId != senderID) {
                    userRef
                        .child(senderID)
                        .remove(result => profileRef
                            .child(senderID)
                            .remove(result =>
                                console.log('merge profile', senderID)
                            ))
                }


            } else {


                console.log('phone', phone)
                userRef.child(senderID).update({phone}).then(result => sendInterviewOption(jobId, senderID, payload.status))

            }
            break
        }

        case
        'setInterview': {
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
                    .then(result => sendInterviewInfo(senderID))
                    .catch(err => console.log(err))
            }

            break;
        }
        case
        'viewMoreJob'
        : {
            var data = payload.data
            getJob(data).then(result => sendAPI(senderID, result.message, 3000))
        }
    }
}


function loadUser(senderID) {
    return new Promise(function (resolve, reject) {

        var url = `${CONFIG.APIURL}/checkUser?q=${senderID}&type=messengerId`
        axios.get(url)
            .then(result => {

                if (result.data[0]) resolve(result.data[0])
                else reject({err: 'No data'})
            })
            .catch(err => reject(err))
    })

}

function sendUpdateProfile(senderID) {

    loadUser(senderID).then(user => sendAPI(senderID, {
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
    ).catch(err => sendAPI(senderID, {
        attachment: {
            type: "template",
            payload: {
                template_type: "button",
                text: "Tiếp theo, bạn hãy cập nhật thêm thông tin để ứng tuyển vào các công việc phù hợp!",
                buttons: [{
                    type: "web_url",
                    url: `${CONFIG.WEBURL}/profile?admin=${senderID}`,
                    title: "Cập nhật hồ sơ"
                }]
            }
        }
    }))
}

function loadProfile(userId) {
    return new Promise(function (resolve, reject) {
        var url = `${CONFIG.APIURL}/on/profile?userId=${userId}`
        axios.get(url)
            .then(result => resolve(result.data))
            .catch(err => reject(err))
    })

}

function sendInterviewInfo(senderID) {
    return new Promise(function (resolve, reject) {
        sendAPI(senderID, {
            text: 'Lịch phỏng vấn của bạn'
        }).then(result => loadUser(senderID))
            .then(userData => axios.get(CONFIG.APIURL + '/initData?userId=' + userData.userId))
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

app.post('/webhook', function (req, res) {
    var data = req.body;
    console.log('webhook', JSON.stringify(data))

    // Make sure this is a page subscription
    if (data.object == 'page') {
        // Iterate over each entry
        // There may be multiple if batched
        data.entry.forEach(function (pageEntry) {
            var pageID = pageEntry.id;
            var timeOfEvent = pageEntry.time;

            // Iterate over each messaging event
            if (pageEntry.messaging) {
                pageEntry.messaging.forEach(function (messagingEvent) {

                    messagingEvent.messengerId = messagingEvent.sender.id;
                    messagingEvent.type = 'received';

                    if (pageID == CONFIG.facebookPage['jobo'].id) {
                        conversationRef_new.child(messagingEvent.messengerId + ':' + timeOfEvent).update(messagingEvent).then(() => {
                            matchingPayload(messagingEvent)
                                .then(result => intention(result.payload, result.senderID, result.postback, result.message))
                                .catch(err => console.error());

                            if (messagingEvent.optin) {
                                receivedAuthentication(messagingEvent);
                            } else if (messagingEvent.message) {
                                receivedMessage(messagingEvent);
                            } else if (messagingEvent.delivery) {
                                receivedDeliveryConfirmation(messagingEvent);
                            } else if (messagingEvent.read) {
                                receivedMessageRead(messagingEvent);
                            } else if (messagingEvent.account_linking) {
                                receivedAccountLink(messagingEvent);
                            } else {
                                console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                            }
                        })
                    }
                    else if (pageID == CONFIG.facebookPage['dumpling'].id) {

                        var senderID = messagingEvent.sender.id;
                        var recipientID = messagingEvent.recipient.id;
                        var timeOfMessage = messagingEvent.timestamp;
                        var message = messagingEvent.message;
                        var postback = messagingEvent.postback

                        if (message && message.quick_reply) var quickReply = messagingEvent.message.quick_reply;
                        if (message && message.text) var messageText = message.text;
                        if (message && message.attachments) var messageAttachments = message.attachments;
                        if (postback && postback.payload) var payloadStr = messagingEvent.postback.payload
                        else if (quickReply && quickReply.payload) payloadStr = quickReply.payload

                        if (messagingEvent.referral) var referral = messagingEvent.referral
                        else if (postback && postback.referral) referral = postback.referral


                        if (payloadStr) var payload = JSON.parse(payloadStr)
                        else payload = {}

                        loadsenderData(senderID).then(senderData => {

                            if (payload.type == 'GET_STARTED') {
                                if (referral && referral.ref) {
                                    senderData.ref = referral.ref
                                    var refData = senderData.ref.split('_');
                                    console.log('refData', refData);
                                    senderData.topic = {}
                                    if (refData[0] != 'start') senderData.topic = refData[0]
                                }

                                accountRef.child('dumpling').child(senderID).update(senderData).then(result => sendingAPI(senderID, recipientID, {
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
                                accountRef.child('dumpling').child(senderID).update({topic: payload.topic})
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

                                    accountRef.child('dumpling').child(senderID).child('match').remove()
                                        .then(result => accountRef.child('dumpling').child(senderData.match).child('match').remove())
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
                                if (payload.answer == 'off') accountRef.child('dumpling').child(senderID).update({status: 0}).then(result => sendingAPI(senderID, recipientID, {
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
                                else if (payload.answer == 'on') accountRef.child('dumpling').child(senderID).update({status: 1}).then(result => sendingAPI(senderID, recipientID, {
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
                                sendVocalRes(senderID)
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

                        });
                        dumpling_messageFactoryCol.insert(messagingEvent).then(result => {
                            console.log('save receive', result)
                        })
                    }
                })

            }
        });
        res.sendStatus(200);
    }
})

function loadsenderData(senderID) {
    return new Promise(function (resolve, reject) {
        if (dataAccount[senderID]) resolve(dataAccount[senderID])
        else graph.get(senderID + '?access_token=' + CONFIG.facebookPage['dumpling'].access_token, (err, result) => {
            if (err) reject(err);
            console.log(result);
            var user = result;
            user.createdAt = Date.now()
            accountRef.child('dumpling').child(senderID).update(user)
                .then(result => resolve(user))
                .catch(err => reject(err))
        })


    })
}

function matchingPeople(senderID) {

    var senderData = dataAccount[senderID]
    var avaible = _.filter(dataAccount, function (card) {
        if (!card.match && card.status != 0 && card.gender != senderData.gender && card.id != CONFIG.facebookPage['dumpling'].id) return true
        else return false
    })

    if (avaible.length > 0) {
        var random = _.sample(avaible)
        var matched = random.id
        console.log('matched', matched)
        var recipientID = CONFIG.facebookPage['dumpling'].id
        sendingAPI(matched, recipientID, {
            text: `[Hệ Thống] Bạn đã được ghép với 1 người lạ ở Dumpling_${senderData.topic}, hãy nói gì đó đề bắt đầu`,
        }, null, 'dumpling')
            .then(result => accountRef.child('dumpling').child(senderID)
                .update({match: matched})
                .then(result => accountRef.child('dumpling').child(random.id).update({match: senderID}))
                .then(result => sendingAPI(senderID, recipientID, {
                    text: `[Hệ Thống] Đã ghép bạn với 1 người lạ ở Dumpling_${random.topic} thành công`,
                }, null, 'dumpling'))
                .then(result => sendingAPI(senderID, recipientID, {
                    text: "Chúc 2 bạn có những giây phút trò chuyện vui vẻ trên Dumpling ^^",
                }, null, 'dumpling'))
                .then(result => checkAvaible(senderID)))
            .catch(err => {
                matchingPeople(senderID)
                console.log(err)
                accountRef.child('dumpling').child(matched).update({sent_error: true})
            })


    } else sendingAPI(senderID, CONFIG.facebookPage['dumpling'].id, {
        text: "[Hệ Thống] Chưa tìm đc người phù hợp",
    }, null, 'dumpling')


}

function checkAvaible(senderID) {
    // var a = 0
    //
    // function loop() {
    //     a++
    //     if (a < 4) {
    //
    //     }
    // }
    //
    // loop()

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

                sendingAPI(senderID, CONFIG.facebookPage['dumpling'].id, {
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
                accountRef.child('dumpling').child(senderID).child('match').remove()
                    .then(result => accountRef.child('dumpling').child(senderData.match).child('match').remove())
                    .then(result => sendingAPI(senderData.match, CONFIG.facebookPage['dumpling'].id, {
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
                    .then(result => sendingAPI(senderID, CONFIG.facebookPage['dumpling'].id, {
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

                // .then(result => matchingPeople(senderID))
                // .then(matched => sendingAPI(matched, CONFIG.facebookPage['dumpling'].id, {
                //         text: "[Hệ Thống] Bạn đã được ghép với 1 người lạ, hãy nói gì đó đề bắt đầu",
                //     }, null, 'dumpling').then(result => {
                //         var conver_new = _.each(messageFactory, message => {
                //             if (message.recipientID == current_matched && message.senderID == senderID && message.timestamp > s60) {
                //                 sendingAPI(matched, senderID, {
                //                     text: message.message.text,
                //                 }, null, 'dumpling')
                //             }
                //         })
                //         if(a==3){
                //             accountRef.child('dumpling').child(senderID).child('match').remove()
                //                 .then(result => accountRef.child('dumpling').child(senderData.match).child('match').remove())
                //                 .then(result => sendingAPI(senderData.match, CONFIG.facebookPage['dumpling'].id, {
                //                     text: "[Hệ Thống] Người lạ đã dừng cuộc trò chuyện",
                //                 }, null, 'dumpling'))
                //                 .then(result => sendingAPI(senderID, CONFIG.facebookPage['dumpling'].id, {
                //                     text: "[Hệ Thống] Hệ thống đã dừng cuộc trò chuyện",
                //                 }, null, 'dumpling'))
                //         } else loop()
                //     })
                //     .catch(err => console.log(err))
                // )
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
    console.log(JSON.stringify(message));

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
                sendTypingOn(senderID)
                    .then(result => console.log(result))
                    .catch(err => console.log(err));
                break;

            case 'typing off':
                sendTypingOff(senderID);
                break;

            case 'account linking':
                sendAccountLinking(senderID);
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
                console.log('resultData', resultData.total);
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

    console.log("Received message read event for watermark %d and sequence " +
        "number %d", watermark, sequenceNumber);

    var lastMessage = lastMessageData[senderID]
    if (lastMessage && lastMessage.notiId) {
        axios.get(CONFIG.AnaURL + '/messengerRead?notiId=' + lastMessage.notiId)
            .then(result => console.log("messengerRead", lastMessage))
            .catch(err => console.log(err))
    }
    sendReadReceipt()

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


function sendingAPI(recipientId, senderId = CONFIG.facebookPage['jobo'].id, message, typing, page = 'jobo') {
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
                    messageData.recipientId = recipientId
                    messageData.senderId = senderId
                    messageData.type = 'sent'
                    messageData.timestamp = Date.now()

                    dumpling_messageFactoryCol
                        .insert(messageData)
                        .then(result => {
                            console.log('save sent', result)
                            resolve(result)
                        })
                        .catch(err => reject(err))
                }).catch(err => reject(err))


            }, typing))
            .catch(err => reject(err))
    })
}


function sendAPI(recipientId, message, typing) {
    return new Promise(function (resolve, reject) {
        if (!typing) typing = 1000
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: message
        };
        sendTypingOn(recipientId)
            .then(result => setTimeout(function () {
                callSendAPI(messageData).then(result => {
                    sendTypingOff(recipientId)
                    messageData.messengerId = recipientId
                    messageData.type = 'sent'
                    messageData.timestamp = Date.now()

                    conversationRef_new
                        .child(messageData.messengerId + ':' + messageData.timestamp)
                        .update(messageData)
                        .then(() => lastMessageRef.child(messageData.messengerId).update(messageData))
                        .then(() => resolve(result))
                        .catch(err => reject(err))
                })

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
    console.log("Sending a read receipt to mark message as seen");

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "mark_seen"
    };

    callSendAPI(messageData, page);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId, page = 'jobo') {
    return new Promise(function (resolve, reject) {
        console.log("Turning typing indicator on");

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
    console.log("Turning typing indicator off");

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
        if (messageData.message && messageData.message.text) console.log('length', messageData.message.text.length)

        if (messageData.message && messageData.message.text && messageData.message.text.length > 640) {
            console.log('messageData.message.text.length', messageData.message.text.length)
            var text = messageData.message.text
            var loop = text.length / 640
            var textsplit = []
            for (var i = 0; i < loop; i++) {
                var split = text.slice(640 * i, 640 * (i + 1))
                textsplit.push(split)
                messageData.message.text = split
                request({
                    uri: 'https://graph.facebook.com/v2.6/me/messages',
                    qs: {access_token: CONFIG.facebookPage[page].access_token},
                    method: 'POST',
                    json: messageData

                }, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var recipientId = body.recipient_id;
                        var messageId = body.message_id;

                        console.log("Successfully sent message with id %s to recipient %s", messageId, recipientId);

                    } else {
                        console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
                        reject(response)
                    }
                });

            }
            console.log('textsplit', textsplit)

            resolve(messageData)


        } else request({
            uri: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token: CONFIG.facebookPage[page].access_token},
            method: 'POST',
            json: messageData

        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var recipientId = body.recipient_id;
                var messageId = body.message_id;

                console.log("Successfully sent message with id %s to recipient %s", messageId, recipientId);
                resolve(messageData)
            } else {
                console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
                reject(response)
            }
        });
    })

}


// Start server
// Webhooks must be available via SSL with a certificate signed by a valid
// certificate authority.
app.listen(app.get('port'), function () {
    console.log('Node app is running on port', app.get('port'));
});

module.exports = app;

