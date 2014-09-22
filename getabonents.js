// Модуль Frontol 4.9 для запроса данных о пользователе для проведения платежа из АСР ГИДРА

function BeforeAct(AO, RO, E, O, CO)
{
 // сервисая функция поиска по массиву
 function find(array,value) {
          for(var i=0; i<array.length; i++) {
                  if (array[i] == value) return i;
          }
          return -1;
 }

// Глобальные переменные
 var pr = ""; // Строки для показа данных абонента
 var spr = ""; // Коды абонентов
 var obj = {};

  // Запрос данных пользователя (адрес, либо код) и обработк-а полученных результатов
  do {
     inputError = false;
     input = AO.InputString("Введите адрес, либо часть адреса. Примеры: ysk-neve4a-116, neve4a","",40);
     //Если введено пустое значение или отмена
     if(input == "" || input == null){
               input = AO.InputString("Введите лицевой счет. Примеры: 3742, 1003742","",40);
               if(input == "" || input == null){
                         AO.ShowMessage("Необходимо ОБЯЗАТЕЛЬНО ввести адрес или лицевой счет!", Icon.Error);
                         inputError = true;
               }
               else {
                    if(isNaN(input)){
                         AO.ShowMessage("Лицевой счет должен быть введен цифрами!", Icon.Error);
                         inputError = true;
                    }
                    else {
                         input = "l_" + input;  // префикс+лицевой счет
                    }
               }
     }
     else {
          input = "a_" + input; // префикс+адрес
     }
  }
  while(inputError);


  var req = new ActiveXObject("Microsoft.XMLHTTP");
  var grabon = "";
  req.onreadystatechange = function()
  {
  //Обрабатываем ответ сервера
                 if(req.readyState==4 && req.status==200) {
                                      var tobj = eval("("+req.responseText+")");
                                      for(i=0;i<tobj.length;i++) {
                                        // Выделение группы абонента (фирмы где зарегистрирован)
                                        switch (tobj[i].N_SUBJ_GROUP_ID) {
                                               case "50638901":
                                                    grabon = "";
                                                    break;
                                               case "50639001":
                                                    grabon = "";
                                                    break;
                                               case "50654901":
                                                    grabon = "!!! Групп";
                                                    break;
                                               case "2235433401":
                                                    grabon = "";
                                                    break;
                                               case "2844439801":
                                                    grabon = "";
                                                    break;
                                               case "930048701":
                                                    grabon = "!!! ИП 11111";
                                                    break;
                                        }
                                        pr += tobj[i].VC_SUBJ_CODE+"   "+tobj[i].VC_SUBJ_NAME+"   ("+tobj[i].N_PARENT_DOC+") "+tobj[i].N_SUBJ_STATE_ID+"  "+grabon+"\n";
                                        grabon = "";
                                        spr += i+"\n";
                                        obj[i] = tobj[i];
                                      }
                 }
  }
// Посылаем запрос о пользователях, попадающих в выборку
  req.open("POST", "http://server:8383/getusers.php", false);
  var parm = "address="+input.slice(2)+"&tp="+input.slice(0,1);
  req.setRequestHeader("Content-type","application/x-www-form-urlencoded");
  req.setRequestHeader("Content-length",parm.length);
  req.send(parm);


// Выдаем запрос на выбор пользователя из списка
 input = AO.SelectString("Выберите адрес абонента",pr,spr);
 if (input != null){
    // Если выбран пользователь
    // Сохраняем данные пользователя во временные переменные
    RO.UserValues.Set("tmpUName",obj[input]['VC_SUBJ_NAME']);
    RO.UserValues.Set("tmpUCode",obj[input]['VC_SUBJ_CODE']);
    RO.UserValues.Set("tmpUAccount",obj[input]['VC_CODE']);
    RO.UserValues.Set("tmpUSID",obj[input]['N_SUBJECT_ID']);
    RO.UserValues.Set("tmpUAID",obj[input].N_ACCOUNT_ID);
    RO.UserValues.Set("tmpUGID",obj[input].N_SUBJ_GROUP_ID);

    arr = ["50638901","50639001","50654901","2235433401","2844439801","930048701"]
    if (find(arr,obj[input].N_SUBJ_GROUP_ID)<0) AO.ShowMessage("Неверная группа у абонента! Рекомендуется отменить платеж до исправления!", Icon.Error);
 }
 else {
      AO.ShowMessage("Платеж отменен, так как не был выбран клиент!",Icon.Exclamation);
      AO.Cancel();
 }

}

function AfterAct(AO, RO, E, O, CO)
{
 // Переименовываем временные переменные в соответствии с номером позиции
 RO.UserValues.Set("UName_"+O.PosID,RO.UserValues.Get("tmpUName"));
 RO.UserValues.Delete("tmpUName");
 RO.UserValues.Set("UCode_"+O.PosID,RO.UserValues.Get("tmpUCode"));
 RO.UserValues.Delete("tmpUCode");
 RO.UserValues.Set("UAccount_"+O.PosID,RO.UserValues.Get("tmpUAccount"));
 RO.UserValues.Delete("tmpUAccount");
 RO.UserValues.Set("USID_"+O.PosID,RO.UserValues.Get("tmpUSID"));
 RO.UserValues.Delete("tmpUSID");
 RO.UserValues.Set("UAID_"+O.PosID,RO.UserValues.Get("tmpUAID"));
 RO.UserValues.Delete("tmpUAID");
 RO.UserValues.Set("UGID_"+O.PosID,RO.UserValues.Get("tmpUGID"));
 RO.UserValues.Delete("tmpUGID");

}

function FuncAct(AO, RO, CO)
{

}

function NoAction(AO, RO, POS, CO, UserParam)
{

}
