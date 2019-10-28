var ss = SpreadsheetApp.getActiveSpreadsheet();

var sheetLook = {};

sheetLook['DropTokyo']  = ss.getSheetByName('DropTokyo');
sheetLook['Dappei']     = ss.getSheetByName('Dappei');
sheetLook['WearJP']     = ss.getSheetByName('WearJP');

var sheetConfig = ss.getSheetByName('config');
var sheetUser   = ss.getSheetByName('user');

var numRowUser      = sheetUser.getLastRow();

var configLine      = getConfig(2);

var LINE_CHANNEL_ACCESS_TOKEN   = configLine.ChannelAccessToken;
var LINE_HEADERS                = {'Content-Type': 'application/json; charset=UTF-8', 'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN,};

/* Other functions */

// To get config JSON
function getConfig(rowIndex){

    return JSON.parse( sheetConfig.getRange(rowIndex, 2).getValue() );

}

// To get a random number
function getRandomNumer(lower, upper){

    return Math.floor(Math.random()*(upper - lower)) + lower;

};

// To add the category to the subscription array of given uid
function addSubscription(uid, category){

    var subscriptionList = getUserSubscriptions(uid);

    var rowIndexUser = getUserRowIndex(uid);

    if( subscriptionList.indexOf(category) < 0 ){

        subscriptionList.push(category);

        sheetUser.getRange(rowIndexUser, 2).setValue( JSON.stringify(subscriptionList) );

    }

}

// To remove the category from the subscription array of given uid
function removeSubscription(uid, category){

    var subscriptionList = getUserSubscriptions(uid);

    if( subscriptionList.indexOf(category) >= -1 ){

        subscriptionList = subscriptionList.filter(function(value, index, subscriptionList){

            return value !== category;

        });

        var rowIndexUser = getUserRowIndex(uid);

        sheetUser.getRange(rowIndexUser, 2).setValue( JSON.stringify(subscriptionList) );

    }

}

// To get the subscriptions of given uid
function getUserSubscriptions(uid){

    var subscriptionList = [];

    var rowIndexUser = getUserRowIndex(uid);

    if(rowIndexUser > 0){

        subscriptionList = JSON.parse( sheetUser.getRange(rowIndexUser, 2).getValue() );

    }

    return subscriptionList;

}

// Webhook main function
function doPost(e) {

    var eventObject = JSON.parse(e.postData.contents).events[0];

    var replyToken  = eventObject.replyToken;
    var uid         = eventObject.source.userId;
    var type        = eventObject.type;

    addUser(uid);

    switch(type){

        case 'message':

            var arguments = eventObject.message.text.split(';');

            var command = arguments[0];

            switch(command){

                case 'subscriptions':

                    replySubscriptions(replyToken, uid);

                    break;

                case 'unsubscript':

                    var category = arguments[1];

                    removeSubscription(uid, category);

                    replySimpleMessage(replyToken, "已取消訂閱 " + category);

                    break;

                case 'subscript':

                    var category = arguments[1];

                    addSubscription(uid, category);

                    replySimpleMessage(replyToken, "已訂閱 " + category);

                    break;

                case 'DropTokyo':

                    replyCategoryMessage(replyToken, 'DropTokyo');
                    break;

                case 'WearJP':

                    replyCategoryMessage(replyToken, 'WearJP');
                    break;

                case 'Dappei':
                default:

                    replyCategoryMessage(replyToken, 'Dappei');
                    break;

            }

            break;

        case 'unfollow':

            break;

        case 'follow':

            addUser(uid);

            break;

        default:

            break;

    }

}

/* DB functions */

// To add a uid
function addUser(uid){

    // Check if given uid exist in user sheet

    var ifExist = getUserRowIndex(uid) > 0 ? true : false;

    if(!ifExist){

        sheetUser.appendRow([uid,"[]"]);

    }

}

// To get user list
function getUserList(){

    var userList = [];

    var userRange = sheetUser.getRange(2, 1, numRowUser, 2);

    var numRowsUserRange = userRange.getNumRows();

    for(var i = 1; i < numRowsUserRange; i++){

        var userItem = {};

        userItem.uid            = userRange.getCell(i, 1).getValue();
        userItem.subscriptions  = JSON.parse(userRange.getCell(i, 2).getValue());

        userList.push(userItem);

    }

    return userList;

}

// To get row index of given uid in user sheet
function getUserRowIndex(uid){

    var rowIndexUser = 0;

    for(var i = 2; i < numRowUser+1; i++){

        var v = sheetUser.getRange(i, 1).getValue();

        if(v === uid){

            rowIndexUser = i;

            break;

        }

    }

    return rowIndexUser;

}

// Get randomly pick-up message list
function getRandomPickupMessageList(category){

    var numRow = sheetLook[category].getLastRow();

    var listNumberRandom = [];

    var i = 3;

    listNumberRandom.push( getRandomNumer(2, numRow) );

    while(i){

        var x = getRandomNumer(2, numRow);

        if(listNumberRandom.indexOf(x) < 0 ) {

            listNumberRandom.push(x);
            i--;

        }

    }

    var messageList = [
        {
            type: "text",
            text: category

        }

    ];

    listNumberRandom.forEach(function(item, index, array){

        messageList.push( {
            type: "image",
            originalContentUrl: sheetLook[category].getRange(item, 1).getValue(),
            previewImageUrl: sheetLook[category].getRange(item, 1).getValue()
        });

    });

    return messageList;

}

/* LINE reply function*/
// To reply simple text message
function replySimpleMessage(replyToken, message){

    replyMessage(replyToken, [{type:"text",text:message}]);

}

// To reply message
function replyMessage(replyToken, messageList){

    UrlFetchApp.fetch(
		configLine.API.Reply,
		{
			headers: LINE_HEADERS,
			method: 'post',
			payload: JSON.stringify({
				replyToken: replyToken,
				messages: messageList
			})
		}
    );

}

// To reply the subscriptions list of given uid
function replySubscriptions(replyToken, uid){

    var subscriptions = getUserSubscriptions(uid);

    var messageList = [
        {
            type: "template",
            altText: "我的訂閱",
            template: {
                type: "carousel",
                columns: [
                    {
                        title: "Dappei",
                        text: "Dappei",
                        actions: [
                            {
                                type: "message",
                                label: subscriptions.indexOf("Dappei") > -1 ? "取消訂閱" : "訂閱",
                                text: subscriptions.indexOf("Dappei") > -1 ? "unsubscript;Dappei" : "subscript;Dappei"
                            }
                        ]
                    },
                    {
                        title: "DropTokyo",
                        text: "DropTokyo",
                        actions: [
                            {
                                type: "message",
                                label: subscriptions.indexOf("DropTokyo") > -1 ? "取消訂閱" : "訂閱",
                                text: subscriptions.indexOf("DropTokyo") > -1 ? "unsubscript;DropTokyo" : "subscript;DropTokyo"
                            }
                        ]
                    },
                    {
                        title: "WearJP",
                        text: "WearJP",
                        actions: [
                            {
                                type: "message",
                                label: subscriptions.indexOf("WearJP") > -1 ?  "取消訂閱" : "訂閱",
                                text: subscriptions.indexOf("WearJP") > -1 ? "unsubscript;WearJP" : "subscript;WearJP"
                            }
                        ]
                    }
                ]
            }
        }
    ];

    replyMessage(replyToken, messageList);

}

// To reply ramdonly pic-up looks of given category
function replyCategoryMessage(replyToken, category){

    var messageList = getRandomPickupMessageList(category);

    replyMessage(replyToken, messageList);

}

// To push messages
function pushMessage(uid, messageList){

    UrlFetchApp.fetch(
		configLine.API.Push,
		{
			headers: LINE_HEADERS,
			method: 'post',
			payload: JSON.stringify({
				to: uid,
                messages: messageList,
                notificationDisabled: true
			})
		}
    );

}

// Daily push
function dailyPush(){

    var userList = getUserList();

    userList.forEach(function(item, index, array){

        var uid = item.uid;
        var subscriptions = item.subscriptions;

        subscriptions.forEach(function(item, index, array){

            var category = item;
            var messageList = getRandomPickupMessageList(category);

            pushMessage(uid, messageList);

        });

    });

}