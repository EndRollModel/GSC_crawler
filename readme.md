# GSC crawler

good smile crawler 

好微笑爬蟲機器人

~~每次好微笑發佈商品時總是錯過 ？ 試試看這個吧~~

主要功能： 主動通知使用者好微笑更新產品訊息, 並且可查詢此年度有販售之產品            

### 架設方式：       
基本準備: 一組已經申請LineBot的Line帳號 和 在google雲端硬碟內建立 google app script 與 一份記錄資料用的google試算表      

#### Line部分:
1. 申請機器人服務      
（進入機器人後 選擇Message API選項 拉至底下 複製Channel access token)

#### 試算表部分:      
1. 複製試算表內的id 如：       
`https://docs.google.com/spreadsheets/d/'這裡的id'/edit#gid=0`   
複製該處的id

#### script部分 :      
1. 點選左側資料庫內容按下+按鈕 貼上此指令id
    `1ReeQ6WO8kKNxoaA_O0XEQ589cIrRvEBA9qcWpNqdOP17i47u6N9M5Xh0`     
    按下確定選擇最新的版本的cheerio     
2. 複製 [Index.gs](https://github.com/EndRollModel/GSC_crawler/blob/master/index.gs) 內的程式碼貼上於右側程式編輯區 按下ctrl + s儲存程式碼
3. 將試算表id貼上至程式碼第五行內 `let spreadsheet = SpreadsheetApp.openById('貼到這裡')`         
4. 將Line Channel access token 貼至第六行 `let lineToken = '貼到這裡'`   
5. 選擇上方函式內容 選擇 getGSCstore 點選一下執行 等待執行完成 現在可以檢查一下試算表內是否已經有資料了   
6. 若有資料了左側選單觸發條件（時鐘圖案） 新增觸發條件選定執行功能getGSCstore,上端,時間驅動,小時計時器,一小時驅動(若想快一點爬也可以調整快一點 但建議不要低於15分鐘 因為好微笑通常不會頻繁更新)      
7. 點選部署 > 新增部署作業 > 誰可以存取改為任何人 按下部署 完成後複製網頁應用程式的網址 
8. 至LineBot管理後台Webhook URL貼上步驟6的網址 按下verift 若寫success則部署完成 
9. 加入你的機器人 指令如下!(關鍵字) 可搜尋所有商品內容 @(關鍵字)可搜尋當月商品
10. 需要接收訊息的人對機器人呼叫`#紀錄`or`#record` 登記使用者名稱後 之後機器人會主動通知

### ＊注意事項       
1. 使用#紀錄的人盡量不要大於5人 因好微笑當月發布商品時若超過一百件 Linebot主動推播訊息無法超過500則(免費額度) 超過額度時則不發送訊息

2. 若架設有困難的人 可以google [gas line bot] 等相關資訊確認

3. 定時功能建議於整點2-5分之間設定 會比較快速抓取該內容

### 使用技術
本篇提供懶人架設法 若有需要自行修改其內容時請參考以下來源       
[Google app script](https://developers.google.com/apps-script)      
[Line Message](https://developers.line.biz/en/docs/messaging-api/)      
[Cheerio for gas 套件](https://github.com/tani/cheeriogs)

#### ＊特別感謝
提出這個想爬好微笑想法的朋友            
AND     
如果需要使用此功能的You   

