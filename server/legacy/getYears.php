<?php
   

   
    $years = array();
    //actual year
    $year = date('Y');

    for ($i = 2021; $i <= 2040; $i++) {
        if ($i == $year) {
            array_push($years, array("year" => $i, "selected" => true));
        } else {
            array_push($years, array("year" => $i, "selected" => false));
        }
    }
    echo json_encode($years);


    
?>


    

