#!/usr/bin/env bash
set -e
source ./bin/_variables.sh

# This script is typically run by `./bin/dev.sh`, not manually
mkdir -p ${SECRETSDIR}

if [[ ! -f "${SECRETSDIR}/tls.crt" ]]; then
  if [[ ! -x "$(command -v mkcert)" ]]; then
    openssl genrsa \
      -des3 -passout pass:xxxx -out ${SECRETSDIR}/tls.pass.key 2048

    openssl rsa \
      -passin pass:xxxx -in ${SECRETSDIR}/tls.pass.key -out ${SECRETSDIR}/tls.key

    subjectAltName="DNS:api,DNS:registry"
    dn="C=US \n ST=California \n L=SanFrancisco \n O=${PROJECT} \n OU=foobar \n CN=${PROJECT_DOMAIN}"
    reqConfig="[req] \n prompt=no \n utf8=yes \n distinguished_name=dn_details \n req_extensions=san_details \n [dn_details] \n ${dn} \n [san_details] \n subjectAltName=${subjectAltName}"
    mkdir -p tmp
    echo -e ${reqConfig} > tmp/tls.csr
    openssl req \
      -new -key ${SECRETSDIR}/tls.key -out ${SECRETSDIR}/tls.csr \
      -config tmp/tls.csr

    openssl x509 \
      -req -sha256 -days 365 -in ${SECRETSDIR}/tls.csr -signkey ${SECRETSDIR}/tls.key -out ${SECRETSDIR}/tls.crt

    rm ${SECRETSDIR}/tls.pass.key
  else
    mkcert -install
    mkcert -cert-file ${SECRETSDIR}/tls.crt -key-file ${SECRETSDIR}/tls.key localhost api registry
  fi
fi

cp -v ${SECRETSDIR}/tls.* inf/secrets/

mkdir -p modules/kubesail-agent/k8s/overlays/dev/agent/secrets
cp -v ${SECRETSDIR}/tls.* modules/kubesail-agent/k8s/overlays/dev/agent/secrets

mkdir -p modules/kubesail-agent/k8s/overlays/dev/gateway/secrets
cp -v ${SECRETSDIR}/tls.* modules/kubesail-agent/k8s/overlays/dev/gateway/secrets

mkdir -p inf/kube/overlays/prod-eks/internal/secrets/
cp -v ${SECRETSDIR}/tls.* inf/kube/overlays/prod-eks/internal/secrets/
