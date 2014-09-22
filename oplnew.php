<?php
//
// Скрипт для проведения платежей из Frontol Торговля 4.9 в АСР Гидра через API HID
//

// Логирование переданного для дальнейших разборок по кассам
$f = fopen('/var/domains/kassa/opl.log',"a+");
$varp = print_r($_POST,true);
fwrite($f,date('d.m.Y H:i:s').'  '.$varp."\n");
fclose($f);

// Коннект к Oracle
$conn = oci_connect('USER', 'PASSWD', 'localhost/DB', 'UTF8');

if(!$conn){
    // 
    echo 'connection fail';
    echo json_encode(array('result' => 'ERROR'),JSON_UNESCAPED_UNICODE );
    die();
} else {
if ($_POST['a'] && $_POST['b'] && $_POST['c'] && $_POST['d']){
    
    // нормализация переданных значений
    $a = 1*floatval(str_replace(array(',','/','*','-','+'),'.',$_POST['a'])); // сумма
    $b = 1*$_POST['b'];                                                       // код лицевого счета
    $c = $_POST['c'];                                                         // касса
    $d = 1*floatval(str_replace(array(',','/','*','-','+'),'.',$_POST['d'])); // тип документа: 1 - платеж, 2 - сторно настраивается во Frontol

    // преобразование номера кассы в символьное значение для запроса
    $firms = array('k9110001' => 'KASSA_1', 'k9110002' => 'KASSA_2', 'k9110003' => 'KASSA_3', 
                   'k9110004' => 'KASSA_4', 'k9110005' => 'KASSA_5', 'k9110006' => 'KASSA_6', 
                   'k9110007' => 'KASSA_7');
    // Инициализация сессии в базе
    if(array_key_exists($c,$firms))
    {
        $q = "
        BEGIN
          MAIN.INIT(
            vch_VC_IP => '127.0.0.1',
            vch_VC_USER => 'net_interface',
            vch_VC_PASS => 'PASSWD',
            vch_VC_APP_CODE => 'NETSERV_HID',
            vch_VC_CLN_APPID => 'test');
        END;
        ";
        $stid = oci_parse($conn, $q);
        oci_execute($stid);
        if($e = oci_error($stid)){
            // ошибка при инициализации
        	echo json_encode(array('result' => 'ERROR'),JSON_UNESCAPED_UNICODE );
        }

	if($d == 1){
        // Если передан тип документа 1, то это документ оплаты. Выполняем оплату
	    $q = "
            DECLARE
             res1 NUMBER;
             res2 DATE;
            BEGIN
             EX_PAYMENTS_PKG.EX_PAYMENTS_CHARGE(
               vch_VC_TO_BANK          => 'KASSA',
               vch_VC_TO_ACCOUNT       => '".$firms[$c]."',
               num_N_SUM               => ".$a.",
               num_Fee                 => 0,
               vch_PayType             => 'RMM_KIND_Kassa',
               vch_Currency            => 'RUB',
               vch_VC_TRANSACTION_ID   => '11112222',
               num_N_FORWHO_ACCOUNT_ID => ".$b.",
               dt_D_TAKING             => SYSDATE,
               num_N_DOC_ID            => res1,
               dt_D_LOAD               => res2
               );
            END;";
	}
	else {
        // в противоположном случае считаем, что передан документ возврата, так как иное в кассовой программе не обрабатывается
        // сначала выдергиваем номер последнего документа оплаты по лицевому счету
	    $q = "
		select N_DOC_ID from
		    SD_V_PAYMENTS_T
		where
		    n_forwho_account_id = ".$b."
		    and d_time in (
		        SELECT max(PT.D_TIME) DT
		        FROM SD_V_PAYMENTS_T PT
		        WHERE
		        PT.N_DOC_STATE_ID       = SYS_CONTEXT('CONST', 'DOC_STATE_Actual')
		        AND pt.n_forwho_account_id = ".$b."
		        )
	        ";
    	    $stid = oci_parse($conn, $q);
	    oci_execute($stid);
            if($e = oci_error($stid)){
                    echo json_encode(array('result' => 'ERROR'),JSON_UNESCAPED_UNICODE );
                    die();
            }
            else {
                $row = oci_fetch_array($stid, OCI_ASSOC+OCI_RETURN_NULLS);
            }
            // проводим сторнирование полученного документа
            $q = "
                DECLARE
                  num_N_DOC_ID_NEW NUMBER := NULL;
                  num_N_DOC_ID NUMBER := ".$row['N_DOC_ID'].";
                BEGIN
                SD_DOCUMENTS_PKG.SD_DOCUMENTS_COPY(
                  num_N_DOC_ID_OLD => num_N_DOC_ID,
                  num_N_DOC_ID_NEW => num_N_DOC_ID_NEW,
                  num_N_STORNO_DOC_ID => num_N_DOC_ID);
                SD_DOCUMENTS_PKG.SD_DOCUMENTS_CHANGE_STATE(
                  num_N_DOC_ID => num_N_DOC_ID_NEW,
                  num_N_NEW_DOC_STATE_ID => 4003);
                END;
            ";

	}

        $stid = oci_parse($conn, $q);
        oci_execute($stid);

	if($e = oci_error($stid)){
        // любая ошибка - сигнал в кассовую программу о немедленном прекращении оплаты
	    echo json_encode(array('result' => 'ERROR'),JSON_UNESCAPED_UNICODE );
        } else {
        // все нормально проводим в кассовом аппарате
	    echo json_encode(array('result' => 'OK'),JSON_UNESCAPED_UNICODE );
        }
        oci_close($conn);
    }
    else
    {
	echo json_encode(array('result' => 'ERROR'),JSON_UNESCAPED_UNICODE );

    }
} else {
    echo json_encode(array('result' => 'ERROR'),JSON_UNESCAPED_UNICODE );
}
}

?>