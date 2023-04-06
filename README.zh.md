# Base64 / sing-box 订阅转换器

[English](./README.md) | 中文

一个简单的将 Base64 订阅转换为 sing-box 配置的小工具

## 注意！

sing-box 支持 VMess，但是部分陈旧、不常用或者被开发者认定为并不具有实际应用价值的配置选项并不受到支持，一些例子包括:

- KCP 传输
- alterId > 1 (效果等同于 alterId = 1 的 Legacy VMess 协议，不会生成额外的混淆 id，这一般不会影响通信，因为这是一个纯客户端行为，服务端的行为是自适配的)
- QUIC 对称加密
- UDP 伪装（可能出现在部分机场的配置中）

如果你的 Base64 订阅中含有此类配置，那么他们将会被忽略。这可能会阻止你连接到含有此类配置的节点，请注意。

## 使用

首先，克隆本仓库。由于本仓库使用了 Yarn 3 Zero-Install 配置，无需额外安装依赖，只需要确保你已经安装 yarn 即可。

```sh
git clone https://github.com/shanoaice/base64-to-sing-box.git
# 如果你没有安装 Yarn *且没有配置过 corepack*，请运行以下命令:
npm install -g yarn
# 如果你在先前开启过 corepack，则不需要任何操作。
```

接下来，运行主程序，这将会显示命令行参数：

```sh
yarn start --help
```

按照提示添加对应参数即可，例如：

```sh
# 这将会生成不包含任何入站的配置文件`sing-box.json`，需要用户自行修改生成的配置文件，添加入站以实现代理联网
yarn start -o sing-box.json --subscription https://example.com/subscription
# 这将会生成一个配置文件, 其 SOCKS 入站端口为 20175, clash API 端口为 9090, Clash UI 文件位于 yacd 文件夹下, selector 出站 tag 为 selector, 同时启用 system stack 的 TUN 透明代理. 这将同时将默认出站设置为 selector. 注意: 这份生成的配置中不包含任何路由规则, 用户本人将需要自行配置.
yarn start -o sing-box.json --socks-port 20175 --clash-port 9090 --clash-ui yacd --selector-tag selector --tun system --subscription https://example.com/subscription
# 这将会根据转换器配置文件生成一个 sing-box 配置文件. 有关转换器配置文件, 请参见接下来的"配置文件"章节
yarn start -o sing-box.json -c converter.json
```

## 配置文件

转换器支持多种配置文件格式，例如 `json5`, `json` 和 `javascript`. 当通过命令行指定配置文件时，必须提供恰当的后缀名，以确保配置文件会通过正确的格式加载。对于 JavaScript 配置文件，请使用 module.exports 导出最终配置对象：

```jsonc
{
  "subscriptions": [
    {
      "type": "base64",
      "tag": "base64Sub", // 用于自定义 selector 出站，详见 outbounds.selecotr 配置项
      "url": "https://example.com/subscription" // 订阅地址
    },
    {
      "type": "singBoxOubtound", // 用于少部分直接提供 sing-box json 配置的情形, 其中的outbound数组将会直接被合并进生成文件的 outbounds 数组中，其余配置项将会被忽略
      "tag": "singBoxOutbound",
      "url": "https://example.com/sing-box"
    }
  ]，
  "inbounds": { // 对应入站项端口如果不存在则默认关闭，示例中的其余所有值都是默认值
      "socksAddr": "::",
      "socksPort": 20175,
      "socksTag": "socks-in",
      "httpAddr": "::",
      "httpPort": 20170,
      "httpTag": "http-in",
      "mixedAddr": "::",
      "mixedPort": 20171,
      "mixedTag": "mixed-in",
      "mixedSystemProxy": false, // 是否自动将系统代理设置为 mixed 的端口，仅当 mixed 入站启用时有效
      "tun": "system", // 选择 TUN 模式。仅当本项存在时才会启用 TUN 透明代理
      "custom": [] // 该数组将会被 merge 到生成的配置文件中的 inbounds 数组内
  },
  "clash": {
    "port": 9090, // 仅当此项存在时，Clash API 才会被启用
    "ui": "yacd" // 同 sing-box 的 experimental.clash_api.external_ui 配置项
  },
  "outbounds": {
    "selectorTag": "selector", // 仅当此项开启时才会生成 selector 出站, 包含所有来自 subscription 的出站和通过 custom 项加入的自定义出站. 请注意, selector 出站仅在启用 clash api 时才有意义，具体请参考 sing-box 文档
    "selectors": [
      {
        "tag": "selector-1",
        "subscriptions": [
          "base64Sub"
        ] // 选择 subscription tags
      },
      {
        "tag": "selector-2",
        "subscriptions": [
          "singBoxSub"
        ]
      },
      {
        "tag": "selector-1",
        "outbounds": [
          "selector-1",
          "selector-2"
            ] // 或者也可以直接填入 tag
      },
      {
        "tag": "selector-1",
        "subscriptions": [
          "base64Sub",
          "singBoxSub"
        ],
        "outbounds": [
          "selector-1",
          "selector-2"
        ] // 也可以一起用，最终结果将会合并自定义包含的出站和订阅包含的出站
      }
    ], // 或者，也可以配置多个 selector
    "rememberSelection": true, // 退出时是否记住 selector 选择的出站，默认为 true
    "directOut": true, // 默认会自动包含一个直连出站, tag 为 direct, 可在此手动关闭. 也可是一个字符串，表示直连出站的 tag
    "blockOut": true, // 默认会自动包含一个 block 出站, tag 为 blackhole, 可在此手动关闭. 也可是一个字符串，表示 blcok 出站的 tag
    "tcpFastOpen": false, // 决定是否为每个出站开启 TCP Fast Open, 也可以是一个函数，参数为对应出站的 Tag，返回一个布尔值，默认为 false
    "custom": []
  },
  "route": { // 与 sing-box 的 route 配置项相同, 将会被直接复制到生成的配置中
      "final": "selector", // 如果开启 selector outbound，则默认为 selector. 否则，默认为 outbound 数组的第一项. 如果 outbound 数组为空，则为 direct.
  },
  "dns": {} // 与 sing-box 的 dns 配置项相同, 将会被直接复制到生成的配置中
}
```

## 许可

本项目以 [Blue Oak Model License 1.0.0](https://blueoakcouncil.org/license/1.0.0) 发布。
