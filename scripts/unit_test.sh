#!/bin/bash

cd "$APP_ROOT"
export IMAGE="quay.io/cloudservices/xjoin-api-gateway"
IMAGE_TAG=$(git rev-parse --short=7 HEAD)
export IMAGE_TAG

TEST_CONTAINER_NAME="xjoin-api-gateway-test-${IMAGE_TAG}"
POD_NAME="xjoin-api-gateway-pod-${IMAGE_TAG}"

function teardown_podman {
  podman pod rm "$POD_NAME" || true
}

trap "teardown_podman" EXIT SIGINT SIGTERM

podman pod create --name "$POD_NAME" || exit 1

# Do tests
TEST_CONTAINER_ID=$(podman run -d \
  --name "${TEST_CONTAINER_NAME}" \
  --pod "${POD_NAME}" \
  --rm \
  -e HOSTNAME="$TEST_CONTAINER_NAME" \
  -e CI=true \
  -e JENKINS_URL="$JENKINS_URL" \
  -e ghprbSourceBranch="${ghprbSourceBranch:?}" \
  -e GIT_BRANCH="$GIT_BRANCH" \
  -e ghprbActualCommit="${ghprbActualCommit:?}" \
  -e GIT_COMMIT="$GIT_COMMIT" \
  -e BUILD_NUMBER="$BUILD_NUMBER" \
  -e ghprbPullId="$ghprbPullId" \
  -e BUILD_URL="$BUILD_URL" \
  "$IMAGE:$IMAGE_TAG" \
  /bin/bash -c 'sleep infinity' || echo "0")

if [[ "$TEST_CONTAINER_ID" == "0" ]]; then
  echo "Failed to start test container"
  exit 1
fi

WORKSPACE=${WORKSPACE:-./}

# npm run compile
echo '===================================='
echo '===     Running Compilation     ===='
echo '===================================='
set +e
podman exec -u 0 "$TEST_CONTAINER_ID" /bin/bash -c 'npm test'
TEST_RESULT=$?
set -e

if [[ $TEST_RESULT -ne 0 ]]; then
  echo '====================================='
  echo '====  ✖ ERROR: UNIT TEST FAILED  ===='
  echo '====================================='
  exit 1
fi

echo '====================================='
echo '====   ✔ SUCCESS: PASSED TESTS   ===='
echo '====================================='
