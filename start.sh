#!/bin/bash
microk8s.start
echo 'Waiting for microk8s to start...'
sleep 5
kubectl cluster-info
echo 'Setting iptables...'
sudo iptables -P FORWARD ACCEPT
echo 'Ready for action!'
