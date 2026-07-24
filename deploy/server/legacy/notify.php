<?php

$beamsClient = new \Pusher\PushNotifications\PushNotifications(array(
    "instanceId" => "f304323e-dac1-4983-9579-550a085cea22",
    "secretKey" => "EBC86DA8A79F32C99B2FD3A4EF5A952990DB477A157410027BB2EA244B855EA9",
  ));
  
  $publishResponse = $beamsClient->publishToInterests(
    array("hello"),
    array("web" => array("notification" => array(
      "title" => "Hello",
      "body" => "Hello, World!",
      "deep_link" => "https://www.pusher.com",
    )),
  ));
?>