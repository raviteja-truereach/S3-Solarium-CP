@echo off
echo 🔍 Build Size Measurement Script (Windows)
echo ==========================================

if not exist reports mkdir reports

echo 📱 Measuring Android APK sizes...

cd android

echo Cleaning previous builds...
call gradlew clean

echo Building debug APK...
call gradlew assembleDebug

echo Building release APK...
call gradlew assembleRelease

cd ..

echo.
echo ✅ Build measurement complete!
echo Check android/app/build/outputs/apk/ for APK files

for /f %%i in ('dir android\app\build\outputs\apk\debug\*.apk /b 2^>nul') do (
    echo Debug APK: %%i
    for %%j in (android\app\build\outputs\apk\debug\%%i) do echo Size: %%~zj bytes
)

for /f %%i in ('dir android\app\build\outputs\apk\release\*.apk /b 2^>nul') do (
    echo Release APK: %%i  
    for %%j in (android\app\build\outputs\apk\release\%%i) do echo Size: %%~zj bytes
)

pause