<?php
$opciones = [
    "Magistral, participación alta, motivación alta, actitud alta, actividad alta, clima positivo, evaluación excelente, sin dificultades",
    "Magistral, participación media, motivación media, actitud mediana, actividad mediana, clima neutro, evaluación aceptable, falta de tiempo",
    "Magistral, participación baja, motivación baja, actitud básica, actividad básica, clima tenso, evaluación deficiente, indisciplina",
    "Taller práctico, participación alta, motivación alta, actitud alta, actividad alta, clima muy positivo, evaluación excelente, sin dificultades",
    "Taller práctico, participación media, motivación alta, actitud alta, actividad mediana, clima positivo, evaluación buena, problemas técnicos",
    "Taller práctico, participación baja, motivación baja, actitud básica, actividad básica, clima conflictivo, evaluación deficiente, falta de recursos",
    "Trabajo en grupo, participación alta, motivación alta, actitud alta, actividad alta, clima positivo, evaluación buena, sin dificultades",
    "Trabajo en grupo, participación media, motivación media, actitud mediana, actividad mediana, clima neutro, evaluación aceptable, dificultades de comprensión",
    "Trabajo en grupo, participación baja, motivación baja, actitud básica, actividad básica, clima tenso, evaluación deficiente, indisciplina",
    "Clase invertida, participación alta, motivación alta, actitud alta, actividad alta, clima positivo, evaluación excelente, sin dificultades",
    "Clase invertida, participación media, motivación media, actitud mediana, actividad mediana, clima positivo, evaluación buena, falta de tiempo",
    "Clase invertida, participación baja, motivación baja, actitud básica, actividad básica, clima tenso, evaluación deficiente, indisciplina",
    "Proyecto interdisciplinar, participación muy alta, motivación muy alta, actitud alta, actividad alta, clima muy positivo, evaluación excelente, sin dificultades",
    "Proyecto interdisciplinar, participación media, motivación media, actitud mediana, actividad mediana, clima neutro, evaluación buena, problemas técnicos",
    "Proyecto interdisciplinar, participación baja, motivación baja, actitud básica, actividad básica, clima conflictivo, evaluación aceptable, falta de recursos",
    "Evaluación, participación alta, motivación alta, actitud alta, actividad alta, clima neutro, evaluación buena, sin dificultades",
    "Evaluación, participación media, motivación media, actitud mediana, actividad mediana, clima neutro, evaluación aceptable, falta de tiempo",
    "Evaluación, participación baja, motivación baja, actitud básica, actividad básica, clima tenso, evaluación deficiente, dificultades de comprensión",
    "Magistral, participación alta, motivación media, actitud alta, actividad mediana, clima positivo, evaluación buena, problemas técnicos",
    "Taller práctico, participación media, motivación baja, actitud mediana, actividad básica, clima neutro, evaluación aceptable, falta de recursos",
    "Trabajo en grupo, participación alta, motivación media, actitud alta, actividad alta, clima positivo, evaluación buena, sin dificultades",
    "Clase invertida, participación media, motivación alta, actitud alta, actividad alta, clima muy positivo, evaluación excelente, sin dificultades",
    "Proyecto interdisciplinar, participación alta, motivación media, actitud alta, actividad mediana, clima positivo, evaluación buena, falta de tiempo",
    "Evaluación, participación media, motivación baja, actitud básica, actividad básica, clima neutro, evaluación aceptable, problemas técnicos",
    "Magistral, participación baja, motivación media, actitud básica, actividad mediana, clima tenso, evaluación deficiente, indisciplina",
    "Taller práctico, participación alta, motivación baja, actitud alta, actividad alta, clima positivo, evaluación buena, sin dificultades",
    "Trabajo en grupo, participación media, motivación alta, actitud alta, actividad alta, clima positivo, evaluación excelente, sin dificultades",
    "Clase invertida, participación alta, motivación baja, actitud mediana, actividad básica, clima neutro, evaluación aceptable, dificultades de comprensión",
    "Proyecto interdisciplinar, participación media, motivación alta, actitud alta, actividad alta, clima muy positivo, evaluación excelente, sin dificultades",
    "Evaluación, participación alta, motivación media, actitud alta, actividad mediana, clima positivo, evaluación buena, sin dificultades"
];

// Si quieres servirlo como JSON
header('Content-Type: application/json; charset=utf-8');
echo json_encode($opciones, JSON_UNESCAPED_UNICODE);
