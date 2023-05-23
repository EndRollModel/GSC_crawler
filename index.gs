/**
 * config
 */
const sheetId = PropertiesService.getScriptProperties().getProperty('sheetId');
const baseUrl = 'https://www.goodsmile.info'; // gsc baseurl
const resUrl = 'https://www.goodsmile.info/zh/releaseinfo';
const url = 'https://www.goodsmile.info/zh/products/announced'; // all product - you can get all lang product - edit (zh - 中文, ja - jp, en - eng)
const spreadsheet = SpreadsheetApp.openById(sheetId); // set sheet id
const lineToken = PropertiesService.getScriptProperties().getProperty('lineToken'); // set your line bot token

const sheetNameObj = ["GSCProduct", "GSCInformation", "UserInfo", "ResInfo"]; // sheet page name
let productSheet = spreadsheet.getSheetByName(sheetNameObj[0]); // 所有商品資訊 - all product information - GSCProduct
let infoSheet = spreadsheet.getSheetByName(sheetNameObj[1]); // 下載時的資訊 - update information - GSCInformation
let userSheet = spreadsheet.getSheetByName(sheetNameObj[2]); // 使用者資訊 - userInfo
let resInfoSheet = spreadsheet.getSheetByName(sheetNameObj[3]); // 出貨資訊 - resInfo

/** ------------------------------------------------------------------------------------------------------
 *  Sheet 區塊
 * -------------------------------------------------------------------------------------------------------*/

/**
 * 自動建立 Sheet 的內容
 * auto create sheet tag & key
 */
function checkSheet() {
    if (productSheet == null) {
        const rename = spreadsheet.getSheets()[0];
        rename.setName(sheetNameObj[0]);
        rename.getRange("A1:F1").setValues([["name", "num", "url", "pic", "directions", "index"]]);
    }
    if (infoSheet == null) {
        const insert = spreadsheet.insertSheet();
        insert.setName(sheetNameObj[1]);
        insert.getRange("A1:D1").setValues([["data", "update", "lastTime", "lastTimeNum"]]);
        spreadsheet.moveActiveSheet(2);
    }
    if (userSheet == null) {
        const insert = spreadsheet.insertSheet();
        insert.setName(sheetNameObj[2])
        insert.getRange("A1:C1").setValues([["userId", "display", "userPic"]]);
        spreadsheet.moveActiveSheet(3);
    }
    if (resInfoSheet == null) {
        const insert = spreadsheet.insertSheet();
        insert.setName(sheetNameObj[3])
        insert.getRange("A1:G1").setValues([["year", "month", "day", "productName", "url", "memo", "jan"]]);
        spreadsheet.moveActiveSheet(4);
    }
}

/**
 * get GSC page data
 * 取得所有資料 function 手動設定計時器更新 / 官網更新時間約在GMT+8的上午11點
 * 所以定時器推薦設定每日中午過後 一天運作一次即可 但若有特殊需求 也是建議兩到四小時左右一次即可
 */
function getGSCstore() {
    if (spreadsheet === null) { // 若沒取得任何表格則不開始此動作 not set sheet id
        showLog('no get any sheet')
        return;
    }
    checkSheet(); // 先檢查是否有表格沒有先建立 check page is created
    const reqStartTime = Date.now();
    let response = UrlFetchApp.fetch(url);
    const reqEndTime = Date.now();
    showLog(`Page request : ${(reqEndTime - reqStartTime) / 1000} Sec`); // request time
    let $ = Cheerio.load(response.getContentText(), {decodeEntities: false});
    //-------------------
    const dateStart = Date.now();
    const directionsList = [];
    const directions = $("#searchArea h3").get();
    for (let i = 0; i < directions.length; i++) {
        directionsList.push($(directions).eq(i).text().trim().replace(/ /g, '').replace(/\n/g, ' '));
    }
    // directions : h3 info , data : info <- 格式
    const totalInfo = [];
    const productBody = $('.hitList.clearfix').get();
    let productCount = 0;
    productBody.forEach((elem, index) => {
        const itemList = {
            nameList: [], // 產品名稱 product name
            numList: [], // 編號 有些產品有 有些沒有 number
            picList: [], // 圖片網址 image url
            urlList: [], // 連接網址 page url
        };

        const item = $(elem).find($('.hitBox')).get();
        for (let i = 0; i < item.length; i++) {
            // 判斷是否需要取編號
            switch (true) {
                // 因編號可能為空
                case $(item).eq(i).find('.hitNum.nendoroid').text().trim() !== '': // 如果黏土人有編號
                    itemList.numList.push($(item).eq(i).find('.hitNum.nendoroid').text().trim())
                    break;
                case $(item).eq(i).find('.hitNum.figma').text().trim() !== '': // 如果figma有編號
                    itemList.numList.push($(item).eq(i).find('.hitNum.figma').text().trim())
                    break;
                default:
                    itemList.numList.push(-1)
                    break;
            }
            itemList.nameList.push($(item).eq(i).find('.hitTtl').text().trim())
            itemList.picList.push(`https:${$(item).eq(i).find('img').attr('data-original')}`);
            itemList.urlList.push($(item).eq(i).find('a').attr('href'))
            productCount++;
        }
        totalInfo.push({directions: directionsList[index], data: itemList})
    })
    const dateEnd = Date.now();

    let infoObjSize = 0; // 更新用物件
    let infoArr = [];

    const sheetObjList = [];
    for (let i = 0; i < totalInfo.length; i++) {
        for (let j = 0; j < totalInfo[i].data.nameList.length; j++) {
            sheetObjList.push([totalInfo[i].data.nameList[j], totalInfo[i].data.numList[j], totalInfo[i].data.urlList[j], totalInfo[i].data.picList[j], totalInfo[i].directions, i]);
        }
        if (i === 0) {
            infoObjSize = totalInfo[i].data.nameList.length; // 僅紀錄最新一筆的內容 比對用
        }
        // infoObjSize += totalInfo[i].data.nameList.length; // 紀錄每個物件的最大值 比對用
        infoArr.push(totalInfo[i].data.nameList.length) // 紀錄每個物件數量
    }
    // showLog(`infoArr: ${infoObjSize}`);
    showLog(`format : ${(dateEnd - dateStart) / 1000} Sec`);
    // 刪除原有資料覆蓋
    const delStartTime = Date.now();
    deleteRow(); // 刪除資料
    const delEndTime = Date.now();
    showLog(`del data : ${(delEndTime - delStartTime) / 1000} Sec`);
    // 寫入資料
    const insStartTime = Date.now();
    productSheet.getRange(`A2:F${productCount + 1}`).setValues(sheetObjList); // 寫入筆數
    const insEndTime = Date.now();
    showLog(`write data : ${(insEndTime - insStartTime) / 1000} Sec`);

    const updateTime = new Date()
    const updateTimeFormat = Utilities.formatDate(updateTime, 'Asia/Taipei', 'yyyy-MM-dd HH:mm');

    const lastTimeObject = infoSheet.getRange(`B2`).getValue();
    const lastTimeArr = infoSheet.getRange(`B3`).getValue();
    // showLog(`lastTimeArr :${lastTimeObject}`);
    if (lastTimeObject != null) {
        if (lastTimeObject !== infoObjSize) { //比對數字不同
            infoSheet.getRange(`C2`).setValue(updateTimeFormat);
            infoSheet.getRange(`D2`).setValue(lastTimeObject);
            infoSheet.getRange(`D3`).setValue(lastTimeArr)
            const productNumber = infoObjSize - lastTimeObject;
            if (productNumber > 0) {
                showLog(`product update num =${productNumber}`);
                pushMessage(flexNewProTitle(newProduct(productNumber)), productNumber); //比較差異後推播新產品訊息
            }
        }
    }
    infoSheet.getRange(`A2:B2`).setValues([[updateTimeFormat, infoObjSize]]); // 寫入更新時間
    infoSheet.getRange(`B3`).setValue(JSON.stringify(infoArr)); // 寫入數量
}

/**
 *  取得出貨資訊
 */
function getResInfo() {
    checkSheet();
    const resStartTime = Date.now();
    let response = UrlFetchApp.fetch(resUrl);
    const reqEndTime = Date.now();
    // showLog(`Page request : ${(reqEndTime - reqStartTime) / 1000} Sec`); // request time
    let $ = Cheerio.load(response.getContentText(), {decodeEntities: false});
    const totalList = []
    const resInfoList = [];
    $('.arrowlisting').each((i, e) => {
        totalList.push(e)
    })
    $(totalList).each((i, e) => {
        const resDate = $(e).find('#largedate').text().trim();// 最外圍的年月
        $(e).find('#syukkagreen').each((id, el) => {
            // syukkagreen 出貨月日  ul內是該日品項 li內是每個內容
            const ulel = $(el).next('ul').find('li');
            ulel.each((ind, ele) => {
                const year = resDate.split('.')[0];
                const month = resDate.split('.')[1];
                const day = $(el).text().trim().split('月')[1].split('日')[0];
                const prodName = $(ele).text().replace(/[\t\n\r]| {20}/g, '').trim()
                const productName = prodName.split('JAN')[0];
                const memo = $(el).text().trim().indexOf('全國') > -1 ? $(el).text().trim().split('）')[1] : ''
                const url = `${baseUrl}${$(ele).find('a').attr('href')}`;
                const jan = prodName.split('JAN： ')[1];
                resInfoList.push([year, month, day, productName, url, memo, jan])
            })
        })
    })
    const resEndTime = Date.now();
    showLog(`getResInfo : ${(resEndTime - resStartTime) / 1000} Sec`);
    resInfoSheet.getRange(`A2:G${resInfoList.length + 1}`).setValues(resInfoList); // 寫入筆數
}

/**
 * 全商品搜尋
 * search all product
 */
function searchALLProduct(target) {
    const productList = productSheet.getRange(`A2:E${productSheet.getLastRow()}`).getValues();
    const productFilter = productList.filter(elem => elem[0].toLowerCase().indexOf(target.toLowerCase()) > -1);
    let proNumber = 0;
    if (productFilter.length <= 10) {
        proNumber = productFilter.length;
    } else {
        proNumber = 10
    }
    const contents = [];

    for (let i = 0; i < proNumber; i++) {
        contents.push(allProMsgModel(productFilter[i][0], productFilter[i][1], productFilter[i][2], productFilter[i][3], productFilter[i][4]))
    }
    return contents;
}

/**
 * 當月搜尋
 * search current month product
 */
function searchMonthProduct(target) {
    let proIndex = 0
    const proIndexObject = productSheet.getRange(`F2:F${productSheet.getLastRow()}`).getValues();
    for (let i = 0; i < proIndexObject.length; i++) {
        if (proIndexObject[i][0] == 0) {
            proIndex++;
        }
    }
    const productList = productSheet.getRange(`A2:F${proIndex + 1}`).getValues();
    const productFilter = productList.filter(elem => elem[0].toLowerCase().indexOf(target.toLowerCase()) > -1);

    // showLog(productSheet.getRange(`A2:A${productSheet.getMaxRows()}`).getValues());

    let proNumber = 0;
    if (productFilter.length <= 10) {
        proNumber = productFilter.length;
    } else {
        proNumber = 10
    }

    const contents = [];

    for (let i = 0; i < proNumber; i++) {
        contents.push(monthProMsgModel(productFilter[i][0], productFilter[i][1], productFilter[i][2], productFilter[i][3], productFilter[i][4]))
    }

    showLog(JSON.stringify(contents));
    return contents;
}

function searchResInfo(keyword) {
    // "year", "month", "day", "productName", "url", "memo", "jan"
    const dateCheck = /[./]/g.test(keyword);
    const productList = resInfoSheet.getRange(`A2:G${resInfoSheet.getLastRow()}`).getDisplayValues();
    let returnObj = []
    let maxItem = 50;
    if (dateCheck) {
        // 搜尋日期
        const dateData = keyword.split(/[./]/g);
        let searchType = -1;
        switch (dateData.length) {
            case 2: // 年月 月日
                if (dateData[0] > 12 && dateData[0].length === 2) searchType = 0 //大於12必是年份
                if (dateData[0] <= 12 && dateData[1] <= 31) searchType = 1 // 月份少於12 日期少於31 必是月日
                showLog(`search type : ${searchType}`);
                switch (searchType) {
                    case -1: //四位數的年份
                        returnObj = productList.filter((elem) => elem[0] === dateData[0] && elem[1] === dateData[1])
                        break;
                    case 0: // 兩位數的年份 +2000
                        returnObj = productList.filter((elem) => elem[0] === (parseInt(dateData[0]) + 2000).toString() && elem[1] === dateData[1]);
                        break;
                    case 1: // 月日
                        returnObj = productList.filter((elem) => elem[1] === dateData[1] && elem[2] === dateData[2])
                        break;
                    default : // 我是誰 為什麼我在這
                        showLog(`searchResInfo: error keyword "${keyword}"`);
                        break;
                }
                break;
            case 3: // 年月日
                dateData[0] = dateData[0].length === 2 ? (parseInt(dateData[0]) + 2000).toString() : dateData[0];
                returnObj = productList.filter((elem) => elem[0] === dateData[0] && elem[1] === dateData[1] && elem[2] === dateData[2])
                break;
        }
        returnObj = returnObj.length > maxItem ? returnObj.slice(0, maxItem) : returnObj;
        const productNameList = returnObj.map((e, i) => `品項：${e[3]}\t 出貨日：${e[0]}/${e[1]}/${e[2]}`).join('\n')
        returnObj = `「${keyword}」的出貨列表\n${productNameList}`
    } else {
        showLog(`search type item: ${returnObj.length}`);
        // 搜尋品名
        returnObj = productList.filter((elem) => elem[3].indexOf(keyword) > -1);
        returnObj = returnObj.length > maxItem ? returnObj.slice(0, maxItem) : returnObj;
        const productNameList = returnObj.map((e, i) => `品項：${e[3]} \t 出貨日：${e[0]}/${e[1]}/${e[2]}`).join('\n')
        returnObj = `「${keyword}」的查詢結果如下\n${productNameList}`;
    }

    return returnObj;
}

/**
 * 比較差異時 有新商品上架
 * check have new product
 */
function newProduct(number) {
    // if (number > 10) number = 10;
    // const proInfo = productSheet.getRange(`A2:E${number + 1}`).getValues();
    // const contents = [];
    // proInfo.forEach((elem) => {
    //   contents.push(newProMsgModel(elem[0], elem[1], elem[2], elem[3], elem[4]));
    // })
    // return contents;
    if (number > 40) number = 40; // 最多40個內容
    const proInfo = productSheet.getRange(`A2:E${number + 1}`).getValues();
    const totalContents = [];
    let contents = [];
    proInfo.forEach((elem, index) => {
        if (index !== 0 && index % 10 == 0) {
            totalContents.push(contents);
            contents = [];
        }
        contents.push(newProMsgModel(elem[0], elem[1], elem[2], elem[3], elem[4]));
        if (index == proInfo.length - 1) {
            totalContents.push(contents);
        }
    })
    return totalContents;
}

/**
 * 指令區塊
 * command
 */
function startCommand(id, text) {
    if (text === '') return
    let message;
    switch (text) {
        case "紀錄":
        case "record":
            message = (getUserInfog(id)); // Ue9ecadc04d62eb7cfd49f55f177ad128
            break;
        default:
            break;
    }
    return message;
}

/**
 * 刪除所有商品資料
 * del all row date
 */
function deleteRow() {
    if (productSheet.getLastRow() - 1 !== 0) {
        for (let i = 0; i < productSheet.getLastRow(); i++) { // 取得最後一列長度
            productSheet.deleteRows(2, productSheet.getLastRow() - 1); // key不刪除 從第一筆資料刪除到最後一筆資料
        }
    }
}

/**
 * 刪除所有出貨資料
 * del all row date
 */
function deleteResInfoRow() {
    if (resInfoSheet.getLastRow() - 1 !== 0) {
        for (let i = 0; i < resInfoSheet.getLastRow(); i++) { // 取得最後一列長度
            resInfoSheet.deleteRows(2, resInfoSheet.getLastRow() - 1); // key不刪除 從第一筆資料刪除到最後一筆資料
        }
    }
}


/** ------------------------------------------------------------------------------------------------------
 *  Line 接收訊息區
 * -------------------------------------------------------------------------------------------------------*/

function doPost(e) {
    let message = JSON.parse(e.postData.contents);
    let replayToken = message.events[0].replyToken;
    let eventsType = message.events[0].type;
    if (eventsType != 'message') return; // 傳送非訊息
    const userMessage = message.events[0].message.text;
    const userId = message.events[0].source.userId;
    if (userMessage == '' || userMessage == undefined) return; // 傳空訊息或是非文字訊息
    let searchType = -1;
    const commandType = {
        allProduct: {index: 0, keyword: "!"}, // 全商品(現年度)搜尋
        month: {index: 1, keyword: "@"}, // 該月商品搜尋
        command: {index: 2, keyword: "#"}, // 指令操控
        resCommand: {index: 3, keyword: "?"} // 出貨情報
    }
    switch (userMessage[0]) {
        case commandType.allProduct.keyword: // 全搜尋
            searchType = commandType.allProduct.index;
            break;
        case commandType.month.keyword: // 當月
            searchType = commandType.month.index;
            break;
        case commandType.command.keyword: // 指令
            searchType = commandType.command.index;
            break;
        case commandType.resCommand.keyword:
            searchType = commandType.resCommand.index;
            break
        default:
            break;
    }
    if (searchType === -1) return; //非指令
    let proList;
    let searchTarget = userMessage.replace(commandType.allProduct.keyword, '').replace(commandType.month.keyword, '').replace(commandType.command.keyword, '').replace(commandType.resCommand.keyword, '');
    switch (searchType) {
        case commandType.allProduct.index:
            proList = searchALLProduct(searchTarget);
            break;
        case commandType.month.index:
            proList = searchMonthProduct(searchTarget);
            break;
        case commandType.command.index:
            proList = startCommand(userId, searchTarget);
            break;
        case commandType.resCommand.index:
            if(searchTarget.trim().length === 0){
                proList = resReadMe();
            } else {
                proList = searchResInfo(searchTarget);
            }
            break;
        default:
            break;
    }
    let msgObj;
    if (proList.length < 1) {
        msgObj = notFoundMsgModel();
    } else {
        switch (searchType) {
            case commandType.allProduct.index:
            case commandType.month.index:
                msgObj = flexTitle(proList);
                break;
            case commandType.command.index:
                msgObj = proList[0];
                break;
            case commandType.resCommand.index:
                msgObj = textMsg(proList);
                break;
        }
    }
    let data = {
        replyToken: replayToken,
        messages: [
            msgObj
        ]
    };
    let option = {
        method: 'post',
        headers: {Authorization: 'Bearer ' + lineToken},
        contentType: 'application/json',
        payload: JSON.stringify(data)
    };

    sendLineMessage(option); // 傳送訊息

}

/** ------------------------------------------------------------------------------------------------------
 *  Line Function
 * -------------------------------------------------------------------------------------------------------*/

/**
 * 回傳訊息
 * reply message
 */
function sendLineMessage(body) {
    const lineRes = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', body);
    showLog(lineRes)
}

/**
 * 取得userId
 * get userId
 */
function getUserInfog(userId) {
    const userList = userSheet.getRange(`A2:A${userSheet.getLastRow()}`).getValues();
    const userFilter = userList.filter((elem) => elem[0] === userId);
    showLog(userFilter)
    if (userFilter.length > 0) return [userIsExist()];
    try {
        const response = UrlFetchApp.fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
            "method": "GET",
            "headers": {
                "Authorization": `Bearer ${lineToken}`,
                "Content-Type": "application/json"
            },
        });
        const namedata = JSON.parse(response); // 解析 json
        const userName = namedata.displayName; // 抓取 json 裡的 displayName
        const userPic = namedata.pictureUrl;
        userSheet.appendRow([userId, userName, userPic])
    } catch (e) {
        return [userWriteFail()];
    }
    return [userWriteSuccess()];
}

/**
 * 推播
 * push message
 */
function pushMessage(message, number) {
    const getMaxuserIndex = userSheet.getLastRow() > 3 ? 3 : userSheet.getLastRow();
    try {
        const users = userSheet.getRange(`A2:A${getMaxuserIndex}`).getValues();
        const msgObj = {};
        const userList = [];
        const msgbody = [];
        msgbody.push({
            type: "text",
            text: `有${number}個商品上架囉！`
        });
        message.forEach((e) => {
            msgbody.push(e)
        })
        users.forEach((elem) => {
            userList.push(elem[0]);
        })
        msgObj.to = userList;
        msgObj.messages = msgbody;
        msgObj.notificationDisabled = "false";
        showLog(JSON.stringify(msgObj))
        UrlFetchApp.fetch(`https://api.line.me/v2/bot/message/multicast`, {
            "method": "POST",
            "headers": {
                "Authorization": `Bearer ${lineToken}`,
                "Content-Type": "application/json"
            },
            "payload": JSON.stringify(msgObj)
        })
    } catch (e) {
        showLog(e.message)
        return; //推播錯誤
    }
    return;
}

/** ------------------------------------------------------------------------------------------------------
 *  Other
 * -------------------------------------------------------------------------------------------------------*/

function showLog(msg) {
    Logger.log(msg);
}

function resReadMe (){
    return `出貨查詢操作說明:\n使用'?'關鍵字作為前綴時可查詢出貨商品\n舉例：\n使用「?2023/5」時可以查詢23年5月的出貨商品列表\n使用「?品名」時可以查詢有該內容的出貨資訊`
}


/** ------------------------------------------------------------------------------------------------------
 *  Line Message Block (懶得製作成物件)
 * -------------------------------------------------------------------------------------------------------*/


function notFoundMsgModel() {
    const msg = {};
    msg.type = "text";
    msg.text = "資料全Loss了";
    return msg;
}

function userIsExist() {
    const msg = {};
    msg.type = "text";
    msg.text = "使用者已被紀錄";
    return msg
}

function userWriteSuccess() {
    const msg = {};
    msg.type = "text";
    msg.text = "使用者紀錄成功";
    return msg
}

function userWriteFail() {
    const msg = {};
    msg.type = "text";
    msg.text = "使用者紀錄失敗";
    return msg
}

function flexTitle(body) {
    const title = {}
    title.type = 'flex';
    title.altText = '搜尋結果';
    title.contents = {};
    title.contents.type = 'carousel';
    title.contents.contents = body;
    return title
}

function textMsg(body) {
    const title = {}
    title.type = 'text';
    title.text = body;
    return title
}

function flexNewProTitle(body) {
    // const title = {}
    // title.type = 'flex';
    // title.altText = '新商品上架囉！';
    // title.contents = {};
    // title.contents.type = 'carousel';
    // title.contents.contents = body;
    // return title
    //---------------
    const proTitles = [];
    body.forEach((elem) => {
        const title = {}
        title.type = 'flex';
        title.altText = '新商品上架囉！';
        title.contents = {};
        title.contents.type = 'carousel';
        title.contents.contents = elem;
        proTitles.push(title);
    })
    return proTitles
}

function allProMsgModel(title, num, url, image, text) {
    let returnData;
    if (num !== -1) {
        returnData = {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "image",
                        "url": image,
                        "size": "full",
                        "aspectMode": "cover",
                        "aspectRatio": "5:4",
                        "gravity": "top"
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": title,
                                        "size": "xs",
                                        "color": "#ffffff",
                                        "weight": "bold",
                                        "wrap": true
                                    }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": text,
                                        "color": "#ebebeb",
                                        "size": "xxs",
                                        "flex": 0,
                                        "wrap": true
                                    }
                                ],
                                "spacing": "lg",
                                "margin": "sm"
                            }
                        ],
                        "position": "relative",
                        "offsetBottom": "0px",
                        "offsetStart": "0px",
                        "offsetEnd": "0px",
                        "backgroundColor": "#03303Acc",
                        "paddingTop": "10px",
                        "paddingStart": "14px",
                        "paddingEnd": "14px",
                        "height": "90px"
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "text",
                                "text": num.toString(),
                                "color": "#ffffff",
                                "size": "xxs",
                                "offsetTop": "1px",
                                "align": "center"
                            }
                        ],
                        "position": "absolute",
                        "cornerRadius": "20px",
                        "offsetTop": "5px",
                        "backgroundColor": "#ff334b",
                        "offsetStart": "5px",
                        "height": "18px",
                        "width": "45px"
                    }
                ],
                "paddingAll": "0px",
                "action": {
                    "type": "uri",
                    "label": "action",
                    "uri": url
                }
            },
            "size": "micro"
        }
    } else {
        returnData = {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "image",
                        "url": image,
                        "size": "full",
                        "aspectMode": "cover",
                        "aspectRatio": "5:4",
                        "gravity": "top"
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": title,
                                        "size": "xs",
                                        "color": "#ffffff",
                                        "weight": "bold",
                                        "wrap": true
                                    }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": text,
                                        "color": "#ebebeb",
                                        "size": "xxs",
                                        "flex": 0,
                                        "wrap": true
                                    }
                                ],
                                "spacing": "lg",
                                "margin": "sm"
                            }
                        ],
                        "position": "relative",
                        "offsetBottom": "0px",
                        "offsetStart": "0px",
                        "offsetEnd": "0px",
                        "backgroundColor": "#03303Acc",
                        "paddingTop": "10px",
                        "paddingStart": "14px",
                        "paddingEnd": "14px",
                        "height": "90px"
                    }
                ],
                "paddingAll": "0px",
                "action": {
                    "type": "uri",
                    "label": "action",
                    "uri": url
                }
            },
            "size": "micro"
        }
    }
    return returnData;
}

function monthProMsgModel(title, num, url, image, text) {
    let returnData;
    if (num !== -1) {
        returnData = {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "image",
                        "url": image,
                        "size": "full",
                        "aspectMode": "cover",
                        "aspectRatio": "5:4",
                        "gravity": "top"
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": title,
                                        "size": "xs",
                                        "color": "#ffffff",
                                        "weight": "bold",
                                        "wrap": true
                                    }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": text,
                                        "color": "#ebebeb",
                                        "size": "xxs",
                                        "flex": 0,
                                        "wrap": true
                                    }
                                ],
                                "spacing": "lg",
                                "margin": "sm"
                            }
                        ],
                        "position": "relative",
                        "offsetBottom": "0px",
                        "offsetStart": "0px",
                        "offsetEnd": "0px",
                        "backgroundColor": "#03303Acc",
                        "paddingTop": "10px",
                        "paddingStart": "14px",
                        "paddingEnd": "14px",
                        "height": "65px"
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "text",
                                "text": num.toString(),
                                "color": "#ffffff",
                                "size": "xxs",
                                "offsetTop": "1px",
                                "align": "center"
                            }
                        ],
                        "position": "absolute",
                        "cornerRadius": "20px",
                        "offsetTop": "5px",
                        "backgroundColor": "#ff334b",
                        "offsetStart": "5px",
                        "height": "18px",
                        "width": "45px"
                    }
                ],
                "paddingAll": "0px",
                "action": {
                    "type": "uri",
                    "label": "action",
                    "uri": url
                }
            },
            "size": "micro"
        }
    } else {
        returnData = {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "image",
                        "url": image,
                        "size": "full",
                        "aspectMode": "cover",
                        "aspectRatio": "5:4",
                        "gravity": "top"
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": title,
                                        "size": "xs",
                                        "color": "#ffffff",
                                        "weight": "bold",
                                        "wrap": true
                                    }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": text,
                                        "color": "#ebebeb",
                                        "size": "xxs",
                                        "flex": 0,
                                        "wrap": true
                                    }
                                ],
                                "spacing": "lg",
                                "margin": "sm"
                            }
                        ],
                        "position": "relative",
                        "offsetBottom": "0px",
                        "offsetStart": "0px",
                        "offsetEnd": "0px",
                        "backgroundColor": "#03303Acc",
                        "paddingTop": "10px",
                        "paddingStart": "14px",
                        "paddingEnd": "14px",
                        "height": "65px"
                    }
                ],
                "paddingAll": "0px",
                "action": {
                    "type": "uri",
                    "label": "action",
                    "uri": url
                }
            },
            "size": "micro"
        }
    }
    return returnData;
}

function newProMsgModel(title, num, url, image, text) {
    let returnData;
    if (num !== -1) {
        returnData = {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "image",
                        "url": image,
                        "size": "full",
                        "aspectMode": "cover",
                        "aspectRatio": "5:4",
                        "gravity": "top"
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": title,
                                        "size": "xs",
                                        "color": "#ffffff",
                                        "weight": "bold",
                                        "wrap": true
                                    }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": " ",
                                        "color": "#ebebeb",
                                        "size": "xxs",
                                        "flex": 0,
                                        "wrap": true
                                    }
                                ],
                                "spacing": "lg",
                                "margin": "sm"
                            }
                        ],
                        "position": "relative",
                        "offsetBottom": "0px",
                        "offsetStart": "0px",
                        "offsetEnd": "0px",
                        "backgroundColor": "#03303Acc",
                        "paddingTop": "10px",
                        "paddingStart": "14px",
                        "paddingEnd": "14px",
                        "height": "65px"
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "text",
                                "text": num.toString(),
                                "color": "#ffffff",
                                "size": "xxs",
                                "offsetTop": "1px",
                                "align": "center"
                            }
                        ],
                        "position": "absolute",
                        "cornerRadius": "20px",
                        "offsetTop": "5px",
                        "backgroundColor": "#ff334b",
                        "offsetStart": "5px",
                        "height": "18px",
                        "width": "45px"
                    }
                ],
                "paddingAll": "0px",
                "action": {
                    "type": "uri",
                    "label": "action",
                    "uri": url
                }
            },
            "size": "micro"
        }
    } else {
        returnData = {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "image",
                        "url": image,
                        "size": "full",
                        "aspectMode": "cover",
                        "aspectRatio": "5:4",
                        "gravity": "top"
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": title,
                                        "size": "xs",
                                        "color": "#ffffff",
                                        "weight": "bold",
                                        "wrap": true
                                    }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": " ",
                                        "color": "#ebebeb",
                                        "size": "xxs",
                                        "flex": 0,
                                        "wrap": true
                                    }
                                ],
                                "spacing": "lg",
                                "margin": "sm"
                            }
                        ],
                        "position": "relative",
                        "offsetBottom": "0px",
                        "offsetStart": "0px",
                        "offsetEnd": "0px",
                        "backgroundColor": "#03303Acc",
                        "paddingTop": "10px",
                        "paddingStart": "14px",
                        "paddingEnd": "14px",
                        "height": "65px"
                    }
                ],
                "paddingAll": "0px",
                "action": {
                    "type": "uri",
                    "label": "action",
                    "uri": url
                }
            },
            "size": "micro"
        }
    }
    return returnData;
}
