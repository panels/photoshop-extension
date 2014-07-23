#!/bin/sh
PWD=$(pwd)

BIN_DEBUG_DIR="$1"
BUILD_DIR="$2"
CERT_PATH="$3"
CERT_PASSWORD="$4"

#echo "Using $BIN_DEBUG_DIR as extension sources input directory"
#echo "Using $BUILD_DIR as output directory of signed sources"
#echo "\n"
echo "Cleaning contents of $BUILD_DIR"

#rm -R "$BUILD_DIR/"
mkdir "$BUILD_DIR"

java -jar './ucf.jar' -package -storetype PKCS12 -keystore "$CERT_PATH" -storepass "$CERT_PASSWORD" -tsa https://timestamp.geotrust.com/tsa "$BUILD_DIR/cc.zxp" -C "$BIN_DEBUG_DIR" .
mv "$BUILD_DIR/cc.zxp" "$BUILD_DIR/cc.zip"
unzip -d "$BUILD_DIR/cc_sign" "$BUILD_DIR/cc.zip"