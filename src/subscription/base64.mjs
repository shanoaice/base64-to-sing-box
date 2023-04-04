import got from 'got'
import { callOrReturn } from '../utils.mjs'

function paseBase64Sub(base64) {
	return Buffer.from(base64, 'base64')
		.toString()
		.split('\n')
		.map((entry) =>
			JSON.parse(Buffer.from(entry.substring(8), 'base64').toString()),
		)
}

/**
 * @param {net} string The net type
 */
function mapNetToTransportType(net) {
	if (net === 'tcp' || net === 'h2') return 'http'
	return net
}

/**
 * KCP is not supported by sing-box, and it will be filtered from the result configuration array
 * only plain non-symmetrically-encrypted QUIC is supported, seed will be ignored if specified
 * alterId (aid) > 1 will be ignored, has the same effect as alterId = 1 (legacy VMess)
 */
export function convertBase64ToSingBox(config) {
	const contents = paseBase64Sub(config.subscription)
	return contents
		.map((content) =>
			content.net !== 'kcp' // filters out KCP since this is unsupported by sing-box
				? {
						tag: content.ps,
						type: 'vmess',
						server: content.add,
						server_port: content.port,
						tcp_fast_open: callOrReturn(config.outbounds.tcpFastOpen),
						uuid: content.id,
						security: content.scy || 'auto',
						alter_id: content.aid || 0,
						tls: {
							enabled: !!(content?.tls === 'tls'),
							server_name: content.sni || content.add,
							alpn: ['h2', 'http/1.1'],
						},
						transport: {
							type: mapNetToTransportType(content.net),
							host:
								mapNetToTransportType(content.net) === 'http' &&
								content?.host !== ''
									? content.host.split(',').trim()
									: undefined,
							headers:
								mapNetToTransportType(content.net) !== 'http' &&
								content?.host !== ''
									? {
											Host: content.host,
									  }
									: undefined,
							path:
								content.net !== 'quic' && // QUIC encryption is unsupported (base64 VMess link have QUIC key stored under the key 'path', persumably for reuse)
								content.net !== 'kcp' && // KCP is unsupported
								content.net !== 'grpc'
									? content.path
									: undefined,
							service_name:
								content.net === 'grpc' && content?.path !== ''
									? content.path
									: undefined,
						},
				  }
				: (() => {
						console.warn(
							`found KCP transport subscription entry ${content.ps}, this is unsupported by sing-box, skipping...`,
						)
						return null
				  })(),
		)
		.filter((val) => val !== null)
}

export async function getSubscription(address, extraConfig) {
	const base64 = await got(address).text()
	return convertBase64ToSingBox(base64, extraConfig)
}
