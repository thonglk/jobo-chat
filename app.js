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
var port = app.get('port')
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
    console.log('vietnameseDecode', str)
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


function initDataLoad(ref, store) {
    ref.on('child_added', function (snap) {
        store[snap.key] = snap.val()
    });
    ref.on('child_changed', function (snap) {
        store[snap.key] = snap.val()
    });
    ref.on('child_removed', function (snap) {
        delete store[snap.key]
    });
}

var dataAccount = {}, accountRef = db.ref('account')
initDataLoad(accountRef, dataAccount)
var facebookPage = {}, facebookPageRef = db.ref('facebookPage')

initDataLoad(facebookPageRef, facebookPage)

var dataLadiBot = {}, ladiBotRef = db.ref('ladiBot')

initDataLoad(ladiBotRef, dataLadiBot)

function SetOnOffPage(pageID, status) {
    return new Promise(function (resolve, reject) {
        if (status == '1') var page_off = true
        else page_off = false
        facebookPageRef.child(pageID).update({page_off}).then(result => resolve(facebookPage[pageID]))
            .catch(err => reject(err))

    })
}

app.get('/SetOnOffPage', (req, res) => {
    var {pageID, status} = req.query
    SetOnOffPage(pageID, status).then(result => res.send(result))
        .catch(err => res.status(500).json(err))

})

function saveFacebookPage(data) {
    return new Promise(function (resolve, reject) {
        facebookPageRef.child(data.id).update(data)
            .then(result => resolve(result))
            .catch(err => reject(err))

    })
}

var profileRef = db2.ref('profile');


var quick_topic = [];
var topic = {}
var a = 0


app.get('/send', (req, res) => {
    var {body} = req.query
    sendVocal(body)
        .then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})


function sendVocal(vocal) {
    return new Promise(function (resolve, reject) {
        var a = 0
        console.log('start')
        var pageID = facebookPage['dumpling'].id
        var dumplingAccount = _.where(dataAccount, {pageID})
        var map = _.each(dumplingAccount, account => {
            a++
            console.log('account', account.id)
            setTimeout(function () {
                sendAPI(account.id, {
                    text: account.first_name + ' ' + account.last_name + ' ơi, ' + vocal
                }, null, pageID)
            }, a * 1000)

        })
        resolve(map)
    })

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
    subscribed_apps(facebookPage[pageID].access_token, facebookPage[pageID].id)
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
    getChat(req.query)
        .then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

function getChat({url, page, access_token, name, pageID}) {
    return new Promise(function (resolve, reject) {
        console.log('getChat-ing', url, page, access_token, name, pageID)

        axios.get(url)
            .then(result => {
                    console.log('axios.get(queryURL)', result.data);

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
                                if (!url.match('/forms/d/e/')) {
                                    var urla = url.split('/forms/d/')
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

                                var renderOps = {}
                                var r = 0

                                console.log('Get greeting & menu')

                                for (var i in flows) {
                                    var flow = flows[i]
                                    var title = flow[1] || 'undefined'
                                    var type = flow[3]

                                    if (!greetingPart.start && title.toLowerCase().match('greeting') && type == '8') greetingPart.start = i
                                    else if (!greetingPart.end && greetingPart.start && type == '8') greetingPart.end = i
                                    else if (!greetingPart.end && greetingPart.start) {
                                        if (title.match(':')) {
                                            var titleSplit = title.split(':')
                                            var first = titleSplit[0].toLowerCase()
                                            var supportLang = config.get('supportLang')
                                            var checkLg = supportLang.indexOf(first);

                                            if (checkLg != -1) {
                                                var locale = supportLang.substring(checkLg, checkLg + 5)

                                            } else if (first == 'default') {
                                                var locale = first
                                            }
                                            if (locale) greeting.push({
                                                text: titleSplit[1],
                                                locale
                                            })

                                        }
                                    }

                                    if (!menuPart.start && title.toLowerCase().match('menu') && type == '8') menuPart.start = i
                                    else if (!menuPart.end && menuPart.start && type == '8') menuPart.end = i
                                    else if (!menuPart.end && menuPart.start) {
                                        var menuTitle = flow[1]

                                        if (type == '2' && flow[4] && flow[4][0]) {

                                            var optionsList = flow[4][0][1]

                                            if (optionsList.length > 1) {
                                                console.log('optionsList', optionsList)
                                                var call_to_actions = _.map(optionsList, option => {
                                                    var text = option[0]
                                                    if (text.match('{{') && text.match('}}')) {
                                                        console.log('text', text)

                                                        var datastr = text.substring(text.indexOf('{{') + 2, text.indexOf('}}'))
                                                        console.log('datastr', datastr)

                                                        var title = text.substring(0, text.indexOf('{{'))
                                                        console.log('title', title)

                                                        if (datastr.match('url')) return {
                                                            title,
                                                            "type": "web_url",
                                                            "url": datastr.substring(4),
                                                        }
                                                    } else if (option[2]) return {
                                                        title: text,
                                                        "type": "postback",
                                                        "payload": JSON.stringify({
                                                            type: 'ask',
                                                            text: text,
                                                            goto: option[2],
                                                            questionId: flow[0]
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
                                                    text: menuTitle,
                                                    questionId: flow[0]
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


                                }

                                if (r > 0) {

                                    axios.post(`https://docs.google.com/forms/d/${save.editId}/renderdata?id=${save.editId}&renderOps=` + urlencode(JSON.stringify(renderOps)))
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

                                }
                                console.log('Done greeting & menu')


                                if (greeting.length > 0) save.greeting = greeting
                                if (persistent_menu.call_to_actions.length > 0) save.menu = {persistent_menu: [persistent_menu]}


                                console.log('Get form', save)
                                if (pageID) save.page = pageID


                                saveLadiBot(save, save.id)
                                    .then(result => {
                                        if (access_token && name && pageID) {
                                            page = pageID
                                            getLongLiveToken(access_token).then(data => {
                                                var new_access_token = data.access_token
                                                var pageData = {
                                                    access_token: new_access_token, name, id: pageID, currentBot: id
                                                };
                                                subscribed_apps(new_access_token, pageID)
                                                    .then(result => saveFacebookPage(pageData)
                                                        .then(result => {
                                                            facebookPage[page] = pageData
                                                            save.page = `${facebookPage[page].id}`;
                                                            saveLadiBot(save, save.id)
                                                            setGreeting(save.greeting, pageID)
                                                                .then(result => setGetstarted(pageID)
                                                                    .then(result => setDefautMenu(pageID, save.menu)
                                                                        .then(result => setWit(pageID)
                                                                            .then(result => resolve(save)))
                                                                    ))

                                                        })
                                                    )


                                            })


                                        } else resolve(save)


                                    })
                                    .catch(err => reject({err: JSON.stringify(err)}))

                            } else reject({err: 'This parse was not public'})
                        } else reject({err: 'This script was not public'})


                    } else reject({err: 'This data was not public'})

                }
            )
            .catch(err => {
                console.log('get chat err', err)
                reject(err)
            })

    })

}

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

_.templateSettings = {
    interpolate: /\{\{(.+?)\}\}/g
};

function templatelize(text = 'loading...', data = {first_name: 'Thông'}) {
    var check = 0
    console.log('templatelize', text, data)
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

app.get('/message', function (req, res) {
    var {message} = req.query
    client.message(message, {})
        .then(data => res.send(data))
        .catch(err => res.status(500).json(err));
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
menu['206881183192113'] = {
    "persistent_menu": [
        {
            "call_to_actions": [{
                "title": "💸 Start Over",
                "type": "postback",
                "payload": JSON.stringify({
                    type: 'start-over',
                })
            }, {
                "title": "💑 Menu",
                "type": "nested",
                "call_to_actions": [
                    {
                        "title": "✨ Tuỳ chọn 1",
                        "type": "postback",
                        "payload": JSON.stringify({
                            type: 'matching',
                        })
                    },
                    {
                        "title": "❎ Tuỳ chọn 2",
                        "type": "postback",
                        "payload": JSON.stringify({
                            type: 'stop',
                        })
                    }
                ]
            },

            ],
            "locale": "default",

        }
    ]
}

app.get('/setMenu', function (req, res) {
    var page = req.param('page')
    setDefautMenu(page, menu[page]).then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

function setDefautMenu(page = 'jobo', menu = {
    "persistent_menu": [
        {
            "call_to_actions": [{
                "title": "Start Over",
                "type": "postback",
                "payload": JSON.stringify({
                    type: 'start-over',
                })
            }, {
                "title": "Create Own Chatbot",
                "type": "web_url",
                "url": "https://botform.asia"
            }],
            "locale": "default",

        }
    ]
}) {
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

function setGreeting(greeting = [
    {
        "locale": "default",
        "text": 'Hello {{user_first_name}}, Click "Get started" to engage with us'
    }
], page = 'jobo') {
    console.error("setGreeting-ing", page, menu);


    return new Promise(function (resolve, reject) {
        request({
            uri: 'https://graph.facebook.com/v2.6/me/messenger_profile',
            qs: {access_token: facebookPage[page].access_token},
            method: 'POST',
            json: {
                greeting
            }

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

app.get('/setWit', function (req, res) {
    var {page} = req.query
    setWit(page).then(result => res.send(result))
        .catch(err => res.status(500).json(err))
})

function setWit(page = 'jobo') {
    console.log("setWit-ing", page, menu);


    return new Promise(function (resolve, reject) {
        request({
            uri: "https://graph.facebook.com/v2.8/me/nlp_configs?nlp_enabled=TRUE&&model=VIETNAMESE",
            qs: {access_token: facebookPage[page].access_token},
            method: 'POST',
        }, function (error, response, body) {
            console.error("setWit", error, body);

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

function matchingPayload(event) {
    return new Promise(function (resolve, reject) {

        console.log('matchingPayload-ing', JSON.stringify(event))

        var senderID = event.sender.id;
        var recipientID = event.recipient.id;
        var timeOfPostback = event.timestamp;
        var message = event.message;
        var postback = event.postback;


        var payloadStr = '';

        if (message && message.quick_reply && message.quick_reply.payload) payloadStr = message.quick_reply.payload
        else if (postback && postback.payload) payloadStr = postback.payload

        if (payloadStr.length > 0) var payload = JSON.parse(payloadStr)
        else payload = {type: 'default'};

        var referral = event.referral
        if (postback && postback.referral) referral = postback.referral

        if (referral) {
            payload.source = 'referral'
            console.log('referral', payload)
            if (recipientID == facebookPage['jobo'].id) referInital(referral, senderID)

        } else if (postback) {

            payload.source = 'postback'
            payload.text = postback.title

        } else if (message && message.quick_reply) {
            payload.source = 'quick_reply'

        } else if (message) {

            var lastMessage = dataAccount[senderID].lastSent
            console.log('lastMessage', lastMessage);
            if (lastMessage && lastMessage.message && lastMessage.message.metadata) payloadStr = lastMessage.message.metadata;

            if (payloadStr.length > 0) var payload = JSON.parse(payloadStr)
            else payload = {type: 'default'};

            if (lastMessage.meta) payload = lastMessage.meta

            if (message.attachments) {
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
                    console.log('something donnt know', event)

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

        } else {
            console.log('something donnt know', event)
        }


        if (message && message.text && !message.text.nlp) client.message(message.text, {})
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


var listen = 'on'

function go(goto, q = 0, flow, senderID, pageID) {
    var senderData = dataAccount[senderID]
    var questions = flow[1]
    if (goto == '-3') {
        saveSenderData({bot_off: true}, senderID, pageID)
        sendAPI(senderID, {
            text: flow[2][0] || 'Thanks for contact us <3!'
        }, null, pageID)
        submitResponse(senderData.flow, senderID)
            .then(result => console.log('done', result))
            .catch(err => console.log('err', err))
    }

    else if (goto == '-2') {

        for (var i in questions) {
            q++
            console.log('index', q, questions[q][3])
            if (questions[q][3] == 8) {
                q++
                loop(q, flow, senderID, pageID)
                break
            }

        }

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
        if (currentQuestion[4] && currentQuestion[1] && currentQuestion[1].match('locale')) {
            var askOption = currentQuestion[4][0][1];
            var lang = senderData.locale.substring(0, 2)
            for (var i in askOption) {
                var option = askOption[i]
                if (option[0].match(lang)) {
                    go(option[2], q, flow, senderID, pageID)
                    break
                }
            }

        } else if (currentQuestion[3] == 8) {
            var goto = currentQuestion[5]

            go(goto, q, flow, senderID, pageID)

        } else {
            var currentQuestionId = currentQuestion[0];
            var messageSend = {
                text: currentQuestion[1],
            }
            var metadata = {
                questionId: currentQuestionId
            }
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
                                "title": eleArray[0] || option[0],
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

                    } else if (askType == '3') {
                        var messageSend = {
                            attachment: {
                                type: "template",
                                payload: {
                                    template_type: "button",
                                    text: currentQuestion[1],
                                    buttons: []
                                }
                            }

                        }
                        var buttons = []
                        var map = _.map(askOption, option => {
                            var button = {}
                            metadata.text = option[0]
                            if (option[2]) metadata.goto = option[2]
                            if (option[4] == 1) metadata.other = option[2]

                            console.log('option[0].match("[")', option[0])
                            var str = option[0]

                            if (str.indexOf("[") != -1 && str.indexOf("]") != -1) {
                                var n = str.indexOf("[") + 1;
                                var b = str.indexOf("]");
                                var sub = str.substr(n, b - n)
                                var tit = str.substr(0, n - 2)
                                var expression = "/((([A-Za-z]{3,9}:(?:\\/\\/)?)(?:[\\-;:&=\\+\\$,\\w]+@)?[A-Za-z0-9\\.\\-]+|(?:www\\.|[\\-;:&=\\+\\$,\\w]+@)[A-Za-z0-9\\.\\-]+)((?:\\/[\\+~%\\/\\.\\w\\-_]*)?\\??(?:[\\-\\+=&;%@\\.\\w_]*)#?(?:[\\.\\!\\/\\\\\\w]*))?)/\n";
                                var regex = 'http';
                                if (sub.match(regex)) button = {
                                    type: "web_url",
                                    url: sub,
                                    title: tit
                                }
                                else {
                                    button = {
                                        type: "phone_number",
                                        title: tit,
                                        payload: sub
                                    }
                                }
                            } else button = {
                                type: "postback",
                                title: option[0],
                                payload: JSON.stringify(metadata)
                            }


                            if (buttons.length < 3) buttons.push(button);
                            else console.log('buttons.length', buttons.length)


                        });
                        messageSend.attachment.payload.buttons = buttons


                        sendAPI(senderID, messageSend, null, pageID, metadata)
                            .then(resutl => console.log('messageSend', messageSend))
                            .catch(err => console.log('sendAPI_err', err))

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
                                "title": option[0],
                                "payload": JSON.stringify(metadata)

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

                    console.log('save info response', response)
                    q++

                    if (askType == 11 && flow[20]) sendAPI(senderID, {
                        attachment: {
                            type: "image",
                            payload: {
                                url: flow[20][currentQuestion[6][0]]
                            }
                        }
                    }, null, pageID, metadata)
                        .then(result => setTimeout(loop(q, flow, senderID, pageID), 3000))
                    else if (askType == 12 && currentQuestion[6][3]) sendAPI(senderID, {
                        text: `https://www.youtube.com/watch?v=${currentQuestion[6][3]}`
                    }, null, pageID, metadata)
                        .then(result => setTimeout(loop(q, flow, senderID, pageID), 3000))
                    else if (askType == 6) {
                        if (currentQuestion[1].match('pdf')) sendAPI(senderID, {
                            attachment: {
                                type: "file",
                                payload: {
                                    url: currentQuestion[1]
                                }
                            }
                        }, null, pageID, metadata)
                            .then(result => {
                                console.log('result', result)
                                setTimeout(loop(q, flow, senderID, pageID), 3000)
                            })
                            .catch(err => console.log('err', err))
                        else sendAPI(senderID, messageSend, null, pageID, metadata)
                            .then(result => {
                                console.log('result', result)
                                setTimeout(loop(q, flow, senderID, pageID), 3000)
                            })
                            .catch(err => console.log('err', err))

                    }

                })


            }


        }


    } else go(-3, null, flow, senderID, pageID)

}


db.ref('webhook').on('child_added', function (snap) {
    var data = snap.val()
    if (data.object == 'page') {

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

                    var isDeveloper = false
                    if (CONFIG && CONFIG.facebookPage[pageID]
                        && CONFIG.facebookPage[pageID].developer
                        && CONFIG.facebookPage[pageID].developer.match(senderID)) {
                        isDeveloper = true
                    }

                    if ((isDeveloper && port == '5000')
                        || (!isDeveloper && port != '5000')
                    ) {

                        if (messagingEvent.message || messagingEvent.postback || messagingEvent.referral) {

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

                                        if (senderData.bot_off) console.log('this bot is off');

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

                                                saveSenderData(senderData, senderID, pageID).then(result => sendingAPI(senderID, recipientID, {
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
                                                saveSenderData({topic: payload.topic}, senderID, pageID)
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
                                                accountRef.child(senderID).update({vocal_off: true})
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

                                            if (referral && referral.ref) {

                                                senderData.ref = referral.ref;

                                                if (referral.ref.match('_')) {
                                                    var refData = referral.ref.split('_');
                                                    console.log('refData', refData);

                                                } else refData = [referral.ref]

                                                if (refData[0] == 'create') {
                                                    var url = senderData.ref.slice(7);
                                                    console.log('url', url);

                                                    sendAPI(senderID, {
                                                        text: `Welcome {{full_name}}! \n Your form is being converted`
                                                    }, null, pageID)

                                                    getChat({url})
                                                        .then(form => sendAPI(senderID, {
                                                            attachment: {
                                                                type: "template",
                                                                payload: {
                                                                    template_type: "button",
                                                                    text: `Done <3! \n We had just turn your "${form.data[8]}" form into chatbot to help you convert more leads! \nLink: https://m.me/206881183192113?ref=${form.flow}`,
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
                                                                            url: `https://app.botform.asia/dash/create?url=${url}`,
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
                                                                text: JSON.stringify(err)
                                                            }, null, pageID)))
                                                        .catch(err => sendAPI(senderID, {
                                                            text: "Err: Can't read your form, make sure it was a google forms link and make it public, go https://botform.asia to try again"
                                                        }, null, pageID))
                                                } else if (refData[0] == 'go') {
                                                    var result = _.findWhere(dataLadiBot, {page: pageID});
                                                    if (result) {
                                                        var flow = result.data;
                                                        var questions = flow[1];
                                                        for (var i in questions) {
                                                            var quest = questions[i]
                                                            console.log(vietnameseDecode(refData[1]), vietnameseDecode(quest[1]))
                                                            if (vietnameseDecode(refData[1]) == vietnameseDecode(quest[1])) {
                                                                go(quest[0], null, flow, senderID, pageID)
                                                                break
                                                            }
                                                        }

                                                    }
                                                }

                                                console.log('senderData', senderData)
                                                saveSenderData(senderData, senderID, pageID)

                                                /// case create

                                            }


                                            if (!facebookPage[pageID].page_off) {
                                                if (facebookPage[pageID].currentBot) {
                                                    var flowId = facebookPage[pageID].currentBot
                                                    var result = _.findWhere(dataLadiBot, {id: flowId});
                                                } else {
                                                    var result = _.findWhere(dataLadiBot, {page: pageID});
                                                }

                                                var flow = result.data;
                                                var questions = flow[1];

                                                if (result) ladiResCol.findOne({
                                                    page: pageID,
                                                    senderID
                                                }).then(response => {

                                                    console.log('response', response)

                                                    if (!response) response = {
                                                        page: pageID,
                                                        senderID
                                                    }

                                                    if (payload.keyword == 'start-over' || payload.type == 'GET_STARTED') {
                                                        saveSenderData({bot_off: null}, senderID, pageID)
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
                                                    } else if (payload.keyword == 'update-my-bot') {
                                                        if (result.editId) var flowId = result.editId + '/edit'
                                                        else flowId = result.id + '/viewform'
                                                        var data = {url: `https://docs.google.com/forms/d/${flowId}`}

                                                        if (pageID && facebookPage[pageID] && facebookPage[pageID].access_token && facebookPage[pageID].name) data = Object.assign(data, facebookPage[pageID], {pageID})
                                                        console.log('data', data)
                                                        getChat(data)
                                                            .then(form => sendAPI(senderID, {
                                                                text: `Updated successful for ${form.data[8]} <3!`,
                                                            }, null, pageID))
                                                    } else if (payload.keyword == 'noti-new-user') {
                                                        saveSenderData({subscribe: 'all'}, senderID, pageID)
                                                            .then(result => sendAPI(senderID, {
                                                                text: `Subscribe successful <3!`,
                                                            }, null, pageID))

                                                    }
                                                    else if (payload.text && payload.type == 'ask' && payload.questionId) {

                                                        response[payload.questionId] = payload.text

                                                        ladiResCol.findOneAndUpdate({
                                                            page: pageID,
                                                            senderID
                                                        }, {$set: response}, {upsert: true}).then(result => {
                                                            console.log('save response', result)
                                                        }).catch(err => console.log('err', err))
                                                        var index = _.findLastIndex(questions, {
                                                            0: payload.questionId
                                                        });

                                                        var goto = payload.goto
                                                        if (payload.askType == 3 || payload.askType == 2) {
                                                            if (payload.source == 'text' && payload.other) {
                                                                go(payload.other, index, flow, senderID, pageID)

                                                            } else go(goto, index, flow, senderID, pageID)

                                                        } else if (payload.askType == 0 || payload.askType == 1) {
                                                            var curQues = _.findWhere(questions, {0: payload.questionId});
                                                            if (curQues[4] && curQues[4][0] && curQues[4][0][4] && curQues[4][0][4][0]) {

                                                                var valid = curQues[4][0][4][0]

                                                                if (valid[0] == 1) {
                                                                    //number

                                                                    if (valid[1] == 7) {
                                                                        //between
                                                                        console.log('payload.text', payload.text, Number(payload.text) > valid[2][0])
                                                                        if (Number(payload.text) > valid[2][0] && Number(payload.text) < valid[2][1]) {
                                                                            setTimeout(()=> go(goto, index, flow, senderID, pageID), 15000)
                                                                        } else {
                                                                            sendAPI(senderID, {
                                                                                text: valid[3]
                                                                            }, null, pageID, payload)
                                                                        }
                                                                    }


                                                                }


                                                            } else setTimeout(()=> go(goto, index, flow, senderID, pageID), 15000)

                                                        } else setTimeout(()=> go(goto, index, flow, senderID, pageID), 15000)

                                                    }


                                                })
                                            }


                                        }


                                    })
                                    .catch(err => console.error())
                                ).catch(err => console.error());

                            messagingEvent.type = 'received';
                            saveSenderData({lastReceive: messagingEvent}, senderID, pageID)


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

                        messageFactoryCol.insert(messagingEvent)
                            .then(result => db.ref('webhook').child(snap.key).remove())
                            .catch(console.error)


                    }


                })

            }
        })
        ;


    }

})

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
                "title": flow.data[8],
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


function loadsenderData(senderID, page = '493938347612411') {
    return new Promise(function (resolve, reject) {


        if (dataAccount[senderID]) {
            var user = dataAccount[senderID]
            user.lastActive = Date.now();
            saveSenderData(user, senderID, page)
                .then(result => resolve(user))
                .catch(err => reject(err))
        }
        else graph.get(senderID + '?access_token=' + facebookPage[page].access_token, (err, result) => {
            if (err) reject(err);
            console.log('account', result);
            var user = result;
            user.full_name = result.first_name + ' ' + result.last_name
            user.createdAt = Date.now()
            user.lastActive = Date.now();


            graph.get('me/conversations?access_token=' + facebookPage[page].access_token, (err, conversations) => {
                console.log('conversations', conversations, err);
                user.link = conversations.data[0].link
                saveSenderData(user, senderID, page)
                    .then(result => resolve(user))
                    .catch(err => reject(err))
            })

            var adminList = _.where(dataAccount, {pageID: page, subscribe: 'all'})
            if (adminList.length > 0) adminList.forEach(account => {
                sendAPI(account.id, {
                    text: 'New Subscribe | ' + user.full_name
                }, null, page)
            })


        })

    })
}


function saveSenderData(data, senderID, page = '493938347612411') {
    return new Promise(function (resolve, reject) {
        data.pageID = page

        accountRef.child(senderID).update(data)
            .then(result => resolve(data))
            .catch(err => reject(err))

    })
}


function matchingPeople(senderID) {

    var senderData = dataAccount[senderID]
    var avaible = _.filter(dataAccount, function (card) {
        if (card.pageID == '493938347612411' && !card.match && card.status != 0 && card.gender != senderData.gender && card.id != facebookPage['493938347612411'].id) return true
        else return false
    })

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
                    saveSenderData({lastSent: messageData}, recipientId, page)
                    resolve(result)
                })
                .catch(err => reject(err))
        })
    })
}

app.get('/a', (req, res) => {
    var {page} = req.query
    bbb(page)

})
app.get('/queryPage', (req, res) => {
    var {query} = req.query
    res.send(queryPage(query))
})

function bbb(page) {


    graph.get('me/conversations?limit=2000&access_token=' + facebookPage[page].access_token, (err, conversations) => {
        console.log('conversations', conversations, err);

        var dataFilter = _.filter(dataAccount, function (data) {
            if (data.pageID == page && data.lastActive) return true
            else return false
        });
        var sort = _.sortBy(dataFilter, function (data) {
            return -data.lastActive
        })
        for (var i in sort) {
            var data = sort[i]
            var link = conversations.data[i].link

            console.log(i, link)
            saveSenderData({link}, data.id, data.pageID)
        }

    })

}

function queryPage(query) {
    var data = _.filter(facebookPage, page => {
        if (page.name && page.name.toLowerCase().match(query.toLowerCase())) return true
        else return false
    })
    return data
}


function sendAPI(recipientId, message, typing, page = 'jobo', meta) {
    return new Promise(function (resolve, reject) {

        if (message.text) message.text = templatelize(message.text, dataAccount[recipientId])
        else if (message.attachment && message.attachment.payload && message.attachment.payload.text) message.attachment.payload.text = templatelize(message.attachment.payload.text, dataAccount[recipientId])

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
                    messageData.sender = {id: page}
                    messageData.type = 'sent'
                    messageData.timestamp = Date.now()
                    if (meta) messageData.meta = meta
                    messageFactoryCol.insert(messageData)
                        .then(result => saveSenderData({lastSent: messageData}, recipientId, page)
                            .then(result => resolve(messageData))
                            .catch(err => reject(err)))
                        .catch(err => reject(err))


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
        var i = -1

        function sendPer() {
            i++
            if (i < split.length) {
                var mes = split[i]
                messageData.message.text = mes
                sendOne(messageData, page).then(result => setTimeout(function () {
                    sendPer()
                }, 2000))
                    .catch(err => {
                        console.log('err', i, err)
                        reject(err)
                    })
            } else {
                console.log('done', i, split.length)
                resolve(messageData)
            }

        }

        if (messageData.message && messageData.message.text && messageData.message.text.length > 640) {
            console.log('messageData.message.text.length', messageData.message.text.length)
            var text = messageData.message.text
            var split = text.split('. ')
            sendPer()


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
                    if (messageId) {
                        console.log("callSendAPI_success", messageId, recipientId);

                    }
                    resolve(messageData)

                } else {
                    console.error("callSendAPI_error", JSON.stringify(body), JSON.stringify(messageData));
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
app.listen(port, function () {
    console.log('Node app is running on port', port);
});


app.get('/botform/viewResponse', (req, res) => {
    viewResponse(req.query)
        .then(result => res.send(result))
        .catch(err => res.status(500).json(err))

});


module.exports = app;

