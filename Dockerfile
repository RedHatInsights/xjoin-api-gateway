FROM registry.access.redhat.com/ubi8/ubi-minimal:latest

USER root

# install packages from centos if not building on RHSM system
RUN FULL_RHEL=$(microdnf repolist --enabled | grep rhel-8) ; \
    if [ -z "$FULL_RHEL" ] ; then \
        rpm -Uvh http://mirror.centos.org/centos/8-stream/BaseOS/x86_64/os/Packages/centos-stream-repos-8-4.el8.noarch.rpm \
                 http://mirror.centos.org/centos/8-stream/BaseOS/x86_64/os/Packages/centos-gpg-keys-8-4.el8.noarch.rpm && \
        sed -i 's/^\(enabled.*\)/\1\npriority=200/;' /etc/yum.repos.d/CentOS*.repo ; \
    fi

RUN microdnf module enable nodejs:18 && \
    microdnf install --setopt=tsflags=nodocs -y nodejs && \
    microdnf install -y rsync tar procps-ng && \
    microdnf upgrade -y && \
    microdnf clean all

ADD src/ $HOME/src/
ADD package.json $HOME/package.json
ADD package-lock.json $HOME/package-lock.json

RUN npm i -g typescript@5.1.6
RUN npm i -g
RUN npm ci && tsc

USER 1001

EXPOSE 4000

ENV NODE_CONFIG_DIR=dist/config

CMD [ "node", "dist/index.js" ]
