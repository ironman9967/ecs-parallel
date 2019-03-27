
import cluster from 'cluster'

const createJob = ({ work }) => {
	if (cluster.isMaster) {
		return {
			start: data => new Promise((resolve, reject) => {
				const worker = cluster.fork()
				process.nextTick(() => {
					const sendAck = success => process.nextTick(() => {
						worker.send(JSON.stringify({
							type: 'ack',
							data: success
						}))
					})
					worker.once('message', json => {
						const { 
							type, 
							data, 
							error
						} = JSON.parse(json)
						switch (type) {
							case 'result':
								sendAck(true)
								return resolve({ ...data})
							case 'error':
								sendAck(false)
								return reject(error)
							default:
								throw new Error('unknown result from job')
						}
					})
					worker.send(JSON.stringify({
						type: 'work',
						data
					}))
				})
				return worker
			})
		}
	}
	process.on('message', json => {
		const { type, data } = JSON.parse(json)
		switch (type) {
			case 'work':
				return work(data).then(processed => 
					process.send(JSON.stringify({
						type: 'result',
						data: processed
					})))
			case 'ack':
				return JSON.parse(data)
					? process.exit(0)
					: process.exit(1)
			default:
				return
		}
	})
}

const job = createJob({
	work: data => {
		console.log(data)
		return Promise.resolve({ ...data })
	}
})

if (cluster.isMaster) {
	setTimeout(() => {
		job.start({ some: 'data' }).then(x => {
			console.log('master', x)
		})
	}, 3000)
}
