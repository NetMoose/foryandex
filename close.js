// Модуль Frontol 4.9 для проведения платежей в АСР Гидра

function BeforeAct(AO, RO, E, O, CO)
{
 // Функция выполняется перед проведением платежа по кассовому аппарату
 // AO - объект приложения, RO - объект платежа
 var req = new ActiveXObject("Microsoft.XMLHTTP");
 // цикл по позициям чека
 for(RO.Pos.Index=1;RO.Pos.Index<=RO.Pos.Count;RO.Pos.Index++)
 {

   req.onreadystatechange = function()
   {
   //Обрабатываем ответ сервера
                 if(req.readyState==4 && req.status==200) {
                                      var obj = eval("("+req.responseText+")");
                                      if(obj.result == "ERROR") {
                                        AO.ShowMessage("Невозможно оплатить абоненту "+RO.UserValues.Get("UName_"+RO.Pos.Index));
                                        AO.Cancel();
                                      }
                 }
   }
  // Посылаем запрос об оплате позиции в чеке a - сумма, b - идентификатор абонента N_ACCOUNT_ID, с - код кассы, d - тип документа
  req.open("POST", "http://server:8383/oplnew.php", false);
  var parm = "a="+RO.Pos.SummWD+"&b="+RO.UserValues.Get("UAID_"+RO.Pos.Index)+"&c=k9110001&d="+RO.ReceiptTypeCode;
  req.setRequestHeader("Content-type","application/x-www-form-urlencoded");
  req.setRequestHeader("Content-length",parm.length);
  req.send(parm);

   var req1 = new ActiveXObject("Microsoft.XMLHTTP");
   req1.onreadystatechange = function()
   {
   //Обрабатываем ответ сервера
                 if(req1.readyState==4 && req1.status==200) {
                                      var obj = eval("("+req1.responseText+")");
                                      RO.UserValues.Set("UBal_"+RO.Pos.Index,obj[0].N_SUM_BAL);
                                      switch (RO.UserValues.Get("UGID_" + RO.Pos.Index)) {
                                             case "50638901":
                                                  // ИП 1 по секции 1
                                                  RO.Pos.SetECRDepartment(1);
                                                  break;
                                             case "50639001":
                                                  // ООО 1111 по секции 2
                                                  RO.Pos.SetECRDepartment(2);
                                                  break;
                                             case "50654901":
                                                  // ООО 2222 по секции 3
                                                  RO.Pos.SetECRDepartment(3);
                                                  break;
                                             case "2235433401":
                                                  // ООО 3333 по секции 4
                                                  RO.Pos.SetECRDepartment(4);
                                                  break;
                                             case "2844439801":
                                                  // ООО 4444 по секции 5
                                                  RO.Pos.SetECRDepartment(5);
                                                  break;
                                             case "930048701":
                                                  // ООО 5555 по секции 6
                                                  RO.Pos.SetECRDepartment(6);
                                                  break;

                                      }
                 }
   }
  // Посылаем запрос о данных абонента после оплаты (текущий баланс на чек)
  req1.open("POST", "http://server:8383/getusers.php", false);
  var parm = "address="+RO.UserValues.Get("UAccount_"+RO.Pos.Index)+"&tp=l";
  req1.setRequestHeader("Content-type","application/x-www-form-urlencoded");
  req1.setRequestHeader("Content-length",parm.length);
  req1.send(parm);
 }
}

function AfterAct(AO, RO, E, O, CO)
{

}

function FuncAct(AO, RO, CO)
{

}

function NoAction(AO, RO, POS, CO, UserParam)
{
}
