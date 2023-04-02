import got from 'got'
import { callOrReturn } from './utils.mjs'

/** this function is copied from MDN's btoa() method page, used to convert a binary string to a JavaScript UTF-16 string
 * @param {string} binary - The source binary string
 * @returns The converted UTF-16 string */
function fromBinary(binary) {
	const bytes = Uint8Array.from({ length: binary.length }, (element, index) =>
		binary.charCodeAt(index),
	)
	const charCodes = new Uint16Array(bytes.buffer)

	let result = ''
	charCodes.forEach((char) => {
		result += String.fromCharCode(char)
	})
	return result
}

function paseBase64Sub(base64) {
	return fromBinary(atob(base64))
		.split('\n')
		.map((base64) => JSON.parse(fromBinary(atob(base64.substring(8)))))
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
export function convertBase64ToSingBox(base64Sub, extraConfig) {
	const contents = paseBase64Sub(base64Sub)
	return contents
		.map((content) =>
			content.net !== 'kcp' // filters out KCP since this is unsupported by sing-box
				? {
						tag: content.ps,
						type: 'vmess',
						server: content.add,
						server_port: content.port,
						tcp_fast_open: callOrReturn(extraConfig.tcpFastOpen),
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
