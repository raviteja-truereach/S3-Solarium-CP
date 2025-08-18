# Android Keystores

This directory contains Android signing keystores for the Solarium CP App.

## Files

- `debug.keystore` - Debug signing keystore (committed for development)
- `release.keystore` - Release signing keystore (NOT committed, stored securely)

## Debug Keystore

The debug keystore is used for development builds and testing. It has the following properties:
- **Alias**: debug
- **Password**: android
- **Validity**: 10000 days

## Release Keystore

The release keystore is used for production builds and app store releases. It should:
- **NOT be committed to version control**
- Be stored securely (Azure Key Vault, encrypted storage)
- Have strong passwords
- Be backed up securely

## Environment Variables

Configure these environment variables in your build environment:

```bash
ANDROID_KEYSTORE_PATH=./android/keystores/release.keystore
ANDROID_KEYSTORE_PASSWORD=secure_password
ANDROID_KEY_ALIAS=release
ANDROID_KEY_PASSWORD=secure_password