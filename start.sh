#!/bin/bash
microk8s.start
echo 'Waiting for microk8s to start...'
sleep 30
sudo iptables -P FORWARD ACCEPT
