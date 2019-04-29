
export default async ({
	prep,
	app,
	newId,
	now,
	createSubject: createUnwrappedSubject
}) => async ({
	meta,
	createJob,
	finished
}) => {
	const systems = []
	const unsubs = []

	const createSubject = () => {
		const {
			subscribe,
			filter,
			next
		} = createUnwrappedSubject()
		const wrapSubscribe = (subscribe, cb) => {
			const { unsubscribe } = subscribe(cb)
			unsubs.push(unsubscribe)
			return { unsubscribe }
		}
		return {
			next,
			subscribe: cb => wrapSubscribe(subscribe, cb),
			filter: cb => {
				const { subscribe } = filter(cb)
				return {
					subscribe: cb => wrapSubscribe(subscribe, cb)
				}
			}
		}
	}

	await prep({
		createSystem: ({ systemId, filter, run }) => {
			const { next, ...observe } = createSubject()
			const {
				observeJob: { subscribe }
			} = createJob({ name: systemId, work: run })
			subscribe(({
				event,
				...info
			}) => next({
				event: event.replace('job', 'system'),
				...info
			}))
			const system = {
				systemId,
				created: now(),
				filter
			}
			systems.push(system)
			return {
				observe
			}
		},
		finished: () => finished(({
			jobs,
			jobsArray,
			dispose
		}) => {
			// jobsArray.forEach(({ observeJob: { filter, subscribe } }) =>
			// 	// filter(({ event }) => event == 'job-complete').subscribe(console.log)
			// 	subscribe(console.log)
			// )
			return app({
				createEntityCreator: ({ entityId = newId() } = {}) => ({
					entityId,
					create: ({ id = newId() } = {}) => {
						const components = []
						return {
							entityId,
							id,
							addComponent: ({ component }) => {
								if (component.componentId == 'jobData') {
									throw new Error(`'jobData' is a reserved componentId`)
								}
								if (components.find(({ componentId }) => componentId == component.componentId)) {
									throw new Error(`component ${component.id} has already been added to entity ${entityId}`)
								}
								components.push(component)
							},
							getComponent: ({ componentId }) => components.find(({ componentId: cid }) => componentId == cid)
						}
					}
				}),
				createComponentCreator: ({ componentId = newId() } = {}) => ({
					componentId,
					create: ({ data, id = newId() } = {}) => ({ componentId, id, data })
				}),
				systems: systems.reduce((systems, {
					systemId,
					filter
				}) => {
					systems[systemId] = {
						systemId,
						filter,
						run: async ({
							jobData,
							entities
						}) => Promise.all(entities.reduce((systemCalls, entity) => {
							const matchingComponents = filter.reduce((matchingComponents, {
								componentId
							}) => {
								const component = entity.getComponent({ componentId })
								if (component) {
									matchingComponents.push({ component })
								}
								return matchingComponents
							}, [])
							if (matchingComponents.length == filter.length) {
								const jobArg = matchingComponents.reduce((jobCall, {
									component: {
										componentId,
										data
									}
								}) => {
									jobCall[componentId] = data
									return jobCall
								}, {})
								if (jobData) {
									jobArg.jobData = jobData
								}
								systemCalls.push(jobs[systemId].startJob(jobArg).then(({ meta, result }) => {
									if (typeof result == 'object') {
										Object.keys(result).forEach(k => {
											const component = entity.getComponent({ componentId: k })
											if (component) {
												const { readonly } = filter.find(({ componentId }) => componentId == k)
												if (!readonly) {
													component.data = result[k]
												}
											}
										})
									}
									return {
										meta,
										entity
									}
								}))
							}
							return systemCalls
						}, []))
					}
					return systems
				}, {}),
				dispose: async () => {
					unsubs.forEach(unsub => unsub())
					return await dispose()
				}
			})
		})
	})
}
