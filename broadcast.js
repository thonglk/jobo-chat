var graph = require('fbgraph');
graph.setAccessToken(PAGE_ACCESS_TOKEN);
graph.setVersion("2.12");


class BroadCast {
    Creating_a_Broadcast_Message(messages) {
        return new Promise(function (resolve, reject) {
            graph.post(`me/message_creatives?access_token=${facebookPage[pageID].access_token}`, {messages},
                function (err, result) {
                    console.log('Creating_a_Broadcast_Message', err, result)
                    if (err) reject(err)
                    resolve(result)
                }
            )

        })
    }

    Sending_a_Message_with_a_Label(message_creative_id, custom_label_id) {
        return new Promise(function (resolve, reject) {
            graph.post(`me/broadcast_messages?access_token=${facebookPage[pageID].access_token}`, {
                    message_creative_id, custom_label_id

                },
                function (err, result) {
                    console.log('Sending_a_Message_with_a_Label', err, result)
                    if (err) reject(err)
                    resolve(result)
                }
            )

        })
    }

    Creating_a_Label(pageID, name) {
        return new Promise(function (resolve, reject) {
            graph.post(`me/custom_labels?access_token=${facebookPage[pageID].access_token}`, {name}, function (err, result) {
                console.log('subscribed_apps', err, result)
                if (err) reject(err)
                resolve(result)
            })

        })
    }

    Associating_a_Label_to_a_PSID(LabelId, id, pageID) {
        return new Promise(function (resolve, reject) {
            graph.post(`${LabelId}/label?access_token=${facebookPage[pageID].access_token}`, {user: id}, function (err, result) {
                console.log('subscribed_apps', err, result)
                if (err) reject(err)
                resolve(result)
            })

        })

    }

    Starting_a_Reach_Estimation(pageID, custom_label_id = null) {
        return new Promise(function (resolve, reject) {
            var params = {}
            if (custom_label_id) params.custom_label_id = custom_label_id
            graph.post(`me/broadcast_reach_estimations?access_token=${facebookPage[pageID].access_token}`, function (err, result) {
                console.log('Starting_a_Reach_Estimation', err, result)
                if (err) reject(err)
                graph.get(`${result.reach_estimation_id}?access_token=${facebookPage[pageID].access_token}`, (err, result) => {
                    if (err) reject(err)
                    resolve(result)
                })
            })

        })
    }
    Messaging_Feature_Review(pageID) {
        return new Promise(function (resolve, reject) {
            graph.get(`me/messaging_feature_review?access_token=${facebookPage[pageID].access_token}`, (err, result) => {
                if (err) reject(err)
                resolve(result)
            })

        })
    }

}

module.exports = new BroadCast();