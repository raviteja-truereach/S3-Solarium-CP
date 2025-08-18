@echo off
IF NOT EXIST "android\keystores" mkdir android\keystores
keytool -genkeypair ^
  -v ^
  -storetype PKCS12 ^
  -keystore android/keystores/debug.keystore ^
  -alias androiddebugkey ^
  -keyalg RSA ^
  -keysize 2048 ^
  -validity 10000 ^
  -storepass android ^
  -keypass android ^
  -dname "CN=Android Debug,O=Android,C=US" 