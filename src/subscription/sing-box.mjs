import got from 'got'

export async function getSubscription(subscription) {
	return (await got(subscription).json()).outbounds
}
