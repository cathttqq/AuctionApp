#!/bin/sh
BUCKET=cawa-appbucket

aws s3 sync . s3://$BUCKET \
  --exclude '*' --include '*.js' --include '*.html' --include '*.css' --include '*.png' \
  --region us-west-2 --acl public-read