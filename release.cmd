@echo off
set VER=1.0.9

sed -i -E "s/version>.+?</version>%VER%</" install.rdf
sed -i -E "s/version>.+?</version>%VER%</; s/download\/.+?\/add-bookmark-helper-.+?\.xpi/download\/%VER%\/add-bookmark-helper-%VER%\.xpi/" update.xml

set XPI=add-bookmark-helper-%VER%.xpi
if exist %XPI% del %XPI%
zip -r9q %XPI% * -x .git/* .gitignore update.xml LICENSE README.md *.cmd *.xpi *.exe
