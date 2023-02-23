APP=$1

if [ -z "$APP" ]; then
  echo "usage ./local_build.sh <app>\n"
  echo "It looks like you may be missing the app arg.\n"
  exit 1
fi

git commit --amend
#TAG=`cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 7 | head -n 1`
TAG=$(git rev-parse --short=7 HEAD)
#TAG="latest"
IMAGE="127.0.0.1:5000/$APP"

podman build -t $IMAGE:$TAG -f Dockerfile

podman push $IMAGE:$TAG `minikube ip`:5000/$APP:$TAG --tls-verify=false
echo $TAG

source ~/bonfire_venv/bin/activate

bonfire deploy xjoin-api-gateway -n test
