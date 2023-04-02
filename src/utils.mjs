export function callOrReturn(entry, ...args) {
	return typeof entry === 'function' ? entry(...args) : entry
}
