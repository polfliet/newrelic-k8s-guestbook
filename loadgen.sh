#!/bin/bash
if [ "$#" -ne 1 ]; then
    echo "Specify a port, for example: ./loadgen.sh 1234"
    exit
fi

HOST="192.168.64.3"
PORT=$1
  
for i in {1..1000}
do
        curl -d "message=automated_message_$i" -X POST http://$HOST:$PORT/message 
        sleep 0.5
done
