
export default async ({
	prep,
	app,
	newId,
	now,
	createSubject: createUnwrappedSubject,
	isEqual,
	getSystemRuns
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
			const observeSystem = createSubject()
			const { observeJob } = createJob({ name: systemId, work: run })
			const system = {
				systemId,
				created: now(),
				filter,
				observeSystem,
				observeJob
			}
			systems.push(system)
		},
		finished: () => finished(({
			jobs,
			// jobsArray,
			dispose
		}) => app({
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
				observeSystem: {
					next: pubSystemUnwrapped,
					...observe
				},
				observeJob: {
					subscribe: subJob
				},
				systemId,
				filter
			}) => {
				const pubSystem = evt => pubSystemUnwrapped({ created: now(), ...evt })
				subJob(({ event, ...job }) => pubSystem({ event: `system-${event}`, ...job }))
				systems[systemId] = {
					systemId,
					filter,
					observe,
					run: async ({
						jobData,
						entities
					}) => {
						pubSystem({
							event: 'system-running',
							systemId,
							filter,
							jobData,
							entities
						})
						return Promise.all(getSystemRuns({
							isEqual,
							systemId,
							jobData,
							entities,
							filter,
							jobs,
							meta,
							pubSystem
						}))
					}
				}
				return systems
			}, {}),
			dispose: async () => {
				unsubs.forEach(unsub => unsub())
				return await dispose()
			}
		}))
	})
}
