# newrelic-k8s-guestbook
## Kubernetes Guestbook application
*New Relic Employees* can find a complete workshop here (https://docs.google.com/document/d/1aXeWcQVcn-YvJK-MCCLnBNWA8ptzf2ZLVXVFDg2imn0/edit) 

This repository contains all information to build a Kubernetes sample application. This work is based on previous work of Drew Decker (https://github.com/wreckedred/) and Clay Smith (https://github.com/smithclay/).

This is still a simple application, but it has some more services:
* **Frontend service**: Node.js app serving the UI
* **Parser service**: Node.js app responsible for parsing a message and sending it to RabbitMQ
* **Worker service**: Node.js app listening to RabbitMQ and pushing the message to Redis
* **Redis service**: For storing the message in Redis
* **Queue service**: RabbitMQ as message bus

![architecture](https://user-images.githubusercontent.com/45029322/55336903-fb0c5980-549d-11e9-9a1c-1767119fce56.png)

## Pre-requisites
You need a Kubernetes cluster to deploy this applicaton.

For Minikube: start minikube and make sure we can connect to Minikube's Docker daemon
```
minikube start
eval $(minikube docker-env) # Do this in every terminal window you are using
```
## Create a Kubernetes secret with your New Relic license key
`kubectl create secret generic guestbook-secret --from-literal=new_relic_license_key='<YOUR KEY HERE>'`

## Install the APM metadata injection
* Navigate to the k8s/metadata folder: `kubectl apply -f .`
* Wait until the metadata-setup job is completed: `kubectl get pods`
```
newrelic-metadata-injection-deployment-56dbf48c6-wkbnc   1/1     Running     0          17s
newrelic-metadata-setup-zw8sl                            0/1     Completed   0          18s
```
## Install kube-state-metrics
`curl -o kube-state-metrics-1.4.zip https://codeload.github.com/kubernetes/kube-state-metrics/zip/release-1.4 && unzip kube-state-metrics-1.4.zip && kubectl apply -f kube-state-metrics-release-1.4/kubernetes`

## Install the New Relic Kubernetes integration
* Navigate to the k8s/newrelic/ folder: `kubectl apply -f .`

## Deploy RabbitMQ and Redis
* Navigate to the k8s/app/ folder: 
```
kubectl apply -f rabbitmq.yaml
kubectl apply -f redis.yaml
```
* Check with `kubectl get pods` and wait until these services are running

## Deploy the Node.js microservices (frontend, parser, worker)
* Navigate to the k8s/app/ folder:
```
kubectl apply -f frontend.yaml
kubectl apply -f parser.yaml
kubectl apply -f worker.yaml
```

* Check where frontend is running: `kubectl describe service frontend`

**-> Look for 'NodePort 31811', we need this PORT**

* `kubectl cluster-info`

**-> Look for 'master IP: 192.168.64.3', we need this IP**

**Open IP:PORT in your browser**

## Debugging
```
watch kubectl logs -l tier=frontend --tail=20
watch kubectl logs -l tier=parser --tail=20
watch kubectl logs -l tier=worker --tail=20
watch kubectl logs -l tier=queue --tail=20
```
## Build the Docker images
* If you want to make changes to any of the Docker images, navigate to the relevant folder under app/ and build the image:
`docker build -t nrlabs/newrelic-k8s-guestbook-frontend .`

## Clean-up
`kubectl delete -f . # ATTENTION, this will delete everything from the yaml files in the current folder`

## Scale a deployment
`kubectl scale --replicas=2 deployment/parser`
