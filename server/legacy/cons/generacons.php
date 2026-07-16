<?php
			require("headers.php");
			require('fpdf/force_justify.php');
			require("json_encode.php");
			require("json_decode.php");

            $datos=json_decode(file_get_contents("php://input"));
            
            // Safely access properties using the null coalescing operator
            $fecha = $datos->fecha ?? '';
            $identificacionPaciente = $datos->identificacionPaciente ?? ''; 
            $nombresPaciente = $datos->nombresPaciente ?? ''; 
            $idRepresentante = $datos->idRepresentante ?? ''; 
            $nombresRepresentante = $datos->nombresRepresentante ?? '';
            $direccionRepresentante = $datos->direccionRepresentante ?? '';
            $telefonoRepresentante = $datos->telefonoRepersentante ?? ''; 
            $eps = $datos->eps ?? ''; 
            $prepagada = $datos->prepagada ?? ''; 
            $tratamiento = $datos->tratamiento ?? ''; 
            $lesiones = $datos->lesiones ?? ''; 
            $medicamentos = $datos->medicamentos ?? ''; 
            $consecuencias = $datos->consecuencias ?? ''; 
            $alternativas = $datos->alternativas ?? ''; 
            $testigo = $datos->testigo ?? ''; 
            $direccionTestigo = $datos->direccionTestigo ?? ''; 
            $telefonoTestigo = $datos->telefonoTestigo ?? ''; 
            $personaAcontactar = $datos->personaAcontactar ?? ''; 
            $telefonoContacto = $datos->telefonoContacto ?? ''; 
            $profesional = $datos->profesional ?? '';
            $direccionProfesional = $datos->direccionProfesional ?? '';
            $telefonoprofesional = $datos->telefonoProfesional ?? '';
            $firma = $datos->firma ?? ''; 
            $firmaProfesional = $datos->firmaProfesional ?? ''; 

            
            $imageData = base64_decode($firma);
            $filename = "./firmas/".$identificacionPaciente . '.png' ;
            file_put_contents($filename, $imageData);
            $imageDataP = base64_decode($firmaProfesional);
            $filename = "./firmas/profesional.png" ;
            file_put_contents($filename, $imageDataP);
         //   echo json_encode(array("todo"=>"bien","firma"=>$firma));exit(0);
			 $pdf_archivo="consentimientos/consentimiento_".$identificacionPaciente.".pdf";
			if (file_exists($pdf_archivo))
			unlink($pdf_archivo);
			$pdf=new PDF();
			$pdf->AddPage();
			$pdf->SetFont('Arial');
			
			$pdf->SetFont('Arial','B',9);
            $pdf->Image('./logo.png',175,3,25);
			$pdf->setY(10);
			$pdf->Cell(190,10,utf8_decode('AUTORIZACION Y CONSENTIMIENTO '),0,1,"C");
            $pdf->Cell(190,10,utf8_decode('PARA LA EJECUCIÓN DE UN PROCEDIMIENTO ODONTOLOGICO'),0,1,"C");
			$pdf->Cell(190,10,utf8_decode("Fecha: $fecha"),0,1,"C");
			$pdf->SetFont('Arial');
			$pdf->Cell(190,8,utf8_decode("Yo, $nombresRepresentante identificado con la CC No. $idRepresentante o en nombre y representación de"),0,1,"FJ",0); 
			$pdf->Cell(190,8,utf8_decode("$nombresPaciente con documento de identidad N° $identificacionPaciente quien no cuenta capacidad decisoria, expresamente manifiesto:"),0,1,"FJ",0);
			$pdf->Cell(190,8,utf8_decode("[1]. Que he recibido por parte el profesional especialista $profesional explicación clara, completa, precisa y comprensible"),0,1,"FJ",0);
            $pdf->Cell(190,8,utf8_decode(" de los procedimientos a los que seré sometido, los resultados esperados y los beneficios de distinto orden por razón del siguiente"),0,1,"FJ",0);  
            $pdf->Cell(190,8,utf8_decode("tratamiento: $tratamiento"),0,1,"J",0); 
           
            $pdf->Cell(190,8,utf8_decode("[2]. Que igualmente he recibido Información y acepto los riesgos inherentes a dicho tratamiento: asi como las posibles"),0,1,"FJ",0); 
            $pdf->Cell(190,8,utf8_decode("lesiones o daños colaterales o secuelas que este puede ocasionar, que en general consisten en:"),0,1,"FJ",0); 
            $pdf->Cell(190,8,utf8_decode("$lesiones"),0,1,"J",0); 

            $pdf->Cell(190,8,utf8_decode("[3]. Que se me ha suministrado información detallada sobre los cuidados que debo tener dentro de la fase de ejecución"),0,1,"FJ",0); 
            $pdf->Cell(190,8,utf8_decode("del procedimiento, el pos tratamiento y los fármacos o medicinas que debo ingerir, los cuales se resumen en los siguientes:"),0,1,"FJ",0); 
            $pdf->Cell(190,8,utf8_decode("$medicamentos"),0,1,"J",0); 

            $pdf->Cell(190,8,utf8_decode("[4]. Se me enteró de las consecuencias posibles en caso de desatender las recomendaciones anteriores que sucintamente"),0,1,"FJ",0); 
            $pdf->Cell(190,8,utf8_decode("pueden describirse asi: $consecuencias"),0,1,"J",0); 

            $pdf->Cell(190,8,utf8_decode("[5]. Que he sido debidamente notificado sobre las opciones y alternativas de otros procedimientos, sus costos y resultados,"),0,1,"FJ",0); 
            $pdf->Cell(190,8,utf8_decode("de forma tal que expreso contar con toda la información requerida para tomar una decisión consciente y deliberada."),0,1,"FJ",0); 
            $pdf->Cell(190,8,utf8_decode("Dichas alternativas en resumen son: $alternativas"),0,1,"J",0); 


            $pdf->Cell(190,8,utf8_decode("[6]. He contado con el tiempo necesario para madurar las decisiones contenidas en el presente documento: haciendo constar"),0,1,"FJ",0); 
            $pdf->Cell(190,8,utf8_decode("que me fue explicado el derecho que me asiste a arrepentirme o cambiar de opinión por cualquier razón y consecuentemente"),0,1,"FJ",0); 
            $pdf->Cell(190,8,utf8_decode("desistir del procedimiento o tratamiento previamente autorizado."),0,1,"J",0);
            
            $pdf->ln();
            $pdf->Cell(190,8,utf8_decode("Se deja expresa constancia de la confidencialidad que tendrán los datos suministrados y consignados dentro del presente"),0,1,"FJ",0); 
            $pdf->Cell(190,8,utf8_decode("el cual se incorporará a la historia clínica y formará parte integrante de esta para todos los efectos legales.      "),0,1,"FJ",0); 
            
            $pdf->SetXY(10,220);
			$pdf->SetFont('Arial','B',8);
            $pdf->Write(5,"PACIENTE O REPRESENTANTE LEGAL");
			$pdf->SetXY(10,226);
			$pdf->Write(5,utf8_decode($nombresRepresentante));
			$pdf->SetXY(10,230);
			$pdf->Write(5,utf8_decode('Dirección:'.$direccionRepresentante));
            $pdf->SetXY(10,234);
			$pdf->Write(5,utf8_decode('Telefono:'.$telefonoRepresentante));
            $pdf->SetXY(10,238);
			$pdf->Write(5,utf8_decode('Eps:'.$eps));
            $pdf->SetXY(10,242);
			$pdf->Write(5,utf8_decode('Salud Prepagada:'.$prepagada));

            $pdf->SetXY(120,220);
            $pdf->Write(5,"PROFESIONAL TRATANTE");
			$pdf->SetXY(120,226);
			$pdf->Write(5,utf8_decode($profesional));
			$pdf->SetXY(120,230);
			$pdf->Write(5,utf8_decode('Dirección:'.$direccionProfesional));
            $pdf->SetXY(120,234);
			$pdf->Write(5,utf8_decode('Telefono:'.$telefonoprofesional));


            $pdf->SetXY(80,244);
            $pdf->Write(5,"TESTIGO");
			$pdf->SetXY(80,248);
			$pdf->Write(5,utf8_decode($testigo));
			$pdf->SetXY(80,252);
			$pdf->Write(5,utf8_decode('Dirección:'.$direccionTestigo));
            $pdf->SetXY(80,256);
			$pdf->Write(5,utf8_decode('Telefono:'.$telefonoTestigo));

            $pdf->SetXY(150,244);
            $pdf->Write(5,"PERSONA A CONTACTAR");
			$pdf->SetXY(150,248);
			$pdf->Write(5,utf8_decode($personaAcontactar));
			$pdf->SetXY(150,252);
			$pdf->Write(5,utf8_decode('Teléfono:'.$telefonoContacto));
            


            $pdf->SetXY(10,270);
			$pdf->Write(5,utf8_decode('Firma:'));
           
			$firma_archivo="firmas/".$identificacionPaciente.".png";
			$pdf->Image($firma_archivo,20,255,50);

            $firma_aprofesional="firmas/profesional.png";
			$pdf->Image($firma_aprofesional,120,210,50);

		//	$pdf->output();
			 $pdf->output($pdf_archivo,"F");
			 sleep(2);
			 echo json_encode(array("Mensaje"=>"Correcto","filename"=>$pdf_archivo));

?>