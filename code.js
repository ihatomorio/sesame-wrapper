function doPost(e) {
  var jsonobj = JSON.parse(e.postData.getDataAsString());
  console.log(jsonobj.command);
  
  setSesameSurely(jsonobj.command);
}

function test(){
  try{
    setSesameSurely("lock");
  }catch(err){
    console.error("Error: " + err);
  }
}

//セサミを確実に設定する
//command: "lock", "unlock" or "sync"
function setSesameSurely(command){
  //デバイスIDを得る
  const device_id = getSesameDeviceID();
  if(device_id == undefined) throw "Device ID not Found!";
  
  //要求と現在の状態が一致した場合は終了
  if( command == getSesameStat(device_id) ) {
    console.info("Command Skipped.");
    return;
  }

  //リトライ回数
  var retry_count = 0;
  //セサミの状態セットを成功するまで繰り返す
  while(retry_count < 3){
    //セサミのロックに挑戦
    try{
      var task_id = setSesame(device_id, command);
    }catch(err){
      console.error(arguments.callee.name + "(): " + err);
      throw arguments.callee.name + "(): " + err;
    }
    
    //状態が確定するまで繰り返す
    do{
      //5秒待つ
      Utilities.sleep(5000);
      //実行結果を取得
      try{
        var result = getExecutionResult(task_id);
      }catch(err){
        console.error(arguments.callee.name + "(): " + err);
        throw arguments.callee.name + "(): " + err;
      }
      
      var stat = result.status;
    }
    while(stat != "terminated");
    
    var is_success = result.successful;
    
    if(is_success == true) {
      //成功していたら抜ける
      console.info("Command succeeded: " + command );
      break;
    }else{
      //失敗はログする
      console.info("setSesame(" + command + ")[" + retry_count + "] Fail: " + result.error);
    }
    //リトライ回数カウントをインクリメント
    retry_count += 1;
  }
  
  //回数上限に達していたら通知
  if(retry_count >= 3){
    throw "Retry Limit Exceeded!";
  }
}


//GET/POSTメソッドを実行し、JSONを返す関数

function ExecuteRequest(url, data){
  //リクエストを実行
  try{
    const response = UrlFetchApp.fetch(url, data).getContentText("utf-8");
  }catch(err){
    console.error(arguments.callee.name + "(): " + err);
    throw arguments.callee.name + "(): " + err;
  }
  
//  console.log(response);
  
  //受信データ(string)をパースしてJSON形式にする
  try{
    const returnee = JSON.parse(response);
  }catch(err){
    console.error(arguments.callee.name + "(): " + err);
    throw arguments.callee.name + "(): " + err;
  }
  
  return returnee;
}

//returns JSON object
function SesameGET(url){
  //スクリプトのプロパティを得る
  const APIkey = PropertiesService.getScriptProperties().getProperty("API_KEY");
  if(APIkey == null) throw "API_KEY not found";  
  
  //認証とリクエストのためのデータを整形
  var data = { 
    "method" : "get",
    "contentType" : "application/json; charset=utf-8",
    "headers" : {     
      "Authorization" : APIkey
    }
  };
  
  //リクエストを実行
  try{
    const returnee = ExecuteRequest(url, data);
  }catch(err){
    console.error(arguments.callee.name + "(): " + err);
    throw arguments.callee.name + "(): " + err;
  }
  
  return returnee;
}

//returns JSON object
function SesamePOST(url, payload){
  //スクリプトのプロパティを得る
  const APIkey = PropertiesService.getScriptProperties().getProperty("API_KEY");
  if(APIkey == null) throw "API_KEY not found";  
  
  //認証とリクエストのためのデータを整形
  var data = { 
    "method" : "post",
    "contentType" : "application/json; charset=utf-8",
    "headers" : {     
      "Authorization" : APIkey
    },
    "payload" : JSON.stringify(payload)
  };
  
  //リクエストを実行
  try{
    const returnee = ExecuteRequest(url, data);
  }catch(err){
    console.error(arguments.callee.name + "(): " + err);
    throw arguments.callee.name + "(): " + err;
  }
  
  return returnee;
}

//APIの実行関数

//return: セサミのデバイスID状態を返す
function getSesameDeviceID() {
  //APIのURL
  var url = "https://api.candyhouse.co/public/sesames";
  
  //GETリクエストを実行
  const sesamelist = SesameGET(url);
  
  //一番目のデバイスIDを返す
  try{
    const device_id = sesamelist[0].device_id;
  }catch(err){
    throw "Device ID not Found!";
  }
  
  return device_id;
}

//セサミのロック状態を文字列として返す
//return: "lock", "unlock"
function getSesameStat(device_id){
  var sesame_islocked = getSesameIsLocked(device_id);
  if(sesame_islocked){
    return "lock";
  }else{
    return "unlock";
  }
}

//return: セサミのロック状態を返す
function getSesameIsLocked(device_id) {
  //APIのURL
  const url = "https://api.candyhouse.co/public/sesame/" + device_id;
  
  //GETリクエストを実行
  const sesamestatus = SesameGET(url);
  
  return sesamestatus.locked;
}

//セサミを設定する
//command: "lock", "unlock" or "sync"
//return: task_id
function setSesame(device_id, command){
  //APIのURL
  const url = "https://api.candyhouse.co/public/sesame/" + device_id;
  
  //認証とリクエストのためのデータを整形
  var payload = {
    "command" : command
  };
  
  //POSTリクエストを実行
  const responseJSON = SesamePOST(url, payload);
  
  return responseJSON.task_id;
}

//return: セサミの実行結果を返す
function getExecutionResult(task_id) {
  //APIのURL
  const url = "https://api.candyhouse.co/public/action-result?task_id=" + task_id;
  
  //GETリクエストを実行
  const execution_result = SesameGET(url);
  
  return execution_result;
}
