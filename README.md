# Telebridge Z

This project is a fork of the official Telegram Z web client [web.telegram.org/z](https://web.telegram.org/z).
It adds a custom encryption layer for text and file encryption with manual control over the keys used.

Available at [telebridge.online](https://telebridge.online/).

# Usage

Type "!bridge get" in a chat to get the configured key, and "!bridge set <key>" to set a new key.

Text messages and files (including photos and videos sent without compression) are then encrypted with this key and can only be read by the receiving client if they have set the same key.


# Planned Features

- [x] Basic symmetric encryption
- [ ] GUI for setting and viewing chat keys.
- [ ] Key file export/import for easy backups.
- [ ] Semi-automated key exchange with asymmetric keys.
- [ ] Encryption of uncompressed photo/video files.
- [ ] Automatic regular reminder for setting new keys. 


## Local setup

```sh
mv .env.example .env

npm i
```

Obtain API ID and API hash on [my.telegram.org](https://my.telegram.org) and populate the `.env` file.

## Dev mode

```sh
npm run dev
```

### Invoking API from console

Start your dev server and locate GramJS worker in console context.

All constructors and functions available in global `GramJs` variable.

Run `npm run gramjs:tl full` to get access to all available Telegram requests.

Example usage:
``` javascript
await invoke(new GramJs.help.GetAppConfig())
```

## Bug reports and Suggestions
If you find an issue with this app, let Telegram know using the [Suggestions Platform](https://bugs.telegram.org/c/4002).
