#!/bin/bash
HOST="192.168.64.3"
PORT=$1
  
for i in {1..1000}
do
        curl -d "message=automated_message_$i" -X POST http://$HOST:$PORT/message 
        sleep 1
done
