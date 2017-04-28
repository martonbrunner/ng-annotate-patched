#!/bin/sh
cd ..
rm -rf build/npm
mkdir build/npm
git archive fork -o build/npm/ng-annotate-patched.tar --prefix=ng-annotate-patched/
cd build/npm
tar xf ng-annotate-patched.tar && rm ng-annotate-patched.tar
cd ng-annotate-patched/build
./build.sh
# delete build scripts
rm *.sh *.js defs-config.json ng-annotate
# delete .gitignore
rm ../.gitignore
# delete large test artifacts
rm ../tests/angular.js ../build/es5/tests/angular.js
cd ../..
tar czf ng-annotate-patched.tgz ng-annotate-patched && rm -rf ng-annotate-patched
