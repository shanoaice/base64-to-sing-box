# Base64 Subscription to sing-box converter

English | [中文](./README.zh.md)

This is a simple converter that converts a VMess Base64 subscription to sing-box configuration file.

## Attention!

sing-box supports VMess, but to only a limited extent. Some obsolete and/or rarely-used features might not be supported, examples include:

- KCP transport
- alterId > 1 (equivalent to alterId = 1 where legacy protocol instead of VMess AEAD is used, but no extra alterId will be generated)
- QUIC symmetric encryption
- UDP camoflauge type (which can occur in some VPN provider configurations)

If the original Base64 subscription contains such configuration, it will be ignored and you might not be able to access those endpoints. Please take care.

## Usage

First, clone the repository. This project uses Yarn 3 Zero-Install, thus no dependency needs to be pulled, just make sure you have installed yarn.

```sh
git clone https://github.com/shanoaice/base64-to-sing-box.git
# If you HAVEN'T ENABLED COREPACK and didn't install yarn:
npm install -g yarn
# If you have already enabled corepack, everything is set.
```

Then, run the program and display the usage：

```sh
yarn start --help
```

Then, pass in parameters as needed, for example：

```sh
# This will generate a configuration file under the filename `sing-box.json`, without any inbound. This is not usable for proxy purposes, users have to modify the generated configuration and add inbounds themselves.
yarn start -o sing-box.json --subscription https://example.com/subscription
# This will generate a configuration file with SOCKS inbound port 20175, clash API port 9090, clash UI assets under the `yacd` folder, selector outbound tag "selector", and will enable system-stack TUN transparent proxy. This will also set the default outbound to the selector.
# Attention: this generated configuration does not include any routing rules. Usere have to configure it manually, or you can use the configuration file. See the configuration section below.
yarn start -o sing-box.json --socks-port 20175 --clash-port 9090 --clash-ui yacd --selector-tag selector --tun system --subscription https://example.com/subscription
# this will generate a sing-box configuration file according to the converter configuration. please see the Configuration section below
yarn start -o sing-box.json -c converter.json
```

## Configuration

This converter supports multiple formats of configurations files, including JSON5, JSON and JavaScript. When specifying configuraiton files from commandline, appropriate suffix must be provided to load the configuration file correctly. For JavaScript configuration file, please use `module.exports` to export the final configuration object:

```jsonc
{
  "subscriptions": [
    {
      "type": "base64",
      "tag": "base64Sub", // this is for customizing the selector outbound. see the explaination of entry outbounds.selector
      "url": "https://example.com/subscription" // subscription address
    },
    {
      "type": "singBoxOutbound", // this is for rare case where the VPN provider provides sing-box configurations directly. outbounds provided by this subscription will be merged into the outbound arrays in the generated config. everything else is ignored
      "tag": "singBoxSub",
      "url": "https://example.com/sing-box"
    }
  ],
  "inbounds": { // if the corresponding inbound port entry does not exist, that inbound will be disabled. Other values showcased here is the default value.
      "socksAddr": "::",
      "socksPort": 20175,
      "socksTag": "socks-in",
      "httpAddr": "::",
      "httpPort": 20170,
      "httpTag": "http-in",
      "mixedAddr": "::",
      "mixedPort": 20171,
      "mixedTag": "mixed-in",
      "mixedSystemProxy": false, // determines whether to set the system proxy to the mixed port automatically. only effective when mixed inbound is enabled.
      "tun": "system", // select TUN networking stack. TUN transparent proxy will only be enabled if this entry exists.
      "custom": [] // this will be merged into the inbound entry of the generated config
  },
  "clash": {
    "port": 9090, // Clash API will only be enabled when this entry exists
    "ui": "yacd" // same as the experimental.clash_api.external_ui entry of sing-box configuration
  },
  "outbounds": {
    "selectorTag": "selector", // selector outbounds will only be generated when this entry is present. By default the generated selector include all outbounds from all subscriptions and custom outbounds. Attention: selector outbound is only meaningful when clash api is enabled. Refer to sing-box documents for selectors for detail.
    "selectors": [ // or, multiple selectors can be customized.
      {
        "tag": "selector-1",
        "subscriptions": [
          "base64Sub"
        ] // include subscriptions by tags
      },
      {
        "tag": "selector-2",
        "subscriptions": [
          "singBoxSub"
        ]
      },
      {
        "tag": "selector-3",
        "includeCustom": true // this will cause all outbounds added in the "custom" outbound entry to appear in the selector
      },
      {
        "tag": "selector-4",
        "outbounds": [
          "selector-1",
          "selector-2"
        ] // filling in tags directly is also supported
      },
      {
        "tag": "selector-5",
        "subscriptions": [
          "base64Sub",
          "singBoxSub"
        ],
        "outbounds": [
          "selector-1",
          "selector-2"
        ] // can also be used together, the final result will be the combination of subscription outbounds and custom outbounds
      }
    ],
    "rememberSelection": true, // Whether remember the selector outbound before exiting. Defaults to true
    "directOut": true, // By default a direct outbound with tag "direct" will be included, can be disabled here. can also be a string indicating the direct outbound tag
    "blockOut": true, // By default a block outbound with tag "blackhole" will be included, can be disabled here. can also be a string indicating the block outbound tag
    "tcpFastOpen": false, // determines whether TCP Fast Open is enabled on each outbound entry. can also be a function with such signature (outboundTag: string) => boolean. Defaults to false
    "custom": []
  },
  "route": { // same as the "route" entry as sing-box's configuration. will be directly copied to the generated config
      "final": "selector", // if a single selector outbound is enabled, then the default is selector. Otherwise, it is the first entry of the outbounds array. If in rare circumstances when outbounds is empty, then it eill be "direct"
  },
  "dns": {} // same as sing-box's dns configuration entry. will be copied to the generated configuration file
}
```

## License

This project is licensed under the [Blue Oak Model License 1.0.0](https://blueoakcouncil.org/license/1.0.0).

