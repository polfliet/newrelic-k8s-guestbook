#!/bin/bash
if [ "$#" -ne 1 ]; then
    echo "Specify a port, for example: ./loadgen.sh 1234"
    exit
fi

HOST="localhost"
PORT=$1
  
for i in {1..1000}
do
        curl -d "message=automated_message_$i" -X POST http://$HOST:$PORT/message 
        sleep 1
done
