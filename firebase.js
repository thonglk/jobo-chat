const firebase = require('firebase-admin');


var FB = {
    jobo_chat: firebase.initializeApp({
        credential: firebase.credential.cert({
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
        }),
        databaseURL: "https://jobo-chat.firebaseio.com"
    }, "jobo_chat"),
    jobo_b8204: firebase.initializeApp({
        credential: firebase.credential.cert({
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
        }),
        databaseURL: "https://jobo-b8204.firebaseio.com"
    }, "jobo_b8204"),
    botform_hook: firebase.initializeApp({
        credential: firebase.credential.cert({
                "type": "service_account",
                "project_id": "botform-hook",
                "private_key_id": "553a74948f0a33b0b307cbc3795e27205e6aff6a",
                "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCmjMhn6rx4A3NJ\nKYN6AoNWHc0tL67Bsg8OQxPF2+ZHaVEjgoq8mEg8leDT3u+PdRDGnNetBphS0o98\n2VIcuZx7wxt/HBXXQFUOBv6TJlfu9941cKKOBYz2zPmtV0c8sJL0dTqxr05x9xs/\nBerHgJ6Z/VpnaxDWG/0InPRWZzqXo0dSx7xMdhAcBvqaxxD0Wz3Z8dJWV/Ze2eCn\n66oB5rddqp4d9HLE+u11DtRULv+DQntHDutaXvts7cEiTVR3j0aRfFryAn/Aerrm\nFIdiKIpu/RRbs8n186gu9TmRen1LC9YUQqEBf5cuzGccXCfmOwAsiCDM1FFqwiLD\ntM9ULAIBAgMBAAECgf8jIY8kXF9k8VVgGWGiWuVZRPACmAxEz0pdt8hz8+6fIZf7\n5Y1eOsECBptmFaByoj7npi3YUYvP7JpXu3+Wj5ByirVCGqqAvREz5EXOxEfIIIC+\nxQOE8abKaHJCHiboplZZOmEnGdNyNq2InbboXjkWQlrPdcYXY8/8AR+JGj1Bvte4\nOcY5+z8/t9ezhKKGfe/6gT/lalVTEqTlbhhuze+Y6QI0F8dv9YxpTkJEG1tSlQi5\nC1RKQ7X533LDyPoHT2GH8Di8gG/O/1RYKvfeZD5gUzyqi2ZPl1v6Ul0NK9xuZYTE\n2I8jQmjGErBayAiy8bbaYuKUXESKdN1Obi3w5CECgYEA5Qe4F+gRwP9RYpdjyEkW\nVDIlcgocCVJ+Y/5qVFkPmB0oZwXiDrjzM5rgsI26fdhsizYW3nwWQP/cUd847noz\n363z1MyODq3UITJgax15B+PLm7wGABtGTdzCxx4sE9TfHuEW/xId0mgmG/ZQ6y7L\nvnQjTPa/OaMN+3UbSoKQ6U0CgYEAuimNTOpKXD4PO/N0p0ccyvsI7J5qPt/D7pYw\nyBZaHVjxHtn2B3WRRlFj2fQg9iZieBoUP25uplKY53+aXWRLPPm5GqbENraEwr+R\ncW2lfudPv8aj/rANuy3IiGKMdNPEqDFxMDwYEHiC6k57LDeJvfDOXXrYL/OtfcO4\nZp0fgYUCgYAyGmMyj6k6oGAsglPo39xLpQC+FuoVO/+8Xk7iju0zaMWK7CWM9Pb3\nRh17YjX3C96LAdU07M5tf8ux+XRZ70/j0gkyd2FoYqyyanPfWv48NKA5PIPPiCf0\nJqRRrQ8Vc48wESvXtx3hBrm3ikYffQhDbOLAFoa01C/d37uNrEyJTQKBgQCNSXn3\nNR3IkkUnn+caCcuddhbY1oYWP+fJTO2q/ePYwCcH3i5ujNj8AEuDIFhf2NQFCO3z\nElIiIy/vCpZSaQr9NR46TvU9/RoXYCL3blsbTFznVNAkPOO++slmUTz+cbagXB3m\nmMU+wufBAl1TOrdsk7Vblx86jXtPptpt7rP5rQKBgQCJrVLd9F+yb7x0XJn3Z0YZ\n5Qb29NhHPYze4YasTwLGq8kG0y/MaT7k+Tag79bnLqR6hJoQgZSvLDEdjmZtwSNz\ngpUouvdLqYRMa4ntIT+YghlII+KiZAOcpj9PmrW/096JR4eFgAUPcLC5J9S+YWvB\n7O5cn7RK+50XjEWF9mOfHg==\n-----END PRIVATE KEY-----\n",
                "client_email": "firebase-adminsdk-wc7ne@botform-hook.iam.gserviceaccount.com",
                "client_id": "101505158337020249981",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://accounts.google.com/o/oauth2/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-wc7ne%40botform-hook.iam.gserviceaccount.com"
            }
        ),
        databaseURL: "https://botform-hook.firebaseio.com"
    }, "botform_hook")
}

module.exports = FB

