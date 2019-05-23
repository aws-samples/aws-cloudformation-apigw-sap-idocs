#!/bin/bash
dir=${PWD##*/}
rm -rf build
mkdir build
cp index.js ./build
cd build
zip -r $dir.zip .
mv $dir.zip ..
cd ..
rm -rf build